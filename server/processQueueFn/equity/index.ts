import { supabase } from "../supabaseClient.ts";

import { QueueMessage, SentimentResult } from "./type.ts";
import { QUEUE_NAME, VISIBILITY_TIMEOUT, BATCH_SIZE , EQUITY_SENTIMENT_TABLE} from "./constant.ts";


function computeEquitySentiment(msg: QueueMessage["message"]): SentimentResult {
  const { ltp, vol, prev_ltp, prev_vol, is_first_of_day } = msg;

  const ltpc = ltp - (prev_ltp ?? 0);

  const volc = is_first_of_day
    ? vol
    : vol - (prev_vol ?? 0);

  const value = Math.round((ltpc * volc) / 1e7 * 100) / 100;
  const volRounded = Math.round(volc / 1e7 * 100) / 100;

  return {
    ltpc,
    vol:   volRounded,
    value,
  };
}

export async function processEquityQueue() {
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
      const sentiment = computeEquitySentiment(msg.message);

      // 3. upsert result
      const { error: upsertError } = await supabase
        .from(EQUITY_SENTIMENT_TABLE)
        .upsert(
          {
            ts,
            ul,
            ltp:   sentiment.ltpc,
            vol:   sentiment.vol,
            value: sentiment.value,
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