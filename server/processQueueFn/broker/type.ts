import { QUEUE_MAP } from "./constant.ts";

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


export { QueueName, WebhookPayload };