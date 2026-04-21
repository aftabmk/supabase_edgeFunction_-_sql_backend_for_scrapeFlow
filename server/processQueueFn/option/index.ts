import { supabase } from "../supabaseClient.ts";

import { QueueMessage, SentimentResult } from "./type.ts";
import { QUEUE_NAME, VISIBILITY_TIMEOUT, BATCH_SIZE } from "./constant.ts";

function resolveIv(
  current:  number,
  prevTick: number,
  prevDay:  number
): number {
  return current !== 0 ? current : prevTick !== 0 ? prevTick : prevDay;
}

function computeOptionSentiment(msg: QueueMessage["message"]): SentimentResult {
  const {
    ulv,
    ce_oi, ce_vol, ce_iv, ce_ltp,
    pe_oi, pe_vol, pe_iv, pe_ltp,
    prev_ce_oi, prev_ce_vol, prev_ce_iv, prev_ce_ltp,
    prev_pe_oi, prev_pe_vol, prev_pe_iv, prev_pe_ltp,
    prev_day_ce_iv, prev_day_pe_iv,
    multiplier,
  } = msg;

  const ce_ltpc = ce_ltp - prev_ce_ltp;
  const ce_coi  = ce_oi  - prev_ce_oi;
  const ce_volc = ce_vol - prev_ce_vol;

  const pe_ltpc = pe_ltp - prev_pe_ltp;
  const pe_coi  = pe_oi  - prev_pe_oi;
  const pe_volc = pe_vol - prev_pe_vol;

  const adj_ce_iv = resolveIv(ce_iv, prev_ce_iv, prev_day_ce_iv);
  const adj_pe_iv = resolveIv(pe_iv, prev_pe_iv, prev_day_pe_iv);

  const ce_coivol = ce_volc !== 0
    ? Math.round(Math.abs(multiplier * ce_coi / ce_volc) * 100) / 100
    : null;

  const pe_coivol = pe_volc !== 0
    ? Math.round(Math.abs(multiplier * pe_coi / pe_volc) * 100) / 100
    : null;

  const ce_val =
    (ce_coi > 0 && ce_ltpc > 0) ?  Math.round(multiplier * Math.abs(ce_ltpc * ce_coi) / 1e5 * 100) / 100 :
    (ce_coi > 0 && ce_ltpc < 0) ? -Math.round(multiplier * Math.abs(ce_ltpc * ce_coi) / 1e5 * 100) / 100 :
    (ce_coi < 0 && ce_ltpc < 0) ? -Math.round(multiplier * Math.abs(ce_ltpc * ce_coi) / 1e5 * 100) / 100 :
    (ce_coi < 0 && ce_ltpc > 0) ?  Math.round(multiplier * Math.abs(ce_ltpc * ce_coi) / 1e5 * 100) / 100 :
    null;

  const pe_val =
    (pe_coi > 0 && pe_ltpc > 0) ? -Math.round(multiplier * Math.abs(pe_ltpc * pe_coi) / 1e5 * 100) / 100 :
    (pe_coi > 0 && pe_ltpc < 0) ?  Math.round(multiplier * Math.abs(pe_ltpc * pe_coi) / 1e5 * 100) / 100 :
    (pe_coi < 0 && pe_ltpc < 0) ?  Math.round(multiplier * Math.abs(pe_ltpc * pe_coi) / 1e5 * 100) / 100 :
    (pe_coi < 0 && pe_ltpc > 0) ? -Math.round(multiplier * Math.abs(pe_ltpc * pe_coi) / 1e5 * 100) / 100 :
    null;

  const ce_bias =
    (ce_coi > 0 && ce_ltpc > 0) ? "Long Buildup"   :
    (ce_coi > 0 && ce_ltpc < 0) ? "Short Buildup"  :
    (ce_coi < 0 && ce_ltpc < 0) ? "Long Unwinding" :
    (ce_coi < 0 && ce_ltpc > 0) ? "Short Covering" :
    null;

  const pe_bias =
    (pe_coi > 0 && pe_ltpc > 0) ? "Long Buildup"   :
    (pe_coi > 0 && pe_ltpc < 0) ? "Short Buildup"  :
    (pe_coi < 0 && pe_ltpc < 0) ? "Long Unwinding" :
    (pe_coi < 0 && pe_ltpc > 0) ? "Short Covering" :
    null;

  return {
    ce_bias, ce_coivol, ce_val, ce_ltpc, ce_iv : adj_ce_iv,
    ce_oi: ce_coi, ulv,
    pe_oi: pe_coi, pe_ltpc, pe_val, pe_coivol, pe_bias, pe_iv : adj_pe_iv
  };
}

