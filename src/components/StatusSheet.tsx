/**
 * File: StatusSheet.tsx
 * Purpose: Component for displaying a formatted project status sheet with export capabilities
 * Description: This component renders a comprehensive project status sheet with sections for
 * project details, budget, milestones, accomplishments, activities, risks, and considerations.
 * It includes functionality to export the status sheet to JPG and PowerPoint formats. The component
 * uses a structured layout with consistent styling for professional presentation.
 *
 * Imports from:
 * - React core libraries
 * - UI components from shadcn/ui
 * - PowerPoint export service
 * - html2canvas for JPG export
 * - Lucide icons
 *
 * Called by:
 * - src/pages/StatusSheetView.tsx
 * - src/pages/ProjectDashboard.tsx
 */

import React from "react";
import { Button } from "@/components/ui/button";
import { calculateWeightedCompletion } from "@/lib/services/project";
import { FileText, Download, FileOutput } from "lucide-react";
import { exportToPowerPoint } from "@/lib/services/pptExport";
import { useToast } from "./ui/use-toast";
import html2canvas from "html2canvas";
import { format } from "date-fns";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  hasFieldChanged,
  type VersionChanges,
  getChangeDescription,
} from "@/lib/utils/versionComparison";

interface StatusSheetProps {
  versionChanges?: VersionChanges;
  showChangeIndicators?: boolean;
  data?: {
    title: string;
    description?: string;
    valueStatement?: string;
    status?: "active" | "on_hold" | "completed" | "cancelled" | "draft";
    health_calculation_type?: "automatic" | "manual";
    manual_health_percentage?: number;
    computed_status_color?: "green" | "yellow" | "red";
    manual_status_color?: "green" | "yellow" | "red";
    budget: {
      total: string | number;
      actuals: string | number;
      forecast: string | number;
    };
    charterLink?: string;
    sponsors?: string;
    businessLeads?: string;
    projectManager?: string;
    accomplishments?: string[];
    nextPeriodActivities?:
      | Array<{
          description: string;
          date?: string;
          completion?: number;
          assignee?: string;
        }>
      | string[];
    milestones?: Array<{
      date?: string;
      milestone?: string;
      owner?: string;
      completion?: number;
      status?: "green" | "yellow" | "red";
      tasks?: Array<{
        id?: string;
        description?: string;
        assignee?: string;
        date?: string;
        completion?: number;
      }>;
    }>;
    risks?:
      | Array<{
          description?: string;
          impact?: string;
        }>
      | string[];
    considerations?: string[];
    changes?: Array<{
      change?: string;
      impact?: string;
      disposition?: string;
    }>;
  };
}

/**
 * StatusSheet component
 * Renders a formatted project status sheet with export capabilities
 */
