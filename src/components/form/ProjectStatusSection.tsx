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
import { TooltipProvider } from "@/components/ui/tooltip";
import { SectionHeader } from "@/components/form/SectionHeader";

interface ProjectStatusSectionProps {
  formData: any;
  setFormData: (updater: (prev: any) => any) => void;
}

const ProjectStatusSection: React.FC<ProjectStatusSectionProps> = ({
  formData,
  setFormData,
}) => {
  return (
    <TooltipProvider>
      <SectionHeader
        title="Project Status"
        tooltip="Set the current status of the project and configure health indicators."
      />
      <div className="space-y-4 bg-card/80 backdrop-blur-sm rounded-xl p-4 border-4 border-border shadow-lg">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="status" className="text-foreground">
              Status
            </Label>
            <Select
              value={formData.status}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, status: value }))
              }
            >
              <SelectTrigger className="bg-card border-border text-foreground">
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

          {/* Health Status */}
          <div className="space-y-2">
            <Label htmlFor="manual_status_color" className="text-foreground">
              Health Status
            </Label>
            <Select
              value={formData.manual_status_color || "green"}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, manual_status_color: value }))
              }
            >
              <SelectTrigger className="bg-card border-border text-foreground">
                <SelectValue placeholder="Select health status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="green">Green (On Track)</SelectItem>
                <SelectItem value="yellow">Yellow (At Risk)</SelectItem>
                <SelectItem value="red">Red (Critical)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default ProjectStatusSection;