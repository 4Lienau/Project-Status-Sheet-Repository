import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { projectService } from "@/lib/services/project";
import type { Project } from "@/lib/services/project";

interface ProjectListProps {
  onSelectProject: (project: Project) => void;
  onCreateNew: () => void;
}

const ProjectList = ({ onSelectProject, onCreateNew }: ProjectListProps) => {
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
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Your Projects</h2>
        <Button onClick={onCreateNew}>
          <Plus className="w-4 h-4 mr-2" /> New Project
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((project) => (
          <Card
            key={project.id}
            className="p-4 cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => onSelectProject(project)}
          >
            <h3 className="font-semibold mb-2">{project.title}</h3>
            <p className="text-sm text-gray-500">
              Project Manager: {project.project_manager}
            </p>
          </Card>
        ))}

        {projects.length === 0 && (
          <div className="col-span-full text-center py-8 text-gray-500">
            No projects yet. Click "New Project" to create one.
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectList;
