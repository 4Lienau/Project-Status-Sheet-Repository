-- Fix ambiguous column reference in get_ai_usage_trends function
CREATE OR REPLACE FUNCTION get_ai_usage_trends(days_back INTEGER DEFAULT 30)
RETURNS TABLE (
  date DATE,
  feature_type TEXT,
  usage_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH date_series AS (
    SELECT generate_series(
      CURRENT_DATE - (days_back || ' days')::INTERVAL,
      CURRENT_DATE,
      '1 day'::INTERVAL
    )::DATE as date
  ),
  feature_types AS (
    -- Qualify the column with the table name/alias to avoid ambiguity with the output parameter 'feature_type'
    SELECT DISTINCT t.feature_type 
    FROM ai_usage_tracking t
  )
  SELECT 
    ds.date,
    ft.feature_type,
    COALESCE(COUNT(aut.id), 0) as usage_count
  FROM date_series ds
  CROSS JOIN feature_types ft
  LEFT JOIN ai_usage_tracking aut ON 
    DATE(aut.created_at) = ds.date AND 
    aut.feature_type = ft.feature_type
  GROUP BY ds.date, ft.feature_type
  ORDER BY ds.date, ft.feature_type;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
