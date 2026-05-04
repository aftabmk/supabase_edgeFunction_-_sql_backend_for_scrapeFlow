export type EquityRow = {
  exchange: string;
  type: string;
  key: string;
  ltp: number;
  pc: number;
  ts: string;
  ul: string;
  vol: number;
};

export type QueueMessage = {
  msg_id: number;
  message: {
    ul: string;
    ts: string;
    ltp: number;
    pc: number;
    vol: number;
    prev_ltp: number | null;
    prev_vol: number | null;
    prev_ts: string | null;
    is_first_of_day: boolean;
  };
};

export type PrevRow = {
  prev_ltp: number;
  prev_vol: number;
  prev_ts: string;
};

// include type file in build file
export const __keep = true;
// export type { EquityRow, QueueMessage, PrevRow };