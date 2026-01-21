-- 每月自动补充积分的 SQL 脚本
-- 请在 Supabase Dashboard 的 SQL Editor 中执行此脚本

-- 1. 安装 pg_cron 扩展 (如果尚未安装)
create extension if not exists pg_cron;

-- 2. 创建重置积分的函数
-- 逻辑：给所有用户增加 100 积分
create or replace function public.add_monthly_credits()
returns void
language plpgsql
security definer
as $$
begin
  update public.profiles
  set credits = credits + 100;
end;
$$;

-- 3. 创建定时任务
-- 计划：每月 1 号凌晨 0 点执行 (Cron 表达式: '0 0 1 * *')
select cron.schedule(
  'monthly-credits-renewal', -- 任务名称
  '0 0 1 * *',              -- Cron 表达式
  $$select public.add_monthly_credits()$$
);

-- 查看已调度的任务
-- select * from cron.job;
