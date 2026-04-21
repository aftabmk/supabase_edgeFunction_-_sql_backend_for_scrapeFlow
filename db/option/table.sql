-- ─────────────────────────────────────────────
-- 1. MASTER sentiment table  (ts, ul, exp, str, ulv only)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS option_sentiment_table (
  ts   TIMESTAMPTZ NOT NULL,
  ul   TEXT        NOT NULL,
  exp  DATE        NOT NULL,
  str  NUMERIC     NOT NULL,
  ulv  NUMERIC,
  prev_ts TIMESTAMPTZ,
  PRIMARY KEY (ul, ts, str, exp)
) PARTITION BY LIST (ul);

CREATE TABLE IF NOT EXISTS option_sentiment_table_nse
  PARTITION OF option_sentiment_table
  FOR VALUES IN ('NIFTY')
  PARTITION BY RANGE (ts);

CREATE TABLE IF NOT EXISTS option_sentiment_table_bse
  PARTITION OF option_sentiment_table
  FOR VALUES IN ('SENSEX')
  PARTITION BY RANGE (ts);
-- ─────────────────────────────────────────────
-- option_sentiment_payload  (CE + PE combined)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS option_sentiment_payload_table (
  ts        TIMESTAMPTZ NOT NULL,
  ul        TEXT        NOT NULL,
  exp       DATE        NOT NULL,
  str       NUMERIC     NOT NULL,
  -- CE
  ce_bias   TEXT,
  ce_coivol NUMERIC,
  ce_val    NUMERIC,
  ce_ltpc   NUMERIC,
  ce_oi     NUMERIC,
  -- PE
  pe_bias   TEXT,
  pe_coivol NUMERIC,
  pe_val    NUMERIC,
  pe_ltpc   NUMERIC,
  pe_oi     NUMERIC,
  PRIMARY KEY (ul, ts, str, exp),
  CONSTRAINT fk_payload_sentiment
    FOREIGN KEY (ul, ts, str, exp)
    REFERENCES option_sentiment_table (ul, ts, str, exp)
    ON DELETE CASCADE
);


-- monthly sub-partitions
CREATE TABLE IF NOT EXISTS option_sentiment_table_nse_2026_04
  PARTITION OF option_sentiment_table_nse
  FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');

CREATE TABLE IF NOT EXISTS option_sentiment_table_bse_2026_04
  PARTITION OF option_sentiment_table_bse
  FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');


