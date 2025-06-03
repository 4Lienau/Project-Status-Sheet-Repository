-- Create function to get database size
CREATE OR REPLACE FUNCTION get_database_size()
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    db_size_bytes BIGINT;
    db_size_mb NUMERIC;
BEGIN
    -- Get the current database size in bytes
    SELECT pg_database_size(current_database()) INTO db_size_bytes;
    
    -- Convert bytes to megabytes
    db_size_mb := db_size_bytes / (1024.0 * 1024.0);
    
    RETURN ROUND(db_size_mb, 2);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_database_size() TO authenticated;

-- Create function to get detailed table sizes
CREATE OR REPLACE FUNCTION get_table_sizes()
RETURNS TABLE(
    table_name TEXT,
    size_bytes BIGINT,
    size_mb NUMERIC,
    row_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        schemaname||'.'||tablename as table_name,
        pg_total_relation_size(schemaname||'.'||tablename) as size_bytes,
        ROUND(pg_total_relation_size(schemaname||'.'||tablename) / (1024.0 * 1024.0), 2) as size_mb,
        n_tup_ins - n_tup_del as row_count
    FROM pg_stat_user_tables 
    WHERE schemaname = 'public'
    ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_table_sizes() TO authenticated;
