import { supabase } from "../supabaseClient.ts";

import { QueueMessage, SentimentResult } from "./type.ts";
import { QUEUE_NAME, BATCH_SIZE, VISIBILITY_TIMEOUT, FUTURE_SENTIMENT_TABLE } from "./constant.ts";

function computeSentiment(msg: QueueMessage["message"]): SentimentResult {
  const {
    oi, ltp, vol, ulv,
    prev_oi, prev_ltp, prev_vol, prev_ts,
    ts, multiplier
  } = msg;

  const is_first_of_day =
    new Date(ts).toDateString() !== new Date(prev_ts!).toDateString();

  const coi  = oi  - prev_oi;
  const ltpc = ltp - prev_ltp;
  const volc = is_first_of_day ? vol : vol - prev_vol;

  const coivol = is_first_of_day
    ? volc !== 0 ? Math.round((oi  / volc) * 100) / 100 : null
    : volc !== 0 ? Math.round((coi / volc) * 100) / 100 : null;

  const raw_val = Math.round((multiplier * ltpc * coi) / 1e5 * 100) / 100;

  const val =
    (coi > 0 && ltpc > 0) ?  Math.abs(raw_val) :
    (coi > 0 && ltpc < 0) ? -Math.abs(raw_val) :
    (coi < 0 && ltpc > 0) ?  Math.abs(raw_val) :
    (coi < 0 && ltpc < 0) ? -Math.abs(raw_val) :
    null;

  const bias =
    (coi > 0 && ltpc > 0) ? "Long Buildup"   :
    (coi > 0 && ltpc < 0) ? "Short Buildup"  :
    (coi < 0 && ltpc > 0) ? "Short Covering" :
    (coi < 0 && ltpc < 0) ? "Long Unwinding" :
    null;

  return {
    coi,
    ltpc,
    vol:    volc,
    coivol: coivol !== null ? Math.abs(coivol) : null,
    val,
    bias,
    ulv,
  };
}

export async function processFutureQueue() {
  // 1. read batch from queue
  const { data: messages, error } = await supabase.rpc("pgmq_read", {
    queue_name: QUEUE_NAME,
    vt: VISIBILITY_TIMEOUT,
    qty: BATCH_SIZE,
  }) as { data: QueueMessage[]; error: unknown };

  if (error) {
    console.error("Queue read error:", error);
    return { processed: 0, failed: 0 };
  }

  if (!messages?.length) return { processed: 0, failed: 0 };

  const results = await Promise.allSettled(
    messages.map(async (msg) => {
      const { ul, ts, prev_ts } = msg.message;

      // skip first ever row — no prev to compute delta against
      if (!prev_ts) {
        await supabase.rpc("pgmq_delete", {
          queue_name: QUEUE_NAME,
          msg_id: msg.msg_id,
        });
        return { ul, ts, skipped: true };
      }

      // 2. compute entirely from queue message — zero table reads
      const sentiment = computeSentiment(msg.message);

      // 3. upsert result into sentiment table
      const { error: upsertError } = await supabase
        .from(FUTURE_SENTIMENT_TABLE)
        .upsert(
          {
            ts,
            ul,
            ulv:    sentiment.ulv,
            coi:    sentiment.coi,
            ltpc:   sentiment.ltpc,
            vol:    sentiment.vol,
            coivol: sentiment.coivol,
            val:    sentiment.val,
            bias:   sentiment.bias,
            prev_ts,
          },
          { onConflict: ["ts", "ul"] }
        );

      if (upsertError) {
        throw new Error(`Upsert failed for ${ul}@${ts}: ${upsertError.message}`);
      }

      // 4. ACK — delete from queue
      const { error: ackError } = await supabase.rpc("pgmq_delete", {
        queue_name: QUEUE_NAME,
        msg_id: msg.msg_id,
      });

      if (ackError) {
        throw new Error(`ACK failed for msg_id ${msg.msg_id}: ${ackError.message}`);
      }

      return { ul, ts };
    })
  );

  const failed = results.filter((r) => r.status === "rejected");
  if (failed.length) {
    console.error(
      "Failed messages:",
      failed.map((f) => (f as PromiseRejectedResult).reason)
    );
  }

  return { processed: messages.length, failed: failed.length };
}