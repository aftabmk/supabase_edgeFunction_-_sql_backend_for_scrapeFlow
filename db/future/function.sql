-- 3. simplified get_future_sentiment — pure SELECT, zero computation
CREATE OR REPLACE FUNCTION get_future_sentiment(
    exchange    TEXT,
    currentDate TEXT,
    multiplier  NUMERIC
)
RETURNS TABLE (
    ts      TEXT,
    ulv     TEXT,
    coi     NUMERIC,
    ltpc    NUMERIC,
    vol     NUMERIC,
    coivol  NUMERIC,
    val     NUMERIC,
    bias    TEXT
)
LANGUAGE sql AS $$
    SELECT
        ts::TEXT,
        ulv::TEXT,
        coi,
        ltpc,
        vol,
        coivol,
        val,
        bias
    FROM future_sentiment_table
    WHERE ul  = exchange
      AND ts >= currentDate::TIMESTAMPTZ
      AND ts <  currentDate::TIMESTAMPTZ + INTERVAL '1 day'
    ORDER BY ts;
$$;