export async function processOptionQueue() {
  const { data: messages, error } = await supabase.rpc("pgmq_read", {
    queue_name: QUEUE_NAME,
    vt:         VISIBILITY_TIMEOUT,
    qty:        BATCH_SIZE,
  }) as { data: QueueMessage[]; error: unknown };

  if (error) {
    console.error("Option queue read error:", error);
    return { processed: 0, failed: 0 };
  }

  if (!messages?.length) return { processed: 0, failed: 0 };

  const results = await Promise.allSettled(
    messages.map(async (msg) => {
      const { ul, ts, str, exp, prev_ts, ulv } = msg.message;

      // skip first ever row — no prev to compute delta against
      if (!prev_ts) {
        await supabase.rpc("pgmq_delete", {
          queue_name: QUEUE_NAME,
          msg_id:     msg.msg_id,
        });
        return { ul, ts, str, skipped: true };
      }

      // compute entirely from queue message — zero table reads
      const sentiment = computeOptionSentiment(msg.message);

      // 1. upsert option_sentiment_table (ts, ul, exp, str, ulv, prev_ts)
      const { error: mainError } = await supabase
        .from("option_sentiment_table")
        .upsert(
          { ts, ul, str, exp, ulv, prev_ts },
          { onConflict: ["ul", "ts", "str", "exp"] }
        );

      if (mainError) {
        throw new Error(`Main upsert failed for ${ul}@${ts} str=${str}: ${mainError.message}`);
      }

      // 2. upsert option_sentiment_payload (ce + pe columns)
      //    FK references option_sentiment_table so must insert after
      const { error: payloadError } = await supabase
        .from("option_sentiment_payload")
        .upsert(
          {
            ts, ul, str, exp,
            ce_bias:   sentiment.ce_bias,
            ce_coivol: sentiment.ce_coivol,
            ce_val:    sentiment.ce_val,
            ce_ltpc:   sentiment.ce_ltpc,
            ce_oi:     sentiment.ce_oi,
            ce_iv:     sentiment.ce_iv,
            pe_bias:   sentiment.pe_bias,
            pe_coivol: sentiment.pe_coivol,
            pe_val:    sentiment.pe_val,
            pe_ltpc:   sentiment.pe_ltpc,
            pe_oi:     sentiment.pe_oi,
            pe_iv:     sentiment.pe_iv
          },
          { onConflict: ["ul", "ts", "str", "exp"] }
        );

      if (payloadError) {
        throw new Error(`Payload upsert failed for ${ul}@${ts} str=${str}: ${payloadError.message}`);
      }

      // ACK — delete from queue
      const { error: ackError } = await supabase.rpc("pgmq_delete", {
        queue_name: QUEUE_NAME,
        msg_id:     msg.msg_id,
      });

      if (ackError) {
        throw new Error(`ACK failed for msg_id ${msg.msg_id}: ${ackError.message}`);
      }

      return { ul, ts, str };
    })
  );

  const failed = results.filter((r) => r.status === "rejected");
  if (failed.length) {
    console.error(
      "Option queue failures:",
      failed.map((f) => (f as PromiseRejectedResult).reason)
    );
  }

  return { processed: messages.length, failed: failed.length };
}