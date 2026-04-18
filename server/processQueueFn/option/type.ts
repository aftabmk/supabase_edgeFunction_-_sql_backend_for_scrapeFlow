type QueueMessage = {
  msg_id: number;
  message: {
    ul:             string;
    ts:             string;
    str:            number;
    exp:            string;
    key:            string;
    multiplier:     number;
    ulv:            number;
    ce_oi:          number;
    ce_vol:         number;
    ce_iv:          number;
    ce_ltp:         number;
    pe_oi:          number;
    pe_vol:         number;
    pe_iv:          number;
    pe_ltp:         number;
    prev_ulv:       number;
    prev_ce_oi:     number;
    prev_ce_vol:    number;
    prev_ce_iv:     number;
    prev_ce_ltp:    number;
    prev_pe_oi:     number;
    prev_pe_vol:    number;
    prev_pe_iv:     number;
    prev_pe_ltp:    number;
    prev_ts:        string | null;
    prev_day_ce_iv: number;
    prev_day_pe_iv: number;
  };
};

type SentimentResult = {
  ce_bias:   string | null;
  ce_coivol: number | null;
  ce_val:    number | null;
  ce_ltpc:   number;
  ce_oi:     number;
  ulv:       number;
  pe_oi:     number;
  pe_ltpc:   number;
  pe_val:    number | null;
  pe_coivol: number | null;
  pe_bias:   string | null;
};

export { QueueMessage, SentimentResult };