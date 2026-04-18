type FutureRow = {
  exchange: string;
  type: string;
  ts: string;
  key: string;
  exp: string;
  vol: number;
  ltp: number;
  oi: number;
  tto: number;
  ul: string;
  ulv: number;
};

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

type PrevRow = {
  prev_oi: number;
  prev_ltp: number;
  prev_vol: number;
  prev_ts: string;
};


export { FutureRow, QueueMessage, PrevRow }