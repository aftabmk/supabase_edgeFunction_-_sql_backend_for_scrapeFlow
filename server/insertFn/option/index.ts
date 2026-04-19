import { supabase } from "../supabaseClient.ts";

import { CePe, OptionRow,QueueMessage,PrevRow } from "./type.ts";
import { MULTIPLIER, QUEUE_NAME } from "./constant.ts";

/**
 * Resolve prev row for a specific strike in priority order:
 *  1. pending queue message for this ul + str + exp
 *  2. fallback: last non-zero oi row in option_payload_table
 */
async function resolvePrevRow(
  ul:  string,
  str: number,
  exp: string,
  currentTs: string
): Promise<PrevRow | null> {

  // --- 1. pending queue message for this exact strike ---
  const { data: queueRows, error: queueError } = await supabase.rpc("pgmq_read", {
    queue_name: QUEUE_NAME,
    vt: 0,
    qty: 1,
  });

  const pending = queueRows?.[0] as QueueMessage | undefined;

  if (
    !queueError          &&
    pending?.message?.ul  === ul  &&
    pending?.message?.str === str &&
    pending?.message?.exp === exp &&
    pending?.message?.ce_oi !== 0
  ) {
    return {
      prev_ulv:    pending.message.ulv,
      prev_ce_oi:  pending.message.ce_oi,
      prev_ce_vol: pending.message.ce_vol,
      prev_ce_iv:  pending.message.ce_iv,
      prev_ce_ltp: pending.message.ce_ltp,
      prev_pe_oi:  pending.message.pe_oi,
      prev_pe_vol: pending.message.pe_vol,
      prev_pe_iv:  pending.message.pe_iv,
      prev_pe_ltp: pending.message.pe_ltp,
      prev_ts:     pending.message.ts,
    };
  }

  // --- 2. fallback: tables ---
  const { data, error } = await supabase
    .from("option_table")
    .select(`
      ts,
      ulv,
      option_payload_table (
        ce_oi, ce_vol, ce_iv, ce_ltp,
        pe_oi, pe_vol, pe_iv, pe_ltp
      )
    `)
    .eq("ul",  ul)
    .eq("str", str)
    .eq("exp", exp)
    .lt("ts",  currentTs)
    .neq("option_payload_table.ce_oi", 0)
    .order("ts", { ascending: false })
    .limit(1)
    .single();

  if (!error && data && data.option_payload_table) {
    const p = data.option_payload_table as unknown as CePe & {
      pe_oi: number; pe_vol: number; pe_iv: number; pe_ltp: number;
    };
    return {
      prev_ulv:    data.ulv,
      prev_ce_oi:  p.ce_oi,
      prev_ce_vol: p.ce_vol,
      prev_ce_iv:  p.ce_iv,
      prev_ce_ltp: p.ce_ltp,
      prev_pe_oi:  p.pe_oi,
      prev_pe_vol: p.pe_vol,
      prev_pe_iv:  p.pe_iv,
      prev_pe_ltp: p.pe_ltp,
      prev_ts:     data.ts,
    };
  }

  return null;
}

/**
 * Fetch prev day IV for a strike (one-time fallback for IV coalesce chain)
 * Only needed if prev tick IV is also zero
 */
async function resolvePrevDayIv(
  ul:          string,
  str:         number,
  exp:         string,
  currentDate: string
): Promise<{ prev_day_ce_iv: number; prev_day_pe_iv: number }> {

  const { data, error } = await supabase
    .from("option_table")
    .select(`
      option_payload_table (
        ce_iv,
        pe_iv
      )
    `)
    .eq("ul",  ul)
    .eq("str", str)
    .eq("exp", exp)
    .lt("ts",  currentDate)
    .order("ts", { ascending: false })
    .limit(1)
    .single();

  if (!error && data && data.option_payload_table) {
    const p = data.option_payload_table as unknown as { ce_iv: number; pe_iv: number };
    return {
      prev_day_ce_iv: p.ce_iv ?? 0,
      prev_day_pe_iv: p.pe_iv ?? 0,
    };
  }

  return { prev_day_ce_iv: 0, prev_day_pe_iv: 0 };
}

