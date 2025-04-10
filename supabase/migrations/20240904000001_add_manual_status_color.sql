-- Add manual_status_color column to projects table
alter table projects add column if not exists manual_status_color text check (manual_status_color in ('red', 'yellow', 'green'));
