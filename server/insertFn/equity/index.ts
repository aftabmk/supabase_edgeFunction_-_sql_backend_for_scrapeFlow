import { supabase } from "../supabaseClient.ts";

import { QUEUE_NAME } from "./constant.ts";
import { EquityRow, QueueMessage, PrevRow } from "./type.ts";
/**
 * Get prev row in priority order:
 *  1. single pending queue message for this ul
 *  2. fallback: last row in equity_table
 */
async function resolvePrevRow(ul: string, currentTs: string): Promise<PrevRow | null> {

  // --- 1. pending queue message ---
  const { data: queueRows, error: queueError } = await supabase.rpc("pgmq_read", {
    queue_name: QUEUE_NAME,
    vt: 0,
    qty: 1,
  });

  const pending = queueRows?.[0] as QueueMessage | undefined;

  if (
    !queueError &&
    pending?.message?.ul === ul &&
    pending?.message?.ltp !== 0
  ) {
    return {
      prev_ltp: pending.message.ltp,
      prev_vol: pending.message.vol,
      prev_ts:  pending.message.ts,
    };
  }

  // --- 2. fallback: equity_table ---
  const { data, error } = await supabase
    .from("equity_table")
    .select("ts, ltp, vol")
    .eq("ul", ul)
    .lt("ts", currentTs)
    .order("ts", { ascending: false })
    .limit(1)
    .single();

  if (!error && data) {
    return {
      prev_ltp: data.ltp,
      prev_vol: data.vol,
      prev_ts:  data.ts,
    };
  }

  return null;
}

async function processEquityRow(row: EquityRow) {
  const { key, ltp, pc, ts, ul, vol } = row;

  // 1. resolve prev row before anything else
  const prev = await resolvePrevRow(ul, ts);

  const is_first_of_day = prev
    ? new Date(ts).toDateString() !== new Date(prev.prev_ts).toDateString()
    : true;

  // 2. enqueue FIRST — must be present before webhook fires
  const { data: msgId, error: queueError } = await supabase.rpc("pgmq_send", {
    queue_name: QUEUE_NAME,
    message: {
      ul,
      ts,
      ltp,
      pc,
      vol,
      prev_ltp:        prev?.prev_ltp        ?? null,
      prev_vol:        prev?.prev_vol        ?? null,
      prev_ts:         prev?.prev_ts         ?? null,
      is_first_of_day,
    },
  });

  if (queueError) {
    throw new Error(`Queue send failed (${key}): ${queueError.message}`);
  }

  // 3. upsert into equity_table — webhook fires here, queue already ready
  const { error: insertError } = await supabase
    .from("equity_table")
    .upsert(
      { key, ltp, pc, ts, ul, vol },
      { onConflict: ["ts", "key"] }
    );

  if (insertError) {
    // compensate: delete orphaned queue message
    await supabase.rpc("pgmq_delete", {
      queue_name: QUEUE_NAME,
      msg_id: msgId,
    });
    throw new Error(`Insert failed (${key}): ${insertError.message}`);
  }

  return { table: "equity_table", key };
}

export async function handleEquity(payload: EquityRow) {
  return processEquityRow(payload);
}