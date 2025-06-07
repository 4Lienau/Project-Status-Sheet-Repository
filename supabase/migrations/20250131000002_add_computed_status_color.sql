-- Add computed_status_color field to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS computed_status_color TEXT CHECK (computed_status_color IN ('red', 'yellow', 'green'));

-- Create index for better filtering performance
CREATE INDEX IF NOT EXISTS idx_projects_computed_status_color ON projects(computed_status_color);

-- Enable realtime for the projects table
ALTER PUBLICATION supabase_realtime ADD TABLE projects;

-- Create function to calculate project health status color
CREATE OR REPLACE FUNCTION calculate_project_health_color(project_row projects)
RETURNS TEXT AS $$
DECLARE
    milestone_count INTEGER;
    avg_completion NUMERIC;
    health_color TEXT;
BEGIN
    -- If using manual calculation and manual color is set, use that
    IF project_row.health_calculation_type = 'manual' AND project_row.manual_status_color IS NOT NULL THEN
        RETURN project_row.manual_status_color;
    END IF;
    
    -- Use status-based colors for certain statuses
    IF project_row.status IN ('draft', 'on_hold') THEN
        RETURN 'yellow';
    ELSIF project_row.status = 'cancelled' THEN
        RETURN 'red';
    ELSIF project_row.status = 'completed' THEN
        RETURN 'green';
    END IF;
    
    -- For active projects, determine based on milestone completion
    SELECT COUNT(*), COALESCE(AVG(completion), 0)
    INTO milestone_count, avg_completion
    FROM milestones
    WHERE project_id = project_row.id;
    
    -- If no milestones, default to green
    IF milestone_count = 0 THEN
        RETURN 'green';
    END IF;
    
    -- Calculate color based on average completion
    IF avg_completion >= 70 THEN
        health_color := 'green';
    ELSIF avg_completion >= 40 THEN
        health_color := 'yellow';
    ELSE
        health_color := 'red';
    END IF;
    
    RETURN health_color;
END;
$$ LANGUAGE plpgsql;

-- Create function to update computed status color for a project
CREATE OR REPLACE FUNCTION update_project_computed_status_color(project_id UUID)
RETURNS VOID AS $$
DECLARE
    project_row projects%ROWTYPE;
    new_color TEXT;
BEGIN
    -- Get the project row
    SELECT * INTO project_row FROM projects WHERE id = project_id;
    
    IF NOT FOUND THEN
        RETURN;
    END IF;
    
    -- Calculate the new color
    new_color := calculate_project_health_color(project_row);
    
    -- Update the computed status color
    UPDATE projects 
    SET computed_status_color = new_color,
        updated_at = NOW()
    WHERE id = project_id;
END;
$$ LANGUAGE plpgsql;

-- Create trigger function to update computed status color when projects change
CREATE OR REPLACE FUNCTION trigger_update_computed_status_color()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the computed status color for the affected project
    PERFORM update_project_computed_status_color(NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger function to update computed status color when milestones change
CREATE OR REPLACE FUNCTION trigger_update_computed_status_color_from_milestones()
RETURNS TRIGGER AS $$
BEGIN
    -- Update for the new project if INSERT or UPDATE
    IF TG_OP IN ('INSERT', 'UPDATE') AND NEW.project_id IS NOT NULL THEN
        PERFORM update_project_computed_status_color(NEW.project_id);
    END IF;
    
    -- Update for the old project if UPDATE or DELETE
    IF TG_OP IN ('UPDATE', 'DELETE') AND OLD.project_id IS NOT NULL THEN
        PERFORM update_project_computed_status_color(OLD.project_id);
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_projects_computed_status_color ON projects;
CREATE TRIGGER trigger_projects_computed_status_color
    AFTER UPDATE OF status, health_calculation_type, manual_status_color, manual_health_percentage
    ON projects
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_computed_status_color();

DROP TRIGGER IF EXISTS trigger_milestones_computed_status_color ON milestones;
CREATE TRIGGER trigger_milestones_computed_status_color
    AFTER INSERT OR UPDATE OR DELETE
    ON milestones
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_computed_status_color_from_milestones();

-- Function to recalculate all project computed status colors
CREATE OR REPLACE FUNCTION recalculate_all_computed_status_colors()
RETURNS INTEGER AS $$
DECLARE
    project_record RECORD;
    updated_count INTEGER := 0;
BEGIN
    FOR project_record IN SELECT id FROM projects LOOP
        PERFORM update_project_computed_status_color(project_record.id);
        updated_count := updated_count + 1;
    END LOOP;
    
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Populate computed_status_color for all existing projects
SELECT recalculate_all_computed_status_colors();
