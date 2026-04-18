-- option_sentiment_table
CREATE TABLE IF NOT EXISTS option_sentiment_table (
  ts        TIMESTAMPTZ NOT NULL,
  ul        TEXT        NOT NULL,
  str       NUMERIC     NOT NULL,
  exp       DATE        NOT NULL,
  ce_bias   TEXT,
  ce_coivol NUMERIC,
  ce_val    NUMERIC,
  ce_ltpc   NUMERIC,
  ce_oi     NUMERIC,
  ulv       NUMERIC,
  pe_oi     NUMERIC,
  pe_ltpc   NUMERIC,
  pe_val    NUMERIC,
  pe_coivol NUMERIC,
  pe_bias   TEXT,
  prev_ts   TIMESTAMPTZ,
  PRIMARY KEY (ts, ul, str, exp)
) PARTITION BY RANGE (ts);