async function processOptionRow(
  row:          OptionRow,
  msgIds:       number[],
  currentDate:  string
) {
  const { ts, key, str, exp, ul, ulv, ce, pe } = row;

  // 1. resolve prev row for this strike
  const prev = await resolvePrevRow(ul, str, exp, ts);

  // 2. resolve OI — carry forward if zero
  const ce_oi = ce.oi !== 0 ? ce.oi : (prev?.prev_ce_oi ?? 0);
  const pe_oi = pe.oi !== 0 ? pe.oi : (prev?.prev_pe_oi ?? 0);

  // 3. resolve prev day IV fallback (only if prev tick IV is also zero)
  const needsPrevDayIv =
    (ce.iv === 0 && (prev?.prev_ce_iv ?? 0) === 0) ||
    (pe.iv === 0 && (prev?.prev_pe_iv ?? 0) === 0);

  const prevDayIv = needsPrevDayIv
    ? await resolvePrevDayIv(ul, str, exp, currentDate)
    : { prev_day_ce_iv: 0, prev_day_pe_iv: 0 };

  // 4. enqueue FIRST
  const { data: msgId, error: queueError } = await supabase.rpc("pgmq_send", {
    queue_name: QUEUE_NAME,
    message: {
      ul, ts, str, exp, key,
      multiplier: MULTIPLIER,
      ulv,
      // current
      ce_oi,
      ce_vol: ce.vol,
      ce_iv:  ce.iv,
      ce_ltp: ce.ltp,
      pe_oi,
      pe_vol: pe.vol,
      pe_iv:  pe.iv,
      pe_ltp: pe.ltp,
      // prev
      prev_ulv:    prev?.prev_ulv    ?? 0,
      prev_ce_oi:  prev?.prev_ce_oi  ?? 0,
      prev_ce_vol: prev?.prev_ce_vol ?? 0,
      prev_ce_iv:  prev?.prev_ce_iv  ?? 0,
      prev_ce_ltp: prev?.prev_ce_ltp ?? 0,
      prev_pe_oi:  prev?.prev_pe_oi  ?? 0,
      prev_pe_vol: prev?.prev_pe_vol ?? 0,
      prev_pe_iv:  prev?.prev_pe_iv  ?? 0,
      prev_pe_ltp: prev?.prev_pe_ltp ?? 0,
      prev_ts:     prev?.prev_ts     ?? null,
      // prev day iv fallback
      prev_day_ce_iv: prevDayIv.prev_day_ce_iv,
      prev_day_pe_iv: prevDayIv.prev_day_pe_iv,
    },
  });

  if (queueError) {
    throw new Error(`Queue send failed (${key}): ${queueError.message}`);
  }

  msgIds.push(msgId);

  return {
    mainRow:    { ts, key, str, exp, ul, ulv },
    payloadRow: {
      ul, ts, key,
      ce_oi,  ce_vol: ce.vol, ce_iv: ce.iv,  ce_ltp: ce.ltp,
      pe_oi,  pe_vol: pe.vol, pe_iv: pe.iv,  pe_ltp: pe.ltp,
    },
  };
}

export async function handleOption(payload: OptionRow[]) {
  if (!Array.isArray(payload) || payload.length === 0) {
    throw new Error("Option payload must be a non-empty array");
  }

  // all rows share same ul + ts
  const { ul, ts } = payload[0];
  const currentDate = ts.split("T")[0];

  const msgIds: number[] = [];

  // 1. process each strike — resolve prev, enqueue
  const rows = await Promise.all(
    payload.map((row) => processOptionRow(row, msgIds, currentDate))
  );

  // 2. bulk upsert option_table
  const { error: mainError } = await supabase
    .from("option_table")
    .upsert(
      rows.map((r) => r.mainRow),
      { onConflict: ["ts", "key", "ul"] }
    );

  if (mainError) {
    // compensate: delete all enqueued messages
    await Promise.all(
      msgIds.map((msg_id) =>
        supabase.rpc("pgmq_delete", { queue_name: QUEUE_NAME, msg_id })
      )
    );
    throw new Error(`Bulk insert failed in option_table: ${mainError.message}`);
  }

  // 3. bulk upsert option_payload_table
  const { error: payloadError } = await supabase
    .from("option_payload_table")
    .upsert(
      rows.map((r) => r.payloadRow),
      { onConflict: ["ts", "key", "ul"] }
    );

  if (payloadError) {
    // compensate: delete all enqueued messages
    await Promise.all(
      msgIds.map((msg_id) =>
        supabase.rpc("pgmq_delete", { queue_name: QUEUE_NAME, msg_id })
      )
    );
    throw new Error(`Bulk insert failed in option_payload_table: ${payloadError.message}`);
  }

  return rows.map((r) => ({ table: "option_table", key: r.mainRow.key }));
}