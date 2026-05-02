create or replace function public.pgmq_send(
  queue_name text,
  message jsonb
)
returns bigint
language plpgsql
as $$
declare
  msg_id bigint;
begin
  msg_id := pgmq.send(queue_name, message);
  return msg_id;
end;
$$;