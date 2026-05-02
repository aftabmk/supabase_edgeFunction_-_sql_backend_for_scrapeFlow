create or replace function public.pgmq_delete(
  queue_name text,
  msg_id bigint
)
returns boolean
language sql
as $$
  select pgmq.delete(queue_name, msg_id);
$$;