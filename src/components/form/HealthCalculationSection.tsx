import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Info, Calendar, Clock } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";

interface HealthCalculationSectionProps {
  formData: any;
  setFormData: (updater: (prev: any) => any) => void;
}

const HealthCalculationSection: React.FC<HealthCalculationSectionProps> = ({
  formData,
  setFormData,
}) => {
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
    <>
      <div className="space-y-2 bg-white/80 backdrop-blur-sm rounded-md p-4 border border-gray-100 shadow-sm">
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
    </>
  );
};

export default HealthCalculationSection;
