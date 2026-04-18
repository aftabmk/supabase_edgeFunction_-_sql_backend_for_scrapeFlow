-- simplified get_option_sentiment — pure SELECT, zero computation
CREATE OR REPLACE FUNCTION get_option_sentiment(
    exchange    TEXT,
    strikePrice NUMERIC,
    currentDate DATE,
    expiryDate  DATE,
    multiplier  NUMERIC
)
RETURNS TABLE (
    ce_bias   TEXT,
    ce_coivol NUMERIC,
    ce_val    NUMERIC,
    ce_ltpc   NUMERIC,
    ce_oi     NUMERIC,
    ts        TEXT,
    ulv       NUMERIC,
    pe_oi     NUMERIC,
    pe_ltpc   NUMERIC,
    pe_val    NUMERIC,
    pe_coivol NUMERIC,
    pe_bias   TEXT
)
LANGUAGE sql AS $$
    SELECT
        ce_bias,
        ce_coivol,
        ce_val,
        ce_ltpc,
        ce_oi,
        ts::TEXT,
        ulv,
        pe_oi,
        pe_ltpc,
        pe_val,
        pe_coivol,
        pe_bias
    FROM option_sentiment_table
    WHERE ul  = exchange
      AND str = strikePrice
      AND exp = expiryDate
      AND ts >= currentDate::TIMESTAMPTZ
      AND ts <  currentDate::TIMESTAMPTZ + INTERVAL '1 day'
    ORDER BY ts;
$$;