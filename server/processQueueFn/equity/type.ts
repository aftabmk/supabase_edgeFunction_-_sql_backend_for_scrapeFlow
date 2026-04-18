type QueueMessage = {
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

type SentimentResult = {
  ltpc:  number;
  vol:   number;
  value: number;
};

export { QueueMessage, SentimentResult };