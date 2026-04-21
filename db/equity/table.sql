-- equity_sentiment_table
CREATE TABLE IF NOT EXISTS equity_sentiment_table (
  ts      TIMESTAMPTZ NOT NULL,
  ul      TEXT        NOT NULL,
  ltp     NUMERIC,
  vol     NUMERIC,
  val     NUMERIC,
  prev_ts TIMESTAMPTZ,
  PRIMARY KEY (ts, ul)
) PARTITION BY RANGE (ts);