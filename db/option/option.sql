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
        p.ce_bias,
        p.ce_coivol,
        p.ce_val,
        p.ce_ltpc,
        p.ce_oi,
        s.ts::TEXT,
        s.ulv,
        p.pe_oi,
        p.pe_ltpc,
        p.pe_val,
        p.pe_coivol,
        p.pe_bias
    FROM option_sentiment_table s
    JOIN option_sentiment_payload p
      USING (ul, ts, str, exp)
    WHERE s.ul  = exchange
      AND s.str = strikePrice
      AND s.exp = expiryDate
      AND s.ts >= currentDate::TIMESTAMPTZ
      AND s.ts <  currentDate::TIMESTAMPTZ + INTERVAL '1 day'
    ORDER BY s.ts;
$$;