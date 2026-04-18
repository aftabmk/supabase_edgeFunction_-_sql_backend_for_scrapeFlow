type QueueMessage = {
  msg_id: number;
  message: {
    ul: string;
    ts: string;
    multiplier: number;
    oi: number;
    ltp: number;
    vol: number;
    ulv: number;
    prev_oi: number;
    prev_ltp: number;
    prev_vol: number;
    prev_ts: string | null;
  };
};

type SentimentResult = {
  coi: number;
  ltpc: number;
  vol: number;
  coivol: number | null;
  val: number | null;
  bias: string | null;
  ulv: number;
};

export { QueueMessage, SentimentResult }