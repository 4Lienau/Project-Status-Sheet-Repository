import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { projectService } from "@/lib/services/project";
import type { Project } from "@/lib/services/project";

interface ProjectListProps {
  onSelectProject: (project: Project) => void;
  onCreateNew: () => void;
}

const ProjectList = ({ onSelectProject, onCreateNew }: ProjectListProps) => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProjects = async () => {
      const projects = await projectService.getAllProjects();
      setProjects(projects);
      setLoading(false);
    };

    loadProjects();
  }, []);

  if (loading) {
    return <div>Loading projects...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-semibold">Your Projects</h2>
        <Button
          onClick={onCreateNew}
          className="bg-purple-500 hover:bg-purple-600 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
        >
          <Plus className="w-4 h-4 mr-2" /> New Project
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project) => (
          <Card
            key={project.id}
            onClick={() => onSelectProject(project)}
            className="group p-6 cursor-pointer bg-card border border-border/40 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 relative overflow-hidden"
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
            </div>
          </Card>
        ))}

        {projects.length === 0 && (
          <div className="col-span-full text-center py-8 text-blue-800">
            No projects yet. Click "New Project" to create one.
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectList;
