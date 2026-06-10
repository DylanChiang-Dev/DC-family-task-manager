-- 舊 task_type='repeatable' 已從枚舉移除（window 需要 start/end 日期，舊資料沒有），轉為 normal
UPDATE tasks SET task_type = 'normal' WHERE task_type = 'repeatable';
--> statement-breakpoint
-- 舊 {frequency:...} 週期配置 → 新 mode/interval/anchored 形狀
UPDATE tasks
SET recurrence_config = json_object('mode', 'interval', 'every', 1, 'unit', 'day', 'anchorDate', date('now'))
WHERE recurrence_config IS NOT NULL
  AND json_extract(recurrence_config, '$.frequency') = 'daily';
--> statement-breakpoint
UPDATE tasks
SET recurrence_config = json_object('mode', 'anchored', 'unit', 'week',
  'weekdays', json(coalesce(json_extract(recurrence_config, '$.days'), '[1]')))
WHERE recurrence_config IS NOT NULL
  AND json_extract(recurrence_config, '$.frequency') = 'weekly';
--> statement-breakpoint
UPDATE tasks
SET recurrence_config = json_object('mode', 'anchored', 'unit', 'month',
  'dates', json(coalesce(json_extract(recurrence_config, '$.dates'), '[1]')))
WHERE recurrence_config IS NOT NULL
  AND json_extract(recurrence_config, '$.frequency') = 'monthly';
--> statement-breakpoint
UPDATE tasks
SET recurrence_config = json_object('mode', 'anchored', 'unit', 'year',
  'month', coalesce(json_extract(recurrence_config, '$.month'), 1),
  'date', coalesce(json_extract(recurrence_config, '$.date'), 1))
WHERE recurrence_config IS NOT NULL
  AND json_extract(recurrence_config, '$.frequency') = 'yearly';
