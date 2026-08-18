-- Add effective-dated budgets to projects created with the original schema.
alter table public.budget_settings
  add column if not exists budget_history jsonb not null default '[]'::jsonb;

update public.budget_settings
set budget_history = jsonb_build_array(
  jsonb_build_object('effectiveDate', start_date::text, 'dailyBudget', daily_budget)
)
where budget_history = '[]'::jsonb;
