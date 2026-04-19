import { QUEUE_MAP } from "./constant.ts";
import { QueueName, WebhookPayload } from "./type.ts";

function resolveQueueName(payload: WebhookPayload): QueueName {
  // Supabase DB webhook sends { table, record, ... }
  // option_table → option_sentiment_queue
  // future_table → future_sentiment_queue
  // equity_table → equity_sentiment_queue
  
  const table = payload?.table ?? "";

  if (table.startsWith("option"))  return "option_sentiment_queue";
  if (table.startsWith("future"))  return "future_sentiment_queue";
  if (table.startsWith("equity"))  return "equity_sentiment_queue";

  throw new Error(`No queue mapped for table: "${table}"`);
}

export async function queueBroker(payload: WebhookPayload) {
  const queueName  = resolveQueueName(payload);
  const processor  = QUEUE_MAP[queueName];

  const result = await processor();

  return { queue: queueName, ...result };
}