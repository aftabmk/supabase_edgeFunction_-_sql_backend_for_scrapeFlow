-- simplified get_equity_sentiment — pure SELECT, zero computation
CREATE OR REPLACE FUNCTION get_equity_sentiment(
    exchange    TEXT,
    currentDate TEXT
)
RETURNS TABLE (
    ts    TEXT,
    ltp   NUMERIC,
    vol   NUMERIC,
    value NUMERIC
)
LANGUAGE sql AS $$
    SELECT
        ts::TEXT,
        ltp,
        vol,
        value
    FROM equity_sentiment_table
    WHERE ul  = exchange
      AND ts >= currentDate::TIMESTAMPTZ
      AND ts <  currentDate::TIMESTAMPTZ + INTERVAL '1 day'
    ORDER BY ts;
$$;