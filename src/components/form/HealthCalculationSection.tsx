import React, { useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Info, Calendar, Clock, RefreshCw } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  calculateProjectHealthStatusColor,
  calculateWeightedCompletion,
  updateProjectComputedStatusColor,
} from "@/lib/services/project";

interface HealthCalculationSectionProps {
  formData: any;
  setFormData: (updater: (prev: any) => any) => void;
}

const HealthCalculationSection: React.FC<HealthCalculationSectionProps> = ({
  formData,
  setFormData,
}) => {
  // Calculate current health status using the standardized function
  const currentHealthStatus = useMemo(() => {
    if (!formData)
      return { color: "green", percentage: 0, reasoning: "No data available" };

    const projectData = {
      ...formData,
      milestones: formData.milestones || [],
    };

    const calculatedColor = calculateProjectHealthStatusColor(projectData);
    const weightedCompletion =
      formData.milestones?.length > 0
        ? calculateWeightedCompletion(formData.milestones)
        : 0;

    // Calculate time remaining percentage for reasoning
    let timeRemainingPercentage: number | null = null;
    if (
      formData.total_days &&
      formData.total_days_remaining !== null &&
      formData.total_days_remaining !== undefined
    ) {
      const totalDays = formData.total_days;
      const remainingDays = formData.total_days_remaining;

      if (remainingDays < 0) {
        timeRemainingPercentage = 0;
      } else {
        timeRemainingPercentage = Math.round((remainingDays / totalDays) * 100);
      }
    }

    let percentage = 0;
    let reasoning = "";

    if (
      formData.health_calculation_type === "manual" &&
      formData.manual_status_color
    ) {
      percentage = formData.manual_health_percentage || 0;
      reasoning = `Manual override: Set to ${formData.manual_status_color.toUpperCase()} with ${percentage}% completion.`;
    } else if (formData.status === "completed") {
      percentage = 100;
      reasoning =
        "Project status is COMPLETED - automatically set to GREEN (100%).";
    } else if (formData.status === "cancelled") {
      percentage = 0;
      reasoning =
        "Project status is CANCELLED - automatically set to RED (0%).";
    } else if (formData.status === "draft" || formData.status === "on_hold") {
      percentage = weightedCompletion;
      reasoning = `Project status is ${formData.status?.toUpperCase()} - automatically set to YELLOW (${percentage}%).`;
    } else if (formData.milestones?.length > 0) {
      percentage = weightedCompletion;

      // Time-aware reasoning
      if (timeRemainingPercentage === null) {
        // No time data available, use milestone-only logic
        if (weightedCompletion >= 70) {
          reasoning = `Milestone completion is ${weightedCompletion}% (≥70%) - set to GREEN (On Track).`;
        } else if (weightedCompletion >= 40) {
          reasoning = `Milestone completion is ${weightedCompletion}% (40-69%) - set to YELLOW (At Risk).`;
        } else {
          reasoning = `Milestone completion is ${weightedCompletion}% (<40%) - set to RED (Critical).`;
        }
      } else {
        // Time-aware logic
        const timeDesc =
          timeRemainingPercentage === 0
            ? "overdue"
            : timeRemainingPercentage > 40
              ? "plenty of time"
              : timeRemainingPercentage > 15
                ? "moderate time"
                : "little time";

        if (timeRemainingPercentage === 0) {
          reasoning = `Project is OVERDUE with ${weightedCompletion}% completion - set to ${calculatedColor.toUpperCase()} (Critical/At Risk).`;
        } else if (timeRemainingPercentage > 40) {
          reasoning = `${weightedCompletion}% completion with ${timeRemainingPercentage}% time remaining (${timeDesc}) - set to ${calculatedColor.toUpperCase()}. More lenient thresholds applied due to ample time.`;
        } else if (timeRemainingPercentage > 15) {
          reasoning = `${weightedCompletion}% completion with ${timeRemainingPercentage}% time remaining (${timeDesc}) - set to ${calculatedColor.toUpperCase()}. Balanced approach considering time and progress.`;
        } else {
          reasoning = `${weightedCompletion}% completion with ${timeRemainingPercentage}% time remaining (${timeDesc}) - set to ${calculatedColor.toUpperCase()}. Stricter thresholds due to approaching deadline.`;
        }
      }
    } else {
      percentage = 0;
      reasoning =
        "No milestones defined - defaulting to GREEN (On Track) for active projects.";
    }

    return { color: calculatedColor, percentage, reasoning };
  }, [formData]);

  // Function to refresh computed status color in database
  const handleRefreshComputedStatus = async () => {
    if (formData?.id) {
      console.log(
        "[HEALTH_CALC] Refreshing computed status color for project:",
        formData.id,
      );
      const success = await updateProjectComputedStatusColor(formData.id);
      if (success) {
        console.log(
          "[HEALTH_CALC] Successfully refreshed computed status color",
        );
      } else {
        console.error("[HEALTH_CALC] Failed to refresh computed status color");
      }
    }
  };
  // Format duration display
  const formatDuration = (days: number | null) => {
    if (days === null || days === undefined) return "Not calculated";
    if (days === 0) return "0 days";
    if (days === 1) return "1 day";
    return `${days} days`;
  };

  // Format remaining duration display with special handling for overdue projects
  const formatRemainingDuration = (days: number | null) => {
    if (days === null || days === undefined) return "Not calculated";
    if (days < 0) {
      const overdueDays = Math.abs(days);
      if (overdueDays === 1) return "1 day overdue";
      return `${overdueDays} days overdue`;
    }
    if (days === 0) return "Due today";
    if (days === 1) return "1 day remaining";
    return `${days} days remaining`;
  };

  // Format date range display
  const formatDateRange = () => {
    const startDate = formData.calculated_start_date;
    const endDate = formData.calculated_end_date;

    if (!startDate || !endDate) return "Not calculated";

    const formatDate = (dateStr: string) => {
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    };

    return `${formatDate(startDate)} - ${formatDate(endDate)}`;
  };

  return (
    <TooltipProvider>
      <div className="space-y-4 bg-white/80 backdrop-blur-sm rounded-md p-4 border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-1">
            <h3 className="text-2xl font-bold text-blue-800">
              Health Calculation
            </h3>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">
                  Choose how project health is calculated. Automatic uses
                  milestone completion percentages, while Manual allows you to
                  set a specific percentage.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRefreshComputedStatus}
            className="flex items-center gap-1 text-xs"
          >
            <RefreshCw className="h-3 w-3" />
            Sync Status
          </Button>
        </div>

        {/* Current Health Status Display */}
        <div className="bg-gray-50 rounded-md p-3 border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <Label className="text-sm font-medium text-gray-700">
              Current Health Status
            </Label>
            <Badge
              className={`text-xs font-medium ${
                currentHealthStatus.color === "green"
                  ? "bg-green-100 text-green-800 border-green-200"
                  : currentHealthStatus.color === "yellow"
                    ? "bg-yellow-100 text-yellow-800 border-yellow-200"
                    : "bg-red-100 text-red-800 border-red-200"
              }`}
            >
              {currentHealthStatus.color.toUpperCase()} (
              {currentHealthStatus.percentage}%)
            </Badge>
          </div>
          <p className="text-xs text-gray-600 leading-relaxed">
            {currentHealthStatus.reasoning}
          </p>
          <div className="mt-2 text-xs text-gray-500">
            <strong>Time-Aware Health Calculation Rules:</strong>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>Completed projects = GREEN (100%)</li>
              <li>Cancelled projects = RED (0%)</li>
              <li>Draft/On Hold projects = YELLOW</li>
              <li>
                <strong>
                  Active projects with time awareness (Lenient Mode):
                </strong>
              </li>
              <li className="ml-4">
                • Overdue: Strict thresholds (≥90% = YELLOW, &lt;90% = RED)
              </li>
              <li className="ml-4">
                • Substantial time (&gt;60% remaining): Very lenient (≥10% =
                GREEN, 5-9% = YELLOW, &lt;5% = RED)
              </li>
              <li className="ml-4">
                • Plenty of time (30-60% remaining): Lenient (≥20% = GREEN,
                10-19% = YELLOW, &lt;10% = RED)
              </li>
              <li className="ml-4">
                • Moderate time (15-30% remaining): Balanced (≥40% = GREEN,
                25-39% = YELLOW, &lt;25% = RED)
              </li>
              <li className="ml-4">
                • Little time (&lt;15% remaining): Strict (≥80% = GREEN, 60-79%
                = YELLOW, &lt;60% = RED)
              </li>
              <li className="ml-4">
                • No time data: Original thresholds (≥70% = GREEN, 40-69% =
                YELLOW, &lt;40% = RED)
              </li>
              <li>Manual override uses your specified color and percentage</li>
            </ul>
          </div>
        </div>
        <Select
          value={formData.health_calculation_type}
          onValueChange={(value: any) =>
            setFormData((prev) => ({
              ...prev,
              health_calculation_type: value,
            }))
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select calculation type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="automatic">Automatic</SelectItem>
            <SelectItem value="manual">Manual</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Health Status Section - Only show when manual calculation is selected */}
      {formData.health_calculation_type === "manual" && (
        <div className="space-y-4 bg-white/80 backdrop-blur-sm rounded-md p-4 border border-gray-100 shadow-sm mt-4">
          <div className="flex items-center gap-1 mb-4">
            <h3 className="text-2xl font-bold text-blue-800">Health Status</h3>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">
                  Set the health percentage and status color for the project.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-1">
                <Label htmlFor="manual_health_percentage">
                  Health Percentage
                </Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">
                      Enter a percentage (0-100) to manually set the project
                      health. This is only used when Health Calculation is set
                      to Manual.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Input
                id="manual_health_percentage"
                type="number"
                min="0"
                max="100"
                value={formData.manual_health_percentage}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    manual_health_percentage: Number(e.target.value),
                  }))
                }
                className="bg-white/50 backdrop-blur-sm border-gray-200/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="manual_status_color">Status Color</Label>
              <Select
                value={formData.manual_status_color}
                onValueChange={(value: "red" | "yellow" | "green") => {
                  console.log("Setting manual_status_color to:", value);
                  setFormData((prev) => ({
                    ...prev,
                    manual_status_color: value,
                  }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select color" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="green">Green</SelectItem>
                  <SelectItem value="yellow">Yellow</SelectItem>
                  <SelectItem value="red">Red</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}

      {/* Project Duration Section */}
      <div className="space-y-4 bg-white/80 backdrop-blur-sm rounded-md p-4 border border-gray-100 shadow-sm mt-4">
        <div className="flex items-center gap-1 mb-4">
          <h3 className="text-2xl font-bold text-blue-800">Project Duration</h3>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-4 w-4 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs">
                Project duration is automatically calculated based on milestone
                dates. Total days includes weekends, while working days excludes
                weekends.
              </p>
            </TooltipContent>
          </Tooltip>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-600" />
              <Label className="text-sm font-medium text-gray-700">
                Total Duration
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-sm px-3 py-1">
                {formatDuration(formData.total_days)}
              </Badge>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-green-600" />
              <Label className="text-sm font-medium text-gray-700">
                Working Days
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-sm px-3 py-1">
                {formatDuration(formData.working_days)}
              </Badge>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-orange-600" />
              <Label className="text-sm font-medium text-gray-700">
                Total Days Remaining
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={`text-sm px-3 py-1 ${
                  formData.total_days_remaining !== null &&
                  formData.total_days_remaining < 0
                    ? "border-red-300 text-red-700 bg-red-50"
                    : formData.total_days_remaining !== null &&
                        formData.total_days_remaining <= 7
                      ? "border-yellow-300 text-yellow-700 bg-yellow-50"
                      : "border-green-300 text-green-700 bg-green-50"
                }`}
              >
                {formatRemainingDuration(formData.total_days_remaining)}
              </Badge>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-purple-600" />
              <Label className="text-sm font-medium text-gray-700">
                Working Days Remaining
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={`text-sm px-3 py-1 ${
                  formData.working_days_remaining !== null &&
                  formData.working_days_remaining < 0
                    ? "border-red-300 text-red-700 bg-red-50"
                    : formData.working_days_remaining !== null &&
                        formData.working_days_remaining <= 5
                      ? "border-yellow-300 text-yellow-700 bg-yellow-50"
                      : "border-green-300 text-green-700 bg-green-50"
                }`}
              >
                {formatRemainingDuration(formData.working_days_remaining)}
              </Badge>
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <Label className="text-sm font-medium text-gray-700">
              Project Timeline
            </Label>
          </div>
          <div className="text-sm text-gray-600">{formatDateRange()}</div>
        </div>

        {!formData.total_days && !formData.working_days && (
          <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-yellow-600" />
              <span className="text-sm text-yellow-800">
                Duration and remaining days will be calculated automatically
                when milestones with dates are added.
              </span>
            </div>
          </div>
        )}

        {formData.total_days_remaining !== null &&
          formData.total_days_remaining < 0 && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-red-600" />
                <span className="text-sm text-red-800">
                  This project is overdue. Consider updating milestone dates or
                  project status.
                </span>
              </div>
            </div>
          )}

        {formData.total_days_remaining !== null &&
          formData.total_days_remaining >= 0 &&
          formData.total_days_remaining <= 7 && (
            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-yellow-600" />
                <span className="text-sm text-yellow-800">
                  This project is due soon. Please ensure all tasks are on
                  track.
                </span>
              </div>
            </div>
          )}
      </div>
    </TooltipProvider>
  );
};

export default HealthCalculationSection;
