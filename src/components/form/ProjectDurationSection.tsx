import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Info, Calendar, Clock, AlertTriangle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  calculateTimeRemainingPercentage,
  getTimeRemainingDescription,
} from "@/lib/services/project";
import { SectionHeader } from "./SectionHeader";

interface ProjectDurationSectionProps {
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
}

const ProjectDurationSection: React.FC<ProjectDurationSectionProps> = ({
  formData,
  setFormData,
}) => {
  // Don't show duration section for completed projects
  if (formData.status === "completed") {
    return (
      <TooltipProvider>
        <SectionHeader
          title="Project Duration"
          tooltip="Project duration information based on milestone dates."
        />
        <div className="space-y-4 bg-card/80 backdrop-blur-sm rounded-xl p-4 border border-border shadow-sm">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-green-800">
              <Calendar className="h-5 w-5" />
              <span className="font-semibold">Project Completed</span>
            </div>
            <p className="text-green-700 mt-2">
              This project has been marked as completed. Duration calculations
              and time-based warnings are no longer active.
            </p>
            {formData.calculated_start_date && formData.calculated_end_date && (
              <div className="mt-3 text-sm text-green-600">
                <div>
                  Project Duration: {formData.calculated_start_date} to{" "}
                  {formData.calculated_end_date}
                </div>
                {formData.total_days && (
                  <div>
                    Total Duration: {formData.total_days} days (
                    {formData.working_days || 0} working days)
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </TooltipProvider>
    );
  }

  // For non-completed projects, show full duration information
  const timeRemainingPercentage = calculateTimeRemainingPercentage(formData);
  const timeRemainingDescription = getTimeRemainingDescription(formData);

  // Determine if we should show warnings
  const showWarnings =
    formData.status !== "completed" && formData.status !== "cancelled";
  const isOverdue =
    timeRemainingPercentage === 0 && formData.total_days_remaining < 0;
  const isAtRisk =
    timeRemainingPercentage !== null &&
    timeRemainingPercentage < 20 &&
    !isOverdue;

  return (
    <TooltipProvider>
      <SectionHeader
        title="Project Duration"
        tooltip="Set the start and end dates for your project. The system will calculate the total duration and remaining time."
      />
      <div className="space-y-4 bg-card/80 backdrop-blur-sm rounded-xl p-4 border border-border shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Start Date */}
          <div className="space-y-2">
            <Label htmlFor="start_date" className="text-foreground">
              Start Date
            </Label>
            <Input
              id="start_date"
              type="date"
              value={formData.start_date || ""}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  start_date: e.target.value,
                }))
              }
              className="bg-card border-border text-foreground"
            />
          </div>

          {/* End Date */}
          <div className="space-y-2">
            <Label htmlFor="end_date" className="text-foreground">
              End Date
            </Label>
            <Input
              id="end_date"
              type="date"
              value={formData.end_date || ""}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  end_date: e.target.value,
                }))
              }
              className="bg-card border-border text-foreground"
            />
          </div>
        </div>

        {/* Duration Summary */}
        {formData.start_date && formData.end_date && (
          <div className="bg-muted/50 rounded-lg p-4 border border-border">
            <h4 className="font-medium text-foreground mb-2">Duration Summary</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Total Duration:</span>
                <span className="ml-2 font-medium text-foreground">
                  {formData.start_date && formData.end_date
                    ? calculateDuration(formData.start_date, formData.end_date)
                    : "Not calculated"}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Remaining:</span>
                <span className="ml-2 font-medium text-foreground">
                  {timeRemainingDescription}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
};

// Helper function to calculate duration
function calculateDuration(startDate: string, endDate: string): string {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return `${diffDays} days`;
}

export default ProjectDurationSection;