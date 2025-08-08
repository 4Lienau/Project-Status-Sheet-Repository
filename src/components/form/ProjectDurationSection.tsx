import React from "react";
import { Label } from "@/components/ui/label";
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

interface ProjectDurationSectionProps {
  formData: any;
}

const ProjectDurationSection: React.FC<ProjectDurationSectionProps> = ({
  formData,
}) => {
  // Don't show duration section for completed projects
  if (formData.status === "completed") {
    return (
      <TooltipProvider>
        <div className="space-y-4 bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-1">
              <h3 className="text-2xl font-bold text-blue-800">
                Project Duration
              </h3>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">
                    Project duration information based on milestone dates.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>

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
      <div className="space-y-4 bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-1">
            <h3 className="text-2xl font-bold text-blue-800">
              Project Duration
            </h3>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">
                  Project duration information based on milestone dates. Shows
                  total duration, time remaining, and potential scheduling
                  risks.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Duration Information Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Start Date */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center gap-2 text-blue-800 mb-1">
              <Calendar className="h-4 w-4" />
              <span className="font-semibold text-sm">Start Date</span>
            </div>
            <div className="text-blue-900 font-medium">
              {formData.calculated_start_date
                ? new Date(formData.calculated_start_date).toLocaleDateString()
                : "Not calculated"}
            </div>
          </div>

          {/* End Date */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center gap-2 text-blue-800 mb-1">
              <Calendar className="h-4 w-4" />
              <span className="font-semibold text-sm">End Date</span>
            </div>
            <div className="text-blue-900 font-medium">
              {formData.calculated_end_date
                ? new Date(formData.calculated_end_date).toLocaleDateString()
                : "Not calculated"}
            </div>
          </div>

          {/* Total Duration */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <div className="flex items-center gap-2 text-gray-800 mb-1">
              <Clock className="h-4 w-4" />
              <span className="font-semibold text-sm">Total Duration</span>
            </div>
            <div className="text-gray-900 font-medium">
              {formData.total_days
                ? `${formData.total_days} days`
                : "Not calculated"}
            </div>
            {formData.working_days && (
              <div className="text-xs text-gray-600 mt-1">
                ({formData.working_days} working days)
              </div>
            )}
          </div>

          {/* Time Remaining */}
          <div
            className={`border rounded-lg p-3 ${
              isOverdue
                ? "bg-red-50 border-red-200"
                : isAtRisk
                  ? "bg-yellow-50 border-yellow-200"
                  : "bg-green-50 border-green-200"
            }`}
          >
            <div
              className={`flex items-center gap-2 mb-1 ${
                isOverdue
                  ? "text-red-800"
                  : isAtRisk
                    ? "text-yellow-800"
                    : "text-green-800"
              }`}
            >
              <Clock className="h-4 w-4" />
              <span className="font-semibold text-sm">Time Remaining</span>
            </div>
            <div
              className={`font-medium ${
                isOverdue
                  ? "text-red-900"
                  : isAtRisk
                    ? "text-yellow-900"
                    : "text-green-900"
              }`}
            >
              {timeRemainingDescription}
            </div>
            {timeRemainingPercentage !== null && (
              <div className="text-xs mt-1 opacity-75">
                {timeRemainingPercentage}% of duration remaining
              </div>
            )}
          </div>
        </div>

        {/* Warnings Section - Only show for active projects */}
        {showWarnings && (isOverdue || isAtRisk) && (
          <div
            className={`border rounded-lg p-4 ${
              isOverdue
                ? "bg-red-50 border-red-200"
                : "bg-yellow-50 border-yellow-200"
            }`}
          >
            <div
              className={`flex items-center gap-2 mb-2 ${
                isOverdue ? "text-red-800" : "text-yellow-800"
              }`}
            >
              <AlertTriangle className="h-5 w-5" />
              <span className="font-semibold">
                {isOverdue ? "Project Overdue" : "Schedule Risk"}
              </span>
            </div>
            <div
              className={`text-sm ${
                isOverdue ? "text-red-700" : "text-yellow-700"
              }`}
            >
              {isOverdue
                ? "This project has passed its scheduled end date. Consider updating milestones or project status."
                : "This project has limited time remaining. Monitor progress closely and consider adjusting timelines if needed."}
            </div>
          </div>
        )}

        {/* No Duration Data Message */}
        {!formData.calculated_start_date && !formData.calculated_end_date && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-600 mb-2">
              <Info className="h-5 w-5" />
              <span className="font-semibold">No Duration Data</span>
            </div>
            <div className="text-sm text-gray-600">
              Duration information will be calculated automatically based on
              milestone dates. Add milestones with dates to see project timeline
              information.
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
};

export default ProjectDurationSection;
