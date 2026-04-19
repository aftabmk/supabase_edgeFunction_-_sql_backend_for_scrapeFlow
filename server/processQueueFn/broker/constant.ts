import { processOptionQueue  } from "../option/index.ts";
import { processFutureQueue  } from "../future/index.ts";
import { processEquityQueue  } from "../equity/index.ts";

// queue names must match what was used in pgmq.create()
const QUEUE_MAP = {
  option_sentiment_queue: processOptionQueue,
  future_sentiment_queue: processFutureQueue,
  equity_sentiment_queue: processEquityQueue,
} as const;


export { QUEUE_MAP };