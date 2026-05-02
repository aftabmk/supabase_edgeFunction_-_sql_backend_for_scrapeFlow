create or replace function public.pgmq_read(
  queue_name text,
  vt integer,
  qty integer
)
returns table (
  msg_id bigint,
  read_ct integer,
  enqueued_at timestamptz,
  vt timestamptz,
  message jsonb
)
language sql
as $$
  select *
  from pgmq.read(queue_name, vt, qty);
$$;