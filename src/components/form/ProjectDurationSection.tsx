import React, { useEffect, useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Info, Calendar, Clock, AlertTriangle, Lock, Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  setFormData: (updater: (prev: any) => any) => void;
}

const ProjectDurationSection: React.FC<ProjectDurationSectionProps> = ({
  formData,
  setFormData,
}) => {
  // Calculate auto-populated dates from milestones
  // Start date = earliest milestone date
  // End date = latest milestone end_date (or date if no end_date)
  const autoCalculatedDates = useMemo(() => {
    if (!formData.milestones || formData.milestones.length === 0) {
      return { startDate: null, endDate: null };
    }

    // Get start dates (milestone start dates)
    const startDates = formData.milestones
      .map((m: any) => new Date(m.date))
      .filter((date: Date) => !isNaN(date.getTime()))
      .sort((a: Date, b: Date) => a.getTime() - b.getTime());

    // Get end dates (use end_date if available, otherwise fall back to date)
    const endDates = formData.milestones
      .map((m: any) => new Date(m.end_date || m.date))
      .filter((date: Date) => !isNaN(date.getTime()))
      .sort((a: Date, b: Date) => a.getTime() - b.getTime());

    if (startDates.length === 0) {
      return { startDate: null, endDate: null };
    }

    return {
      startDate: startDates[0].toISOString().split("T")[0],
      endDate: endDates[endDates.length - 1].toISOString().split("T")[0],
    };
  }, [formData.milestones]);

  // Auto-populate dates when milestones change (only if not overridden)
  useEffect(() => {
    if (!formData.datesOverridden && autoCalculatedDates.startDate && autoCalculatedDates.endDate) {
      // Only update if the dates are actually different to avoid unnecessary re-renders
      const needsUpdate = 
        formData.start_date !== autoCalculatedDates.startDate ||
        formData.end_date !== autoCalculatedDates.endDate;
      
      if (needsUpdate) {
        setFormData((prev: any) => ({
          ...prev,
          start_date: autoCalculatedDates.startDate,
          end_date: autoCalculatedDates.endDate,
        }));
      }
    }
  }, [autoCalculatedDates, formData.datesOverridden, formData.start_date, formData.end_date, setFormData]);

  // Toggle override mode
  const toggleOverride = () => {
    if (formData.datesOverridden) {
      // Switching back to auto mode - restore calculated dates
      setFormData((prev: any) => ({
        ...prev,
        datesOverridden: false,
        start_date: autoCalculatedDates.startDate || "",
        end_date: autoCalculatedDates.endDate || "",
      }));
    } else {
      // Switching to manual mode
      setFormData((prev: any) => ({
        ...prev,
        datesOverridden: true,
      }));
    }
  };

  // Don't show duration section for completed projects
  if (formData.status === "completed") {
    return (
      <TooltipProvider>
        <SectionHeader
          title="Project Duration"
          tooltip="Project duration information based on milestone dates."
        />
        <div className="space-y-4 bg-card/80 backdrop-blur-sm rounded-xl p-4 border-2 border-border shadow-sm">
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

  const isAutoMode = !formData.datesOverridden;

  return (
    <TooltipProvider>
      <SectionHeader
        title="Project Duration"
        tooltip="Start and end dates are automatically calculated from milestone dates. You can override them manually if needed."
      />
      <div className="space-y-4 bg-card/80 backdrop-blur-sm rounded-xl p-4 border-4 border-border shadow-lg">
        {/* Auto/Manual Toggle */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {isAutoMode ? (
              <>
                <Lock className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                  Auto-calculated from milestones
                </span>
              </>
            ) : (
              <>
                <Unlock className="h-4 w-4 text-orange-500" />
                <span className="text-sm font-medium text-orange-600 dark:text-orange-400">
                  Manual override enabled
                </span>
              </>
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={toggleOverride}
            className="text-xs"
          >
            {isAutoMode ? "Enable Manual Override" : "Use Auto-calculated Dates"}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Start Date */}
          <div className="space-y-2">
            <Label htmlFor="start_date" className="text-foreground flex items-center gap-2">
              Start Date
              {isAutoMode && autoCalculatedDates.startDate && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3 w-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Auto-calculated from earliest milestone</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </Label>
            <Input
              id="start_date"
              type="date"
              value={formData.start_date || ""}
              onChange={(e) =>
                setFormData((prev: any) => ({
                  ...prev,
                  start_date: e.target.value,
                }))
              }
              disabled={isAutoMode}
              className={`bg-card border-border text-foreground ${
                isAutoMode ? "opacity-60 cursor-not-allowed" : ""
              }`}
            />
          </div>

          {/* End Date */}
          <div className="space-y-2">
            <Label htmlFor="end_date" className="text-foreground flex items-center gap-2">
              End Date
              {isAutoMode && autoCalculatedDates.endDate && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3 w-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Auto-calculated from latest milestone</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </Label>
            <Input
              id="end_date"
              type="date"
              value={formData.end_date || ""}
              onChange={(e) =>
                setFormData((prev: any) => ({
                  ...prev,
                  end_date: e.target.value,
                }))
              }
              disabled={isAutoMode}
              className={`bg-card border-border text-foreground ${
                isAutoMode ? "opacity-60 cursor-not-allowed" : ""
              }`}
            />
          </div>
        </div>

        {/* Duration Summary */}
        {formData.start_date && formData.end_date && (
          <div className="bg-muted/50 rounded-lg p-4 border border-border">
            <h4 className="font-medium text-foreground mb-2">Duration Summary</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Total Days:</span>
                <span className="ml-2 font-medium text-foreground">
                  {formData.total_days || calculateTotalDays(formData.start_date, formData.end_date)} days
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Working Days (Total):</span>
                <span className="ml-2 font-medium text-foreground">
                  {formData.working_days || calculateWorkingDays(formData.start_date, formData.end_date)} days
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Days Remaining:</span>
                <span className="ml-2 font-medium text-foreground">
                  {formData.total_days_remaining !== undefined 
                    ? `${formData.total_days_remaining} days` 
                    : "Not calculated"}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Working Days Remaining:</span>
                <span className="ml-2 font-medium text-foreground">
                  {formData.working_days_remaining !== undefined 
                    ? `${formData.working_days_remaining} days` 
                    : "Not calculated"}
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

// Helper function to calculate total days
function calculateTotalDays(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

// Helper function to calculate working days (excluding weekends)
function calculateWorkingDays(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  let workingDays = 0;
  
  const currentDate = new Date(start);
  while (currentDate <= end) {
    const dayOfWeek = currentDate.getDay();
    // 0 = Sunday, 6 = Saturday
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      workingDays++;
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return workingDays;
}

export default ProjectDurationSection;