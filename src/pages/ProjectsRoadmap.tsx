import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import ProjectGantt, { TimelineMilestone } from "@/components/timeline/ProjectGantt";
import { projectService, type ProjectWithRelations } from "@/lib/services/project";
import Layout from "@/components/layout/Layout";
import { ArrowLeft, Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

const ProjectsRoadmap: React.FC = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<ProjectWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [projectPopoverOpen, setProjectPopoverOpen] = useState(false);
  const [zoom, setZoom] = useState<"weekly" | "monthly" | "quarterly" | "yearly">("quarterly");

  useEffect(() => {
    const load = async () => {
      try {
        const allProjects = await projectService.getAllProjects();
        setProjects(allProjects);
      } catch (e: any) {
        setError(e?.message || "Failed to load projects");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Extract unique departments from projects
  const departments = Array.from(
    new Set(
      projects
        .map((p) => p.department)
        .filter((d): d is string => Boolean(d))
    )
  ).sort();

  // Filter projects by status, department, selected projects, and ensure they have dates
  const filteredProjects = projects.filter((p) => {
    const hasValidDates = p.calculated_start_date && p.calculated_end_date;
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    const matchesDepartment = departmentFilter === "all" || p.department === departmentFilter;
    const matchesSelection = selectedProjects.length === 0 || selectedProjects.includes(p.id);
    return hasValidDates && matchesStatus && matchesDepartment && matchesSelection;
  });

  // Get list of projects with valid dates for the selection dropdown
  const selectableProjects = projects.filter((p) => p.calculated_start_date && p.calculated_end_date);

  // Calculate overall timeline range
  const getTimelineRange = () => {
    if (filteredProjects.length === 0) return { start: null, end: null };

    const dates = filteredProjects.flatMap((p) => [
      new Date(p.calculated_start_date!),
      new Date(p.calculated_end_date!),
    ]);

    return {
      start: new Date(Math.min(...dates.map((d) => d.getTime()))),
      end: new Date(Math.max(...dates.map((d) => d.getTime()))),
    };
  };

  const { start: overallStart, end: overallEnd } = getTimelineRange();

  // Create unified milestones array - ONE milestone per project with start and end dates
  const unifiedMilestones: TimelineMilestone[] = filteredProjects.map((project) => {
    const title = project.title ? project.title.replace(/<[^>]*>/g, "") : "Untitled Project";
    const statusColor = 
      (project as any)?.computed_status_color ||
      (project as any)?.manual_status_color ||
      "green";

    return {
      date: project.calculated_start_date!,
      endDate: project.calculated_end_date!, // NEW: Include end date
      milestone: title,
      status: statusColor as "green" | "yellow" | "red",
      completion: 50, // Show as 50% for visual balance
      owner: project.project_manager || "",
      tasksCount: 0,
    };
  }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-muted-foreground">Loading roadmap…</div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
          <div className="text-destructive">{error}</div>
          <Button variant="outline" onClick={() => navigate("/")}>
            Back to Projects
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="w-full p-6 bg-background">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Roadmap</h1>
            <p className="text-sm text-muted-foreground">
              View all projects on a single unified timeline. Each project is shown as a single bar from start to end.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Status</span>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Active" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Department</span>
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="w-[280px] flex flex-col">
              <Popover
                open={projectPopoverOpen}
                onOpenChange={setProjectPopoverOpen}
              >
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={projectPopoverOpen}
                    className="w-full justify-between text-foreground border-border bg-card/50 hover:bg-card h-10"
                  >
                    {selectedProjects.length > 0
                      ? `${selectedProjects.length} project${selectedProjects.length > 1 ? "s" : ""} selected`
                      : "All Projects"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[280px] p-0" align="start">
                  <Command>
                    <CommandInput
                      placeholder="Search projects..."
                      className="h-9"
                    />
                    <CommandList>
                      <CommandEmpty>
                        No project found.
                      </CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          onSelect={() => {
                            setSelectedProjects([]);
                            setProjectPopoverOpen(false);
                          }}
                          className="flex items-center justify-between"
                        >
                          <span>All Projects</span>
                          {selectedProjects.length === 0 && (
                            <Check className="h-4 w-4" />
                          )}
                        </CommandItem>
                        {selectableProjects.map((project) => {
                          const title = project.title ? project.title.replace(/<[^>]*>/g, "") : "Untitled Project";
                          return (
                            <CommandItem
                              key={project.id}
                              onSelect={() => {
                                setSelectedProjects((prev) => {
                                  const newProjects = prev.includes(project.id)
                                    ? prev.filter((id) => id !== project.id)
                                    : [...prev, project.id];
                                  return newProjects;
                                });
                              }}
                              className="flex items-center justify-between"
                            >
                              <span className="truncate">{title}</span>
                              {selectedProjects.includes(project.id) && (
                                <Check className="h-4 w-4" />
                              )}
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {selectedProjects.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {selectedProjects.slice(0, 3).map((projectId) => {
                    const project = projects.find(p => p.id === projectId);
                    const title = project?.title ? project.title.replace(/<[^>]*>/g, "") : "Untitled";
                    const displayTitle = title.length > 20 ? `${title.slice(0, 20)}...` : title;
                    return (
                      <Badge
                        key={projectId}
                        variant="secondary"
                        className="flex items-center gap-1 bg-secondary text-secondary-foreground border-border hover:bg-secondary/80"
                      >
                        {displayTitle}
                        <X
                          className="h-3 w-3 cursor-pointer hover:text-muted-foreground"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedProjects((prev) =>
                              prev.filter((id) => id !== projectId)
                            );
                          }}
                        />
                      </Badge>
                    );
                  })}
                  {selectedProjects.length > 3 && (
                    <Badge variant="secondary" className="bg-secondary text-secondary-foreground border-border">
                      +{selectedProjects.length - 3} more
                    </Badge>
                  )}
                  {selectedProjects.length > 1 && (
                    <Badge
                      variant="outline"
                      className="cursor-pointer bg-card/50 text-foreground border-border hover:bg-card"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedProjects([]);
                      }}
                    >
                      Clear all
                    </Badge>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Zoom</span>
              <Select value={zoom} onValueChange={(v) => setZoom(v as any)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Quarterly" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="ghost" onClick={() => navigate("/")} className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Projects
            </Button>
          </div>
        </div>

        {filteredProjects.length === 0 ? (
          <div className="w-full bg-card text-foreground border border-border rounded-lg p-6">
            <div className="text-lg font-semibold">No Projects Found</div>
            <div className="text-muted-foreground mt-2">
              {statusFilter === "all" && departmentFilter === "all" && selectedProjects.length === 0
                ? "No projects with valid dates found. Add project dates to see them on the timeline."
                : selectedProjects.length > 0
                ? "No selected projects match the current filters."
                : `No projects match the current filters (Status: ${statusFilter}, Department: ${departmentFilter}).`}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-muted/50 border border-border rounded-lg p-3 text-sm text-muted-foreground">
              <strong>Note:</strong> Each project is shown as a single bar spanning from start to end date. 
              The color indicates the project's health status.
            </div>
            <ProjectGantt
              projectTitle="All Projects Timeline"
              startDate={overallStart?.toISOString() || null}
              endDate={overallEnd?.toISOString() || null}
              zoom={zoom}
              overallStatusColor="green"
              healthCalculationType={null}
              milestones={unifiedMilestones}
              rowLabelText="Project"
            />
            <div className="mt-4 bg-card border border-border rounded-lg p-4">
              <h3 className="text-sm font-semibold mb-2">Projects Included ({filteredProjects.length})</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {filteredProjects.map((project) => {
                  const title = project.title ? project.title.replace(/<[^>]*>/g, "") : "Untitled Project";
                  const statusColor = 
                    (project as any)?.computed_status_color ||
                    (project as any)?.manual_status_color ||
                    "green";
                  const colorClass = statusColor === "red" 
                    ? "bg-red-500" 
                    : statusColor === "yellow" 
                    ? "bg-yellow-500" 
                    : "bg-green-500";
                  
                  return (
                    <div 
                      key={project.id} 
                      className="flex items-center gap-2 text-sm p-2 hover:bg-muted/50 rounded cursor-pointer"
                      onClick={() => navigate(`/project/${project.id}`)}
                    >
                      <span className={`w-2 h-2 rounded-full ${colorClass}`} />
                      <span className="truncate flex-1">{title}</span>
                      <span className="text-xs text-muted-foreground capitalize">{project.status}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ProjectsRoadmap;