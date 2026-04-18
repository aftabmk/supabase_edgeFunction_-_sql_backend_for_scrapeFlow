import { processOptionQueue  } from "../option/index.ts";
import { processFutureQueue  } from "../future/index.ts";
import { processEquityQueue  } from "../equity/index.ts";

// queue names must match what was used in pgmq.create()
const QUEUE_MAP = {
  option_sentiment_queue: processOptionQueue,
  future_sentiment_queue: processFutureQueue,
  equity_sentiment_queue: processEquityQueue,
} as const;

type QueueName = keyof typeof QUEUE_MAP;

type WebhookPayload = {
  table?:  string;
  schema?: string;
  type?:   string;
  record?: {
    queue_name?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

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