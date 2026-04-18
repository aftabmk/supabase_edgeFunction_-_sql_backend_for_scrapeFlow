-- 2. future_sentiment_table
CREATE TABLE IF NOT EXISTS future_sentiment_table (
  ts        TIMESTAMPTZ NOT NULL,
  ul        TEXT        NOT NULL,
  ulv       NUMERIC,
  coi       NUMERIC,
  ltpc      NUMERIC,
  vol       NUMERIC,
  coivol    NUMERIC,
  val       NUMERIC,
  bias      TEXT,
  prev_ts   TIMESTAMPTZ,
  PRIMARY KEY (ts, ul)
) PARTITION BY RANGE (ts);