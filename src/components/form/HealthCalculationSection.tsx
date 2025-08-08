import React, { useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Info, RefreshCw } from "lucide-react";
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
  calculateTimeRemainingPercentage,
  getTimeRemainingTooltipText,
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
          reasoning = `${weightedCompletion}% completion with ${timeRemainingPercentage}% time remaining (${timeDesc}) - set to ${calculatedColor.toUpperCase()}.`;
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

    return {
      color: calculatedColor,
      percentage,
      reasoning,
      timeRemainingPercentage,
    };
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

  return (
    <TooltipProvider>
      <div className="space-y-4 bg-white/80 backdrop-blur-sm rounded-md p-4 border border-gray-100 shadow-sm">
        <div className="flex items-center gap-1 mb-4">
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
                milestone completion percentages, while Manual allows you to set
                a specific percentage.
              </p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Current Health Status Display */}
        <div className="bg-gray-50 rounded-md p-3 border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1">
              <Label className="text-sm font-medium text-gray-700">
                Current Health Status
              </Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-4xl">
                  <div className="text-xs space-y-2">
                    <div className="font-semibold">
                      Time-Aware Health Calculation Rules:
                    </div>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Completed projects = GREEN (100%)</li>
                      <li>Cancelled projects = RED (0%)</li>
                      <li>Draft/On Hold projects = YELLOW</li>
                      <li className="font-medium">
                        Active projects with time awareness:
                      </li>
                      <li className="ml-4">
                        • Overdue: Strict thresholds (≥90% = YELLOW, &lt;90% =
                        RED)
                      </li>
                      <li className="ml-4">
                        • Substantial time (&gt;60% remaining): Very lenient
                        (≥10% = GREEN, 5-9% = YELLOW, &lt;5% = RED)
                      </li>
                      <li className="ml-4">
                        • Plenty of time (30-60% remaining): Lenient (≥20% =
                        GREEN, 10-19% = YELLOW, &lt;10% = RED)
                      </li>
                      <li className="ml-4">
                        • Moderate time (15-30% remaining): Balanced (≥40% =
                        GREEN, 25-39% = YELLOW, &lt;25% = RED)
                      </li>
                      <li className="ml-4">
                        • Little time (&lt;15% remaining): Strict (≥80% = GREEN,
                        60-79% = YELLOW, &lt;60% = RED)
                      </li>
                      <li className="ml-4">
                        • No time data: Original thresholds (≥70% = GREEN,
                        40-69% = YELLOW, &lt;40% = RED)
                      </li>
                      <li>
                        Manual override uses your specified color and percentage
                      </li>
                    </ul>
                  </div>
                </TooltipContent>
              </Tooltip>
            </div>
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
          {(() => {
            // Check if we need to show explanation for time remaining percentage over 100%
            const timeRemainingPercentage =
              currentHealthStatus.timeRemainingPercentage;
            const explanationText =
              timeRemainingPercentage && timeRemainingPercentage > 100
                ? getTimeRemainingTooltipText(formData, timeRemainingPercentage)
                : null;

            // Add asterisk to reasoning if percentage is over 100%
            const reasoningWithAsterisk = explanationText
              ? currentHealthStatus.reasoning.replace(
                  new RegExp(`${timeRemainingPercentage}% time remaining`),
                  `${timeRemainingPercentage}% time remaining*`,
                )
              : currentHealthStatus.reasoning;

            return (
              <div className="space-y-2">
                <p className="text-xs text-gray-600 leading-relaxed">
                  {reasoningWithAsterisk}
                </p>
                {explanationText && (
                  <p className="text-xs text-orange-700 bg-orange-50 border border-orange-200 rounded-md p-2 leading-relaxed">
                    <span className="font-medium">* </span>
                    {explanationText}
                  </p>
                )}
              </div>
            );
          })()}
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
    </TooltipProvider>
  );
};

export default HealthCalculationSection;
