-- 生成扣积分：原子扣减 1 积分（成功生成后调用）
-- 请在 Supabase Dashboard 的 SQL Editor 中执行此脚本

create or replace function public.deduct_generation_credit()
returns integer
language plpgsql
as $$
declare
  new_credits integer;
begin
  update public.profiles
  set credits = credits - 1
  where id = auth.uid()
    and credits >= 1
  returning credits into new_credits;

  if new_credits is null then
    raise exception 'INSUFFICIENT_CREDITS';
  end if;

  return new_credits;
end;
$$;

grant execute on function public.deduct_generation_credit() to authenticated;

