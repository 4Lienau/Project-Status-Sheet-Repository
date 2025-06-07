-- Add computed_status_color column if it doesn't exist
ALTER TABLE projects ADD COLUMN IF NOT EXISTS computed_status_color TEXT;

-- Create function to update computed status color for a single project
CREATE OR REPLACE FUNCTION update_project_computed_status_color(project_id UUID)
RETURNS VOID AS $$
DECLARE
    project_record RECORD;
    milestone_avg NUMERIC;
    computed_color TEXT;
BEGIN
    -- Get the project record
    SELECT * INTO project_record FROM projects WHERE id = update_project_computed_status_color.project_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Project not found: %', update_project_computed_status_color.project_id;
    END IF;
    
    -- Calculate computed status color
    IF project_record.health_calculation_type = 'manual' AND project_record.manual_status_color IS NOT NULL THEN
        -- Use manual status color
        computed_color := project_record.manual_status_color;
    ELSIF project_record.status = 'completed' THEN
        computed_color := 'green';
    ELSIF project_record.status = 'cancelled' THEN
        computed_color := 'red';
    ELSIF project_record.status IN ('draft', 'on_hold') THEN
        computed_color := 'yellow';
    ELSE
        -- For active projects, calculate based on milestone completion
        SELECT AVG(completion) INTO milestone_avg 
        FROM milestones 
        WHERE milestones.project_id = project_record.id;
        
        IF milestone_avg IS NULL THEN
            -- No milestones, default to green
            computed_color := 'green';
        ELSIF milestone_avg >= 70 THEN
            computed_color := 'green';
        ELSIF milestone_avg >= 40 THEN
            computed_color := 'yellow';
        ELSE
            computed_color := 'red';
        END IF;
    END IF;
    
    -- Update the project with computed status color
    UPDATE projects 
    SET computed_status_color = computed_color
    WHERE id = update_project_computed_status_color.project_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to recalculate all computed status colors
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

-- Create trigger to automatically update computed status color when project or milestones change
CREATE OR REPLACE FUNCTION trigger_update_computed_status_color()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_TABLE_NAME = 'projects' THEN
        -- Project table trigger
        PERFORM update_project_computed_status_color(NEW.id);
        RETURN NEW;
    ELSIF TG_TABLE_NAME = 'milestones' THEN
        -- Milestones table trigger
        IF TG_OP = 'DELETE' THEN
            PERFORM update_project_computed_status_color(OLD.project_id);
            RETURN OLD;
        ELSE
            PERFORM update_project_computed_status_color(NEW.project_id);
            RETURN NEW;
        END IF;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS update_computed_status_color_on_project_change ON projects;
CREATE TRIGGER update_computed_status_color_on_project_change
    AFTER INSERT OR UPDATE OF status, health_calculation_type, manual_status_color ON projects
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_computed_status_color();

DROP TRIGGER IF EXISTS update_computed_status_color_on_milestone_change ON milestones;
CREATE TRIGGER update_computed_status_color_on_milestone_change
    AFTER INSERT OR UPDATE OR DELETE ON milestones
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_computed_status_color();

-- Initialize computed status colors for all existing projects
SELECT recalculate_all_computed_status_colors();