const StatusSheet: React.FC<StatusSheetProps> = ({
  data,
  versionChanges = {},
  showChangeIndicators = false,
}) => {
  const { toast } = useToast();

  // Helper function to extract first name from full name
  const getFirstName = (fullName: string): string => {
    if (!fullName || typeof fullName !== "string") {
      return "";
    }

    const trimmedName = fullName.trim();
    if (!trimmedName) {
      return "";
    }

    // Split by space and take the first part
    const nameParts = trimmedName.split(/\s+/);
    return nameParts[0] || "";
  };

  // Helper function to render change indicator
  const renderChangeIndicator = (fieldPath: string, tooltip?: string) => {
    if (!showChangeIndicators || !hasFieldChanged(versionChanges, fieldPath)) {
      return null;
    }

    const change = versionChanges[fieldPath];
    const description = tooltip || getChangeDescription(change);

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="inline-flex items-center ml-1">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-sm">{description}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  // Helper function to add subtle background highlight for changed sections
  const getChangedSectionClass = (fieldPath: string) => {
    if (!showChangeIndicators || !hasFieldChanged(versionChanges, fieldPath)) {
      return "";
    }
    return "bg-blue-50/30 border-l-2 border-blue-200";
  };

  if (!data) {
    console.warn("No data provided to StatusSheet component");
    return (
      <div className="p-4 bg-gray-100 rounded-lg text-center">
        <p className="text-gray-500">No project data available</p>
      </div>
    );
  }

  // Calculate overall completion percentage
  const overallCompletion =
    data.health_calculation_type === "manual"
      ? data.manual_health_percentage || 0
      : calculateWeightedCompletion(data.milestones || []);

  // Determine overall status color using computed_status_color from database
  const getStatusColor = () => {
    // Debug logging for status color determination
    console.log("[STATUS_COLOR_DEBUG] StatusSheet getStatusColor data:", {
      computed_status_color: data.computed_status_color,
      manual_status_color: data.manual_status_color,
      health_calculation_type: data.health_calculation_type,
      status: data.status,
      title: data.title,
    });

    // First priority: Use computed_status_color from database if available
    if (data.computed_status_color) {
      console.log(
        `[STATUS_COLOR_DEBUG] Using computed_status_color: ${data.computed_status_color}`,
      );
      return `bg-${data.computed_status_color}-500`;
    }

    // Second priority: If using manual calculation and manual color is set, use that
    if (data.health_calculation_type === "manual" && data.manual_status_color) {
      return `bg-${data.manual_status_color}-500`;
    }

    // Fallback: Use status-based colors (should rarely be used now)
    switch (data.status) {
      case "draft":
        return "bg-yellow-500";
      case "completed":
        return "bg-blue-500";
      case "on_hold":
        return "bg-yellow-500";
      case "cancelled":
        return "bg-red-500";
      default:
        return "bg-green-500";
    }
  };

  // Get budget status and color
  const getBudgetStatus = (
    actuals: number | string,
    total: number | string,
    forecast: number | string,
  ) => {
    // Convert string values to numbers if needed
    const actualsNum =
      typeof actuals === "string"
        ? parseFloat(actuals.replace(/,/g, ""))
        : actuals;
    const totalNum =
      typeof total === "string" ? parseFloat(total.replace(/,/g, "")) : total;
    const forecastNum =
      typeof forecast === "string"
        ? parseFloat(forecast.replace(/,/g, ""))
        : forecast;

    if (actualsNum + forecastNum > totalNum) return "At Risk";
    if (actualsNum > totalNum) return "Over Budget";
    return "On Budget";
  };

  const getBudgetStatusColor = (
    actuals: number | string,
    total: number | string,
    forecast: number | string,
  ) => {
    // Convert string values to numbers if needed
    const actualsNum =
      typeof actuals === "string"
        ? parseFloat(actuals.replace(/,/g, ""))
        : actuals;
    const totalNum =
      typeof total === "string" ? parseFloat(total.replace(/,/g, "")) : total;
    const forecastNum =
      typeof forecast === "string"
        ? parseFloat(forecast.replace(/,/g, ""))
        : forecast;

    if (actualsNum + forecastNum > totalNum)
      return "text-yellow-600 font-medium";
    if (actualsNum > totalNum) return "text-red-600 font-medium";
    return "text-green-600 font-medium";
  };

  // Get milestone status styling
  const getMilestoneStatus = (completion: number, status: string) => {
    if (completion === 100) return "bg-blue-100 text-blue-800";
    switch (status) {
      case "green":
        return "bg-green-100 text-green-800";
      case "yellow":
        return "bg-yellow-100 text-yellow-800";
      case "red":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Get progress pill color based on completion and due date
  const getProgressPillColor = (completion: number, dueDate?: string) => {
    // If task is complete, use blue
    if (completion === 100) return "bg-blue-100 text-blue-800";

    // If no due date, base on completion only
    if (!dueDate) {
      if (completion >= 50) return "bg-green-100 text-green-800";
      return "bg-yellow-100 text-yellow-800";
    }

    // Check if task is past due or due within 14 days
    const today = new Date();
    const dueDateTime = new Date(dueDate);
    const twoWeeksFromNow = new Date();
    twoWeeksFromNow.setDate(today.getDate() + 14);

    // If past due and not complete, use red
    if (dueDateTime < today && completion < 100) {
      return "bg-red-100 text-red-800";
    }

    // Progressive risk calculation based on due date proximity
    // 1. If due within 1 day and less than 80% completion → red
    const oneDayFromNow = new Date();
    oneDayFromNow.setDate(today.getDate() + 1);
    if (dueDateTime <= oneDayFromNow && completion < 80) {
      return "bg-red-100 text-red-800";
    }

    // 2. If due within 2 days and less than 40% completion → red
    const twoDaysFromNow = new Date();
    twoDaysFromNow.setDate(today.getDate() + 2);
    if (dueDateTime <= twoDaysFromNow && completion < 40) {
      return "bg-red-100 text-red-800";
    }

    // 3. Check if task is at risk (due within 5 days)
    const fiveDaysFromNow = new Date();
    fiveDaysFromNow.setDate(today.getDate() + 5);

    if (dueDateTime <= fiveDaysFromNow && completion < 100) {
      return "bg-yellow-100 text-yellow-800";
    }

    // Otherwise, task is on track
    return "bg-green-100 text-green-800";
  };

  const handleExportToJpg = async () => {
    const element = document.getElementById("status-sheet");
    if (!element) return;

    try {
      const canvas = await html2canvas(element, {
        backgroundColor: "#ffffff",
        scale: 2, // Higher quality
      });

      // Convert to blob
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.95);
      });

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${data?.title || "status-sheet"}_${new Date().toISOString().split("T")[0]}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exporting to JPG:", error);
    }
  };

  return (
    <div>
      <div className="flex justify-end mb-4 gap-2">
        <Button
          onClick={handleExportToJpg}
          className="flex items-center gap-2"
          variant="outline"
        >
          <Download className="h-4 w-4" /> Export to JPG
        </Button>
        <Button
          onClick={async () => {
            const element = document.getElementById("status-sheet");
            if (!element) return;

            try {
              const success = await exportToPowerPoint(element, data?.title);
              if (success) {
                toast({
                  title: "Export Successful",
                  description:
                    "PowerPoint file has been generated and downloaded.",
                  className: "bg-green-50 border-green-200",
                });
              } else {
                throw new Error("Export failed");
              }
            } catch (error) {
              toast({
                title: "Export Failed",
                description: "Failed to generate PowerPoint file.",
                variant: "destructive",
              });
            }
          }}
          className="flex items-center gap-2"
          variant="outline"
        >
          <FileOutput className="h-4 w-4" /> Export to PowerPoint
        </Button>
      </div>
      <div id="status-sheet" className="bg-white dark:bg-white pb-4 w-full">
        {/* Title and Description */}
        <div className="bg-gradient-to-r from-blue-650 via-blue-600 to-blue-450 p-3 mb-2">
          <h1
            className="text-2xl font-bold text-white dark:text-white"
            dangerouslySetInnerHTML={{ __html: data.title || "" }}
          ></h1>
          <h2
            className="text-xl text-blue-50 dark:text-blue-50"
            dangerouslySetInnerHTML={{ __html: data.description || "" }}
          ></h2>
        </div>

        <div className="px-3">
          {/* Overall Status Section */}
          <div
            className={`border-2 border-gray-300 p-3 mb-2 ${
              getChangedSectionClass("status") ||
              getChangedSectionClass("health_calculation_type") ||
              getChangedSectionClass("manual_health_percentage") ||
              getChangedSectionClass("overall_completion") ||
              getChangedSectionClass("manual_status_color") ||
              getChangedSectionClass("sponsors") ||
              getChangedSectionClass("business_leads") ||
              getChangedSectionClass("project_manager")
            }`}
          >
            <div className="flex items-start">
              <div className="flex-none">
                <div className="font-bold mb-1 text-gray-900 dark:text-gray-900">
                  Overall Status
                </div>
                <div className="flex items-start gap-2">
                  <div
                    className={`w-14 h-14 flex items-center justify-center text-white dark:text-white text-2xl font-bold border-2 border-gray-400 ${getStatusColor()}`}
                  >
                    {overallCompletion}%
                    {renderChangeIndicator(
                      "overall_completion",
                      "Overall completion percentage has changed",
                    )}
                    {renderChangeIndicator(
                      "manual_health_percentage",
                      "Manual health percentage has changed",
                    )}
                  </div>
                  <div>
                    <div className="text-gray-900 dark:text-gray-900 flex items-center">
                      Health:{" "}
                      {data.status
                        ? data.status
                            .replace("_", " ")
                            .charAt(0)
                            .toUpperCase() +
                          data.status.slice(1).replace("_", " ")
                        : "Active"}
                      {renderChangeIndicator(
                        "status",
                        "Project status has changed",
                      )}
                      {renderChangeIndicator(
                        "health_calculation_type",
                        "Health calculation method has changed",
                      )}
                      {renderChangeIndicator(
                        "manual_status_color",
                        "Status color has changed",
                      )}
                    </div>
                    <div className="text-cyan-600 dark:text-cyan-600">
                      {data.status === "completed"
                        ? "Project Complete"
                        : data.status === "on_hold"
                          ? "Project on Hold"
                          : data.status === "cancelled"
                            ? "Project Cancelled"
                            : data.status === "draft"
                              ? "Project Draft"
                              : "In Progress"}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex-1 flex items-start justify-end ml-24 gap-4">
                <div className="flex-1">
                  <div className="font-bold mb-1 text-gray-900 dark:text-gray-900">
                    Sponsors
                  </div>
                  <div className="text-gray-900 dark:text-gray-900 flex items-center">
                    {data.sponsors || ""}
                    {renderChangeIndicator("sponsors", "Sponsors have changed")}
                  </div>
                </div>
                <div className="flex-1 border-l-2 border-gray-300 pl-4">
                  <div className="font-bold mb-1 text-gray-900 dark:text-gray-900">
                    Business Lead(s)
                  </div>
                  <div className="text-gray-900 dark:text-gray-900 flex items-center">
                    {data.businessLeads || ""}
                    {renderChangeIndicator(
                      "business_leads",
                      "Business leads have changed",
                    )}
                  </div>
                </div>
                <div className="flex-1 border-l-2 border-gray-300 pl-4">
                  <div className="font-bold mb-1 text-gray-900 dark:text-gray-900">
                    PM
                  </div>
                  <div className="text-gray-900 dark:text-gray-900 flex items-center">
                    {data.projectManager || ""}
                    {renderChangeIndicator(
                      "project_manager",
                      "Project manager has changed",
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Budget and Charter Section */}
          <div
            className={`border-2 border-gray-300 p-3 mb-2 ${getChangedSectionClass("budget_total") || getChangedSectionClass("budget_actuals") || getChangedSectionClass("budget_forecast") || getChangedSectionClass("charter_link")}`}
          >
            <div className="flex items-center">
              <div className="flex-1 grid grid-cols-4 gap-8">
                <div>
                  <div className="font-bold mb-1 text-gray-900 dark:text-gray-900">
                    Budget
                  </div>
                  <div className="text-gray-900 dark:text-gray-900 flex items-center">
                    ${data.budget?.total || "0"}
                    {renderChangeIndicator(
                      "budget_total",
                      "Budget total has changed",
                    )}
                  </div>
                </div>
                <div className="border-l-2 border-gray-300 pl-4">
                  <div className="font-bold mb-1 text-gray-900 dark:text-gray-900">
                    Actuals
                  </div>
                  <div className="text-gray-900 dark:text-gray-900 flex items-center">
                    ${data.budget?.actuals || "0"}
                    {renderChangeIndicator(
                      "budget_actuals",
                      "Budget actuals have changed",
                    )}
                  </div>
                </div>
                <div className="border-l-2 border-gray-300 pl-4">
                  <div className="font-bold mb-1 text-gray-900 dark:text-gray-900">
                    Forecast
                  </div>
                  <div className="text-gray-900 dark:text-gray-900 flex items-center">
                    ${data.budget?.forecast || "0"}
                    {renderChangeIndicator(
                      "budget_forecast",
                      "Budget forecast has changed",
                    )}
                  </div>
                </div>
                <div className="border-l-2 border-gray-300 pl-4">
                  <div className="font-bold mb-1 text-gray-900 dark:text-gray-900">
                    Budget Status
                  </div>
                  <div
                    className={`${getBudgetStatusColor(
                      data.budget.actuals,
                      data.budget.total,
                      data.budget.forecast,
                    )} flex items-center`}
                  >
                    <span>
                      {getBudgetStatus(
                        data.budget.actuals,
                        data.budget.total,
                        data.budget.forecast,
                      )}
                    </span>
                    {renderChangeIndicator(
                      "budget_status",
                      "Budget status has changed",
                    )}
                  </div>
                </div>
              </div>
              <div className="border-l-2 border-gray-300 pl-4 ml-8">
                <div className="font-bold mb-1 text-gray-900 dark:text-gray-900">
                  Charter
                </div>
                <div className="flex items-center">
                  {data.charterLink ? (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            asChild
                            className="relative bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 text-white shadow-lg hover:shadow-xl transition-all duration-200 border-0 gap-2 transform hover:-translate-y-0.5 active:translate-y-0 active:shadow-lg"
                          >
                            <a
                              href={data.charterLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center px-4 py-2"
                            >
                              <FileText className="h-4 w-4 mr-2" />
                              View Charter
                            </a>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-[400px] break-all">
                            {data.charterLink}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : (
                    <div className="text-gray-500 italic">
                      No charter link provided
                    </div>
                  )}
                  {renderChangeIndicator(
                    "charter_link",
                    "Charter link has changed",
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              {/* Accomplishments Section */}
              <div
                className={`border-2 border-gray-300 p-3 mb-2 ${getChangedSectionClass("accomplishments")}`}
              >
                <h3 className="text-lg font-bold mb-2 text-gray-900 dark:text-gray-900">
                  Accomplishments To Date
                </h3>
                <ul className="list-disc pl-5 space-y-1">
                  {(data.accomplishments || []).map((item, index) => (
                    <li
                      key={index}
                      className="text-gray-900 dark:text-gray-900 flex items-center"
                    >
                      <span>{item}</span>
                      {index === 0 &&
                        renderChangeIndicator(
                          "accomplishments",
                          "Accomplishments have changed",
                        )}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Next Period's Activities Section */}
              <div
                className={`border-2 border-gray-300 p-3 mb-2 ${getChangedSectionClass("next_period_activities")}`}
              >
                <h3 className="text-lg font-bold mb-2 text-gray-900 dark:text-gray-900">
                  Next Period's Key Activities
                </h3>
                <table className="w-full">
                  <thead>
                    <tr className="text-left border-b border-gray-300">
                      <th className="py-1 pr-4 font-bold text-gray-900 dark:text-gray-900 w-full">
                        Activity
                      </th>
                      <th className="py-1 pr-4 w-32 font-bold whitespace-nowrap text-gray-900 dark:text-gray-900">
                        Date
                      </th>
                      <th className="py-1 pr-4 w-20 font-bold text-gray-900 dark:text-gray-900">
                        Progress
                      </th>
                      <th className="py-1 pr-4 font-bold text-gray-900 dark:text-gray-900">
                        Assignee
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Sort activities by date and map them */}
                    {(data.nextPeriodActivities || [])
                      .slice() // Create a copy to avoid mutating the original array
                      .sort((a, b) => {
                        // Get dates for comparison
                        const dateA = typeof a === "string" ? "" : a.date || "";
                        const dateB = typeof b === "string" ? "" : b.date || "";
                        // Sort by date (ascending)
                        return dateA.localeCompare(dateB);
                      })
                      .map((item, index) => {
                        // Handle both string and object formats
                        const description =
                          typeof item === "string" ? item : item.description;
                        const date =
                          typeof item === "string" ? "" : item.date || "";
                        const completion =
                          typeof item === "string" ? 0 : item.completion || 0;
                        const assignee =
                          typeof item === "string" ? "" : item.assignee || "";

                        // Get truncation preference from localStorage
                        const savedPreference = localStorage.getItem(
                          "truncate_activities_preference",
                        );
                        const shouldTruncate =
                          savedPreference !== null
                            ? savedPreference === "true"
                            : true;
                        const truncatedDescription =
                          shouldTruncate && description.length > 35
                            ? `${description.substring(0, 35)}...`
                            : description;

                        return (
                          <tr key={index} className="border-b border-gray-300">
                            <td
                              className={`py-1 pr-4 text-gray-900 dark:text-gray-900 ${shouldTruncate ? "whitespace-nowrap overflow-hidden text-ellipsis" : "break-words"}`}
                              style={{ maxWidth: "200px" }}
                            >
                              <div className="flex items-center">
                                <span>{truncatedDescription}</span>
                                {index === 0 &&
                                  renderChangeIndicator(
                                    "next_period_activities",
                                    "Next period activities have changed",
                                  )}
                              </div>
                            </td>
                            <td className="py-1 pr-4 whitespace-nowrap text-gray-900 dark:text-gray-900">
                              {date
                                ? (() => {
                                    // Parse date string directly as YYYY-MM-DD without timezone conversion
                                    const [year, month, day] = date.split("-");
                                    return `${month.padStart(2, "0")}/${day.padStart(2, "0")}/${year.slice(-2)}`;
                                  })()
                                : ""}
                            </td>
                            <td className="py-1 pr-4 text-gray-900 dark:text-gray-900">
                              <div className="w-16 h-5 bg-gray-200 rounded-full overflow-hidden relative">
                                {/* Get color classes once to avoid multiple function calls */}
                                {(() => {
                                  const colorClasses = getProgressPillColor(
                                    completion,
                                    date,
                                  );
                                  const bgColorClass =
                                    colorClasses.split(" ")[0];
                                  const textColorClass =
                                    colorClasses.split(" ")[1] || "";

                                  return (
                                    <>
                                      <div
                                        className={`h-full ${bgColorClass}`}
                                        style={{ width: `${completion}%` }}
                                      ></div>
                                      <div
                                        className={`absolute inset-0 flex items-center justify-center text-xs font-medium ${textColorClass}`}
                                      >
                                        {completion}%
                                      </div>
                                    </>
                                  );
                                })()}
                              </div>
                            </td>
                            <td className="py-1 pr-4 text-gray-900 dark:text-gray-900">
                              {getFirstName(assignee)}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>

              {/* Considerations Section */}
              <div
                className={`border-2 border-gray-300 p-3 ${getChangedSectionClass("considerations")}`}
              >
                <h3 className="text-lg font-bold mb-2 text-gray-900 dark:text-gray-900">
                  Questions / Items for Consideration
                </h3>
                <ul className="list-disc pl-5 space-y-1">
                  {(data.considerations || []).map((item, index) => (
                    <li
                      key={index}
                      className="text-gray-900 dark:text-gray-900 flex items-center"
                    >
                      <span>{item}</span>
                      {index === 0 &&
                        renderChangeIndicator(
                          "considerations",
                          "Considerations have changed",
                        )}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div>
              {/* Project Schedule Section */}
              <div
                className={`border-2 border-gray-300 p-3 mb-2 ${getChangedSectionClass("milestones")}`}
              >
                <h2 className="text-lg font-bold mb-2 text-gray-900 dark:text-gray-900">
                  High Level Project Schedule
                </h2>
                <table className="w-full">
                  <thead>
                    <tr className="text-left border-b border-gray-300">
                      <th className="py-1 pr-4 w-24 font-bold text-gray-900 dark:text-gray-900">
                        Status
                      </th>
                      <th className="py-1 pr-4 w-32 font-bold whitespace-nowrap text-gray-900 dark:text-gray-900">
                        Date
                      </th>
                      <th className="py-1 pr-4 font-bold text-gray-900 dark:text-gray-900 w-full">
                        Milestone
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.milestones || [])
                      .slice() // Create a copy to avoid mutating the original array
                      .sort((a, b) => {
                        // Sort by date string directly to avoid timezone issues
                        const dateA = (a.date || "").split("T")[0]; // Get YYYY-MM-DD part
                        const dateB = (b.date || "").split("T")[0]; // Get YYYY-MM-DD part
                        return dateA.localeCompare(dateB); // Sort earliest to latest
                      })
                      .map((milestone, index) => (
                        <tr key={index} className="border-b border-gray-300">
                          <td className="py-1 pr-4">
                            <div className="flex items-center">
                              <div
                                className={`w-16 text-center text-sm font-medium py-1 px-2 rounded ${getMilestoneStatus(milestone.completion || 0, milestone.status || "green")}`}
                              >
                                {milestone.completion || 0}%
                              </div>
                              {/* Show change indicator for completion percentage changes */}
                              {(() => {
                                const milestone = data.milestones?.[index];
                                if (!milestone) return null;
                                const stableId =
                                  `${milestone.date || "no-date"}|${milestone.milestone || "no-text"}|${milestone.owner || "no-owner"}`.toLowerCase();
                                return renderChangeIndicator(
                                  `milestone_completion_${stableId}`,
                                  `Milestone completion changed`,
                                );
                              })()}
                            </div>
                          </td>
                          <td className="py-1 pr-4 whitespace-nowrap text-gray-900 dark:text-gray-900">
                            <div className="flex items-center">
                              <span>
                                {milestone.date
                                  ? (() => {
                                      // Parse date string directly as YYYY-MM-DD without timezone conversion
                                      const [year, month, day] =
                                        milestone.date.split("-");
                                      return `${month.padStart(2, "0")}/${day.padStart(2, "0")}/${year.slice(-2)}`;
                                    })()
                                  : ""}
                              </span>
                              {/* Show change indicator for date changes */}
                              {(() => {
                                const milestone = data.milestones?.[index];
                                if (!milestone) return null;
                                const stableId =
                                  `${milestone.date || "no-date"}|${milestone.milestone || "no-text"}|${milestone.owner || "no-owner"}`.toLowerCase();
                                return renderChangeIndicator(
                                  `milestone_date_${stableId}`,
                                  `Milestone date changed`,
                                );
                              })()}
                            </div>
                          </td>
                          <td className="py-1 pr-4 text-gray-900 dark:text-gray-900 font-medium">
                            <div className="flex items-center">
                              <span>{milestone.milestone || ""}</span>
                              {/* Check for specific milestone changes using stable IDs */}
                              {(() => {
                                const milestone = data.milestones?.[index];
                                if (!milestone) return null;
                                const stableId =
                                  `${milestone.date || "no-date"}|${milestone.milestone || "no-text"}|${milestone.owner || "no-owner"}`.toLowerCase();

                                return (
                                  <>
                                    {renderChangeIndicator(
                                      `milestone_milestone_${stableId}`,
                                      `Milestone description changed`,
                                    )}
                                    {renderChangeIndicator(
                                      `milestone_added_${stableId}`,
                                      `New milestone added`,
                                    )}
                                    {renderChangeIndicator(
                                      `milestone_removed_${stableId}`,
                                      `Milestone removed`,
                                    )}
                                  </>
                                );
                              })()}
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              {/* Risks Section */}
              <div
                className={`border-2 border-gray-300 p-3 mb-2 ${getChangedSectionClass("risks")}`}
              >
                <h3 className="text-lg font-bold mb-2 text-gray-900 dark:text-gray-900">
                  Risks and Issues
                </h3>
                <table className="w-full">
                  <thead>
                    <tr className="text-left border-b border-gray-300">
                      <th className="py-1 pr-4 font-bold text-gray-900 dark:text-gray-900">
                        Risk/Issue
                      </th>
                      <th className="py-1 pr-4 font-bold text-gray-900 dark:text-gray-900">
                        Impact
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.risks || []).map((risk, index) => {
                      // Handle different risk formats
                      const description =
                        typeof risk === "string"
                          ? risk
                          : risk.description || "";
                      const impact =
                        typeof risk === "string" ? "" : risk.impact || "";

                      return (
                        <tr key={index} className="border-b border-gray-300">
                          <td className="py-1 pr-4 text-gray-900 dark:text-gray-900">
                            <div className="flex items-center">
                              <span>{description}</span>
                              {index === 0 &&
                                renderChangeIndicator(
                                  "risks",
                                  "Risks and issues have changed",
                                )}
                            </div>
                          </td>
                          <td className="py-1 pr-4 text-gray-900 dark:text-gray-900">
                            {impact}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Changes Section - Moved from left column */}
              <div
                className={`border-2 border-gray-300 p-3 ${getChangedSectionClass("changes")}`}
              >
                <h3 className="text-lg font-bold mb-2 text-gray-900 dark:text-gray-900">
                  Changes
                </h3>
                <table className="w-full">
                  <thead>
                    <tr className="text-left border-b border-gray-300">
                      <th className="py-1 pr-4 font-bold text-gray-900 dark:text-gray-900">
                        Change
                      </th>
                      <th className="py-1 pr-4 font-bold text-gray-900 dark:text-gray-900">
                        Impact
                      </th>
                      <th className="py-1 pr-4 font-bold text-gray-900 dark:text-gray-900">
                        Disposition
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.changes || []).map((item, index) => {
                      // Handle potential undefined values
                      const change = item?.change || "";
                      const impact = item?.impact || "";
                      const disposition = item?.disposition || "";

                      return (
                        <tr key={index} className="border-b border-gray-300">
                          <td className="py-1 pr-4 text-gray-900 dark:text-gray-900">
                            <div className="flex items-center">
                              <span>{change}</span>
                              {index === 0 &&
                                renderChangeIndicator(
                                  "changes",
                                  "Changes section has been updated",
                                )}
                            </div>
                          </td>
                          <td className="py-1 pr-4 text-gray-900 dark:text-gray-900">
                            {impact}
                          </td>
                          <td className="py-1 pr-4 text-gray-900 dark:text-gray-900">
                            {disposition}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Status Legend */}
          <div className="flex items-center justify-start gap-4 mt-4 mb-8 px-2">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-100"></div>
              <span className="text-sm text-gray-900 dark:text-gray-900">
                Completed (100%)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-100"></div>
              <span className="text-sm text-gray-900 dark:text-gray-900">
                On Track
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-100"></div>
              <span className="text-sm text-gray-900 dark:text-gray-900">
                Due within 5 days
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-100"></div>
              <span className="text-sm text-gray-900 dark:text-gray-900">
                At Risk (Past due, due within 1 day with &lt;80% completion, or
                due within 2 days with &lt;40% completion)
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatusSheet;