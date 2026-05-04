import { QUEUE_MAP } from "./constant.ts";

export type QueueName = keyof typeof QUEUE_MAP;

export type WebhookPayload = {
  table?:  string;
  schema?: string;
  type?:   string;
  record?: {
	queue_name?: string;
	[key: string]: unknown;
  };
  [key: string]: unknown;
};

export const __keep = true;
// export type { QueueName, WebhookPayload };