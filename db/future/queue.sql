-- 1. enable pgmq
CREATE EXTENSION IF NOT EXISTS pgmq;
SELECT pgmq.create('future_sentiment_queue');



