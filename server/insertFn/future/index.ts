import { supabase } from "../supabaseClient.ts";

import { QueueMessage, PrevRow, FutureRow } from "./type.ts";
import { QUEUE_NAME,MULTIPLIER, EXCHANGE_PREFIX } from "./constant.ts";

async function resolvePrevRow(ul: string): Promise<PrevRow | null> {

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
    pending?.message?.oi !== 0
  ) {
    return {
      prev_oi:  pending.message.oi,
      prev_ltp: pending.message.ltp,
      prev_vol: pending.message.vol,
      prev_ts:  pending.message.ts,
    };
  }

  // --- 2. fallback: future_table ---
  const { data, error } = await supabase
    .from("future_table")
    .select("ts, ltp, oi, vol")
    .eq("ul", ul)
    .neq("oi", 0)
    .order("ts", { ascending: false })
    .limit(1)
    .single();

  if (!error && data) {
    return {
      prev_oi:  data.oi,
      prev_ltp: data.ltp,
      prev_vol: data.vol,
      prev_ts:  data.ts,
    };
  }

  return null;
}


async function processFutureRow(row: FutureRow) {
  const { ts, key, exp, vol, ltp, oi, tto, ul, ulv } = row;

  // 1. resolve prev row before anything else
  const prev = await resolvePrevRow(ul);

  // 2. resolve oi — use prev if incoming is 0
  const resolvedOi = oi !== 0 ? oi : (prev?.prev_oi ?? 0);
  const multiplier = ul[0] == EXCHANGE_PREFIX ? MULTIPLIER.EXCHANGE_1 : MULTIPLIER.EXCHANGE_2;

  // 3. enqueue FIRST — must be present before webhook fires on table insert
  const { data: msgId, error: queueError } = await supabase.rpc("pgmq_send", {
    queue_name: QUEUE_NAME,
    message: {
      ul,
      ts,
      multiplier,
      // current
      oi:resolvedOi,
      ltp,
      vol,
      ulv,
      // prev (Edge Fn B uses these directly — no table reads needed)
      prev_oi:  prev?.prev_oi  ?? 0,
      prev_ltp: prev?.prev_ltp ?? 0,
      prev_vol: prev?.prev_vol ?? 0,
      prev_ts:  prev?.prev_ts  ?? null,
    },
  });

  if (queueError) {
    throw new Error(`Queue send failed (${key}): ${queueError.message}`);
  }

  // 4. upsert into future_table — webhook fires here, queue already ready
  const { error: insertError } = await supabase
    .from("future_table")
    .upsert(
      { ts, key, exp, vol, ltp, oi: resolvedOi, tto, ul, ulv },
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

  return { table: "future_table", key, resolvedOi };
}


export async function handleFuture(payload: FutureRow) {
  return processFutureRow(payload);
}