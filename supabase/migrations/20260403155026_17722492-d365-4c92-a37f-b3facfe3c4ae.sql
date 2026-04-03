
SELECT cron.schedule(
  'check-automations-every-30min',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://mfuxmdivnwhuczapoxik.supabase.co/functions/v1/check-automations',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mdXhtZGl2bndodWN6YXBveGlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0NDI3MzUsImV4cCI6MjA5MDAxODczNX0.hE62g-lpavBTdsAHuI0X7n9tWmYTmQiwabZzIZPOIYw"}'::jsonb,
    body := concat('{"time": "', now(), '"}')::jsonb
  ) AS request_id;
  $$
);
