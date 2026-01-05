import React, { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import ProjectGantt from "@/components/timeline/ProjectGantt";
import { projectService, type ProjectWithRelations } from "@/lib/services/project";
import Layout from "@/components/layout/Layout";

const ProjectTimeline: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<ProjectWithRelations | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Default timeline view to monthly
  const [zoom, setZoom] = useState<"weekly" | "monthly" | "quarterly" | "yearly">("monthly");

  useEffect(() => {
    const load = async () => {
      try {
        if (!id) {
          setError("No project id provided");
          setLoading(false);
          return;
        }
        const p = await projectService.getProject(id);
        setProject(p);
      } catch (e: any) {
        setError(e?.message || "Failed to load project");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const title = project?.title ? project.title.replace(/<[^>]*>/g, "") : "Project";

  // Derive dates if missing
  const start = project?.calculated_start_date || (project?.milestones?.length ? project.milestones.map(m => m.date).sort()[0] : null);
  const end = project?.calculated_end_date || (project?.milestones?.length ? project.milestones.map(m => m.date).sort().slice(-1)[0] : null);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading timeline…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
        <div className="text-destructive">{error}</div>
        <Button variant="outline" onClick={() => navigate("/")}>Back to Projects</Button>
      </div>
    );
  }

  return (
    <Layout>
      <div className="w-full p-6 bg-background">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{title} – Timeline</h1>
            <p className="text-sm text-muted-foreground">Read-only Gantt view based on project dates and milestones.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Zoom</span>
              <Select value={zoom} onValueChange={(v) => setZoom(v as any)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Weekly" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="ghost" onClick={() => navigate("/")}>Back to Projects</Button>
            <Button variant="outline" onClick={() => navigate(`/project/${id}`)}>Back to Edit</Button>
          </div>
        </div>

        <ProjectGantt
          projectTitle={title}
          startDate={start}
          endDate={end}
          zoom={zoom}
          overallStatusColor={(project as any)?.computed_status_color || (project as any)?.manual_status_color || "green"}
          healthCalculationType={(project as any)?.health_calculation_type}
          milestones={(project?.milestones || []).map(m => ({
            date: m.date,
            endDate: m.end_date,
            milestone: m.milestone,
            status: (m.status as any) || "green",
            completion: m.completion,
            owner: m.owner,
            tasksCount: (m as any)?.tasks?.length ?? (m as any)?.tasks_count ?? (m as any)?.taskCount ?? 0,
          }))}
        />
      </div>
    </Layout>
  );
};

export default ProjectTimeline;