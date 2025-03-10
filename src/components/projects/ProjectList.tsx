import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, FileSpreadsheet, Loader2 } from "lucide-react";
import ProjectListSkeleton from "./ProjectListSkeleton";
import { useToast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { useNavigate } from "react-router-dom";
import { projectService } from "@/lib/services/project";
import { useAuth } from "@/lib/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import type { ProjectWithRelations } from "@/lib/services/project";
import { exportProjectsToExcel } from "@/lib/services/excelExport";

interface ProjectListProps {
  onSelectProject: (project: ProjectWithRelations) => void;
  onCreateNew: () => void;
  filterManager?: string;
  filterStatus?: string;
  filterDepartment?: string;
}

const ProjectList = ({
  onSelectProject,
  onCreateNew,
  filterManager = "",
  filterStatus = "all",
  filterDepartment = "all",
}: ProjectListProps) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<{ full_name: string | null }>({
    full_name: null,
  });

  useEffect(() => {
    if (user?.id) {
      supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single()
        .then(({ data }) => {
          if (data) {
            setProfile(data);
          }
        });
    }
  }, [user?.id]);
  const navigate = useNavigate();
  const [allProjects, setAllProjects] = useState<ProjectWithRelations[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<
    ProjectWithRelations[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const loadProjects = async () => {
      setLoading(true);

      // First, get the current user's department and email
      let userDepartment = "";
      let userEmail = "";
      let userName = "";

      if (user?.id) {
        const { data: userData } = await supabase
          .from("profiles")
          .select("department, email, full_name")
          .eq("id", user.id)
          .single();

        if (userData) {
          userDepartment = userData.department || "";
          userEmail = userData.email || user.email || "";
          userName = userData.full_name || "";
        } else {
          userEmail = user.email || "";
        }
      }

      const projectPromises = (await projectService.getAllProjects()).map((p) =>
        projectService.getProject(p.id),
      );
      const projects = (await Promise.all(projectPromises)).filter(
        (p): p is ProjectWithRelations => p !== null,
      );

      setAllProjects(projects);

      // Apply filters
      let filtered = [...projects];

      // First filter by user's department (unless they're in Technology department)
      if (userDepartment && userDepartment !== "Technology") {
        filtered = filtered.filter((project) => {
          // Always show projects where user is the project manager
          if (userEmail && project.project_manager === userEmail) return true;
          if (userName && project.project_manager === userName) return true;

          // Show projects from user's department
          return project.department === userDepartment;
        });
      }

      // Then apply department filter dropdown if selected
      if (filterDepartment && filterDepartment !== "all") {
        filtered = filtered.filter((project) => {
          return project.department === filterDepartment;
        });
      }

      // Apply project manager filter
      if (filterManager && filterManager !== "all") {
        filtered = filtered.filter((p) => p.project_manager === filterManager);
      }

      // Apply status filter
      if (filterStatus && filterStatus !== "all") {
        filtered = filtered.filter((p) => p.status === filterStatus);
      }

      setFilteredProjects(filtered);
      setLoading(false);
    };

    loadProjects();
  }, [filterManager, filterStatus, filterDepartment, user?.id]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-semibold">Your Projects</h2>
            <Button variant="outline" size="sm" disabled>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Export to Excel
            </Button>
          </div>
          <Button disabled>
            <Plus className="w-4 h-4 mr-2" /> New Project
          </Button>
        </div>
        <ProjectListSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-semibold">Your Projects</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              try {
                setExporting(true);
                await new Promise((resolve) => setTimeout(resolve, 100)); // Let UI update
                const username =
                  profile.full_name || user?.email?.split("@")[0] || "user";
                await exportProjectsToExcel(filteredProjects, username);
                toast({
                  title: "Export Successful",
                  description:
                    "The Excel file has been generated and downloaded.",
                  className: "bg-green-50 border-green-200",
                });
              } catch (error) {
                toast({
                  title: "Export Failed",
                  description: "There was an error generating the Excel file.",
                  variant: "destructive",
                });
              } finally {
                setExporting(false);
              }
            }}
            disabled={filteredProjects.length === 0 || exporting}
            className="flex items-center gap-2"
          >
            {exporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="h-4 w-4" />
            )}
            {exporting ? "Generating..." : "Export to Excel"}
          </Button>
        </div>
        <Button
          onClick={onCreateNew}
          className="bg-purple-500 hover:bg-purple-600 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
        >
          <Plus className="w-4 h-4 mr-2" /> New Project
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProjects.map((project) => (
          <Card
            key={project.id}
            onClick={() => onSelectProject(project)}
            className="group p-6 cursor-pointer bg-card/50 backdrop-blur-sm border border-border/10 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 relative overflow-hidden"
            style={{
              background:
                "linear-gradient(to bottom right, hsl(var(--card)), hsl(var(--card)))",
              borderRadius: "1rem",
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-semibold">{project.title}</h3>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium shadow-sm ${
                    {
                      active:
                        "bg-green-100 text-green-800 border border-green-200",
                      on_hold:
                        "bg-yellow-100 text-yellow-800 border border-yellow-200",
                      completed:
                        "bg-blue-100 text-blue-800 border border-blue-200",
                      cancelled:
                        "bg-red-100 text-red-800 border border-red-200",
                      draft:
                        "bg-yellow-100 text-yellow-800 border border-yellow-200",
                    }[project.status || "active"]
                  }`}
                >
                  {project.status?.replace("_", " ").charAt(0).toUpperCase() +
                    project.status?.slice(1).replace("_", " ") || "Active"}
                </span>
              </div>
              {project.description && (
                <p className="text-sm text-blue-800 mb-3 line-clamp-2">
                  {project.description}
                </p>
              )}
              <p className="text-sm text-blue-800 mb-4">
                Project Manager: {project.project_manager}
              </p>
              {project.department && (
                <p className="text-xs text-blue-600">
                  Department: {project.department}
                </p>
              )}
            </div>
          </Card>
        ))}

        {filteredProjects.length === 0 && (
          <div className="col-span-full text-center py-8 text-blue-800">
            No projects yet. Click "New Project" to create one.
          </div>
        )}
      </div>
      <Toaster />
    </div>
  );
};

export default ProjectList;
