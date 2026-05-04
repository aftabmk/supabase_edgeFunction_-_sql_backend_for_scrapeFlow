export type CePe = {
  oi:  number;
  vol: number;
  iv:  number;
  ltp: number;
};

export type OptionRow = {
  exchange: string;
  type:     string;
  ts:       string;
  key:      string;
  str:      number;
  exp:      string;
  ul:       string;
  ulv:      number;
  ce:       CePe;
  pe:       CePe;
};

export type QueueMessage = {
  msg_id: number;
  message: {
    ul:          string;
    ts:          string;
    str:         number;
    exp:         string;
    key:         string;
    multiplier:  number;
    ulv:         number;
    // current
    ce_oi:       number;
    ce_vol:      number;
    ce_iv:       number;
    ce_ltp:      number;
    pe_oi:       number;
    pe_vol:      number;
    pe_iv:       number;
    pe_ltp:      number;
    // prev
    prev_ulv:    number;
    prev_ce_oi:  number;
    prev_ce_vol: number;
    prev_ce_iv:  number;
    prev_ce_ltp: number;
    prev_pe_oi:  number;
    prev_pe_vol: number;
    prev_pe_iv:  number;
    prev_pe_ltp: number;
    prev_ts:     string | null;
    // prev day iv fallback (fetched once, reused across all strikes)
    prev_day_ce_iv: number;
    prev_day_pe_iv: number;
  };
};

export type PrevRow = {
  prev_ulv:    number;
  prev_ce_oi:  number;
  prev_ce_vol: number;
  prev_ce_iv:  number;
  prev_ce_ltp: number;
  prev_pe_oi:  number;
  prev_pe_vol: number;
  prev_pe_iv:  number;
  prev_pe_ltp: number;
  prev_ts:     string;
};

export type Exchange = {
    EXCHANGE_1 : number;
    EXCHANGE_2 : number
};

// include type file in build file
export const __keep = true;
// export type { CePe, OptionRow, QueueMessage, PrevRow, Exchange };