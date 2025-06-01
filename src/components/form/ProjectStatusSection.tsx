import React from "react";
import { Label } from "@/components/ui/label";
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import DepartmentSelect from "@/components/DepartmentSelect";

interface ProjectStatusSectionProps {
  formData: any;
  setFormData: (updater: (prev: any) => any) => void;
}

const ProjectStatusSection: React.FC<ProjectStatusSectionProps> = ({
  formData,
  setFormData,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-gray-100 shadow-sm">
      <div className="space-y-2">
        <div className="flex items-center gap-1 mb-4">
          <h3 className="text-xl font-bold text-blue-800">Project Status</h3>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-4 w-4 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs">
                Select the current status of your project. You may select
                Active, On Hold, Completed, Cancelled, or Draft.
              </p>
            </TooltipContent>
          </Tooltip>
        </div>
        <Select
          value={formData.status}
          onValueChange={(value: any) =>
            setFormData((prev) => ({ ...prev, status: value }))
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="on_hold">On Hold</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-1 mb-4">
          <h3 className="text-xl font-bold text-blue-800">Department</h3>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-4 w-4 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs">
                Select the department this project belongs to. Only users in
                this department will be able to see this project.
              </p>
            </TooltipContent>
          </Tooltip>
        </div>
        <DepartmentSelect
          value={formData.department || ""}
          onValueChange={(value) =>
            setFormData((prev) => ({ ...prev, department: value }))
          }
        />
      </div>
    </div>
  );
};

export default ProjectStatusSection;
