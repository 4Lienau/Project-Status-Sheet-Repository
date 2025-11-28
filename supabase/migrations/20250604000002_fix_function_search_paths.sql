-- Fix function search path mutable warnings
-- Setting search_path = public for all identified functions

-- 1. check_azure_sync_due
ALTER FUNCTION public.check_azure_sync_due() SET search_path = public;

-- 2. end_user_sessions
ALTER FUNCTION public.end_user_sessions(uuid) SET search_path = public;

-- 3. get_ai_usage_analytics
ALTER FUNCTION public.get_ai_usage_analytics() SET search_path = public;

-- 4. get_session_statistics
ALTER FUNCTION public.get_session_statistics() SET search_path = public;

-- 5. get_project_creation_stats
ALTER FUNCTION public.get_project_creation_stats() SET search_path = public;

-- 6. cleanup_inactive_sessions
ALTER FUNCTION public.cleanup_inactive_sessions() SET search_path = public;

-- 7. get_ai_adoption_overview
ALTER FUNCTION public.get_ai_adoption_overview() SET search_path = public;

-- 8. invoke_sync_scheduler
ALTER FUNCTION public.invoke_sync_scheduler() SET search_path = public;

-- 9. update_updated_at_column
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;

-- 10. check_and_log_sync_status
ALTER FUNCTION public.check_and_log_sync_status() SET search_path = public;

-- 11. get_version_count
ALTER FUNCTION public.get_version_count(uuid) SET search_path = public;

-- 12. execute_sql
ALTER FUNCTION public.execute_sql(text) SET search_path = public;

-- 13. update_project_computed_status_color
ALTER FUNCTION public.update_project_computed_status_color(uuid) SET search_path = public;

-- 14. recalculate_all_computed_status_colors
ALTER FUNCTION public.recalculate_all_computed_status_colors() SET search_path = public;

-- 15. trigger_update_computed_status_color
ALTER FUNCTION public.trigger_update_computed_status_color() SET search_path = public;

-- 16. get_database_size
ALTER FUNCTION public.get_database_size() SET search_path = public;

-- 17. get_table_sizes
ALTER FUNCTION public.get_table_sizes() SET search_path = public;

-- 18. update_daily_usage_metrics
ALTER FUNCTION public.update_daily_usage_metrics(uuid, text) SET search_path = public;

-- 19. get_user_activity_summary
ALTER FUNCTION public.get_user_activity_summary() SET search_path = public;

-- 20. cleanup_stale_sessions
ALTER FUNCTION public.cleanup_stale_sessions() SET search_path = public;

-- 21. get_auth_users_data
ALTER FUNCTION public.get_auth_users_data() SET search_path = public;

-- 22. handle_new_user
ALTER FUNCTION public.handle_new_user() SET search_path = public;

-- 23. get_active_users
ALTER FUNCTION public.get_active_users() SET search_path = public;

-- 24. check_and_trigger_due_syncs
ALTER FUNCTION public.check_and_trigger_due_syncs() SET search_path = public;

-- 25. sync_config_trigger_check
ALTER FUNCTION public.sync_config_trigger_check() SET search_path = public;

-- 26. trigger_azure_sync_if_due
ALTER FUNCTION public.trigger_azure_sync_if_due() SET search_path = public;

-- 27. match_pm_knowledge
-- Note: Using vector(1536) type which requires the vector extension
ALTER FUNCTION public.match_pm_knowledge(vector(1536), float, int) SET search_path = public;

-- 28. get_auth_users_login_data
ALTER FUNCTION public.get_auth_users_login_data() SET search_path = public;

-- 29. get_ai_usage_trends
ALTER FUNCTION public.get_ai_usage_trends(integer) SET search_path = public;

-- 30. get_top_ai_users
ALTER FUNCTION public.get_top_ai_users(integer) SET search_path = public;

-- 31. trigger_sync_if_due
ALTER FUNCTION public.trigger_sync_if_due() SET search_path = public;

-- 32. get_user_login_statistics
ALTER FUNCTION public.get_user_login_statistics() SET search_path = public;

-- 33. get_comprehensive_user_stats
ALTER FUNCTION public.get_comprehensive_user_stats() SET search_path = public;

-- 34. test_project_creation_tracking
ALTER FUNCTION public.test_project_creation_tracking(uuid, text) SET search_path = public;
