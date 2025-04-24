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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface StatusSheetProps {
  data?: {
    title: string;
    description?: string;
    valueStatement?: string;
    status?: "active" | "on_hold" | "completed" | "cancelled" | "draft";
    health_calculation_type?: "automatic" | "manual";
    manual_health_percentage?: number;
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
const StatusSheet: React.FC<StatusSheetProps> = ({ data }) => {
  const { toast } = useToast();

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

  // Determine overall status color
  const getStatusColor = (status: string) => {
    // If using manual calculation and manual color is set, use that
    if (data.health_calculation_type === "manual" && data.manual_status_color) {
      return `bg-${data.manual_status_color}-500`;
    }

    // Otherwise use status-based colors
    switch (status) {
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
    // If task is complete, use green (not blue)
    if (completion === 100) return "bg-green-100 text-green-800";

    // If no due date, base on completion only
    if (!dueDate) {
      if (completion >= 50) return "bg-green-100 text-green-800";
      return "bg-yellow-100 text-yellow-800";
    }

    // Check if task is past due
    const today = new Date();
    const dueDateTime = new Date(dueDate);

    // If past due and not complete, use red
    if (dueDateTime < today && completion < 100) {
      return "bg-red-100 text-red-800";
    }

    // Check if task is at risk (due within 5 days)
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
          <div className="border-2 border-gray-300 p-3 mb-2">
            <div className="flex items-start">
              <div className="flex-none">
                <div className="font-bold mb-1 text-gray-900 dark:text-gray-900">
                  Overall Status
                </div>
                <div className="flex items-start gap-2">
                  <div
                    className={`w-14 h-14 flex items-center justify-center text-white dark:text-white text-2xl font-bold border-2 border-gray-400 ${getStatusColor(data.status || "active")}`}
                  >
                    {overallCompletion}%
                  </div>
                  <div>
                    <div className="text-gray-900 dark:text-gray-900">
                      Health:{" "}
                      {data.status
                        ? data.status
                            .replace("_", " ")
                            .charAt(0)
                            .toUpperCase() +
                          data.status.slice(1).replace("_", " ")
                        : "Active"}
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
                  <div className="text-gray-900 dark:text-gray-900">
                    {data.sponsors || ""}
                  </div>
                </div>
                <div className="flex-1 border-l-2 border-gray-300 pl-4">
                  <div className="font-bold mb-1 text-gray-900 dark:text-gray-900">
                    Business Lead(s)
                  </div>
                  <div className="text-gray-900 dark:text-gray-900">
                    {data.businessLeads || ""}
                  </div>
                </div>
                <div className="flex-1 border-l-2 border-gray-300 pl-4">
                  <div className="font-bold mb-1 text-gray-900 dark:text-gray-900">
                    PM
                  </div>
                  <div className="text-gray-900 dark:text-gray-900">
                    {data.projectManager || ""}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Budget and Charter Section */}
          <div className="border-2 border-gray-300 p-3 mb-2">
            <div className="flex items-center">
              <div className="flex-1 grid grid-cols-4 gap-8">
                <div>
                  <div className="font-bold mb-1 text-gray-900 dark:text-gray-900">
                    Budget
                  </div>
                  <div className="text-gray-900 dark:text-gray-900">
                    ${data.budget?.total || "0"}
                  </div>
                </div>
                <div className="border-l-2 border-gray-300 pl-4">
                  <div className="font-bold mb-1 text-gray-900 dark:text-gray-900">
                    Actuals
                  </div>
                  <div className="text-gray-900 dark:text-gray-900">
                    ${data.budget?.actuals || "0"}
                  </div>
                </div>
                <div className="border-l-2 border-gray-300 pl-4">
                  <div className="font-bold mb-1 text-gray-900 dark:text-gray-900">
                    Forecast
                  </div>
                  <div className="text-gray-900 dark:text-gray-900">
                    ${data.budget?.forecast || "0"}
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
                    )}`}
                  >
                    {getBudgetStatus(
                      data.budget.actuals,
                      data.budget.total,
                      data.budget.forecast,
                    )}
                  </div>
                </div>
              </div>
              <div className="border-l-2 border-gray-300 pl-4 ml-8">
                <div className="font-bold mb-1 text-gray-900 dark:text-gray-900">
                  Charter
                </div>
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
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              {/* Accomplishments Section */}
              <div className="border-2 border-gray-300 p-3 mb-2">
                <h3 className="text-lg font-bold mb-2 text-gray-900 dark:text-gray-900">
                  Accomplishments To Date
                </h3>
                <ul className="list-disc pl-5 space-y-1">
                  {(data.accomplishments || []).map((item, index) => (
                    <li
                      key={index}
                      className="text-gray-900 dark:text-gray-900"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Next Period's Activities Section */}
              <div className="border-2 border-gray-300 p-3 mb-2">
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

                        // Truncate description to 35 characters
                        const truncatedDescription =
                          description.length > 35
                            ? `${description.substring(0, 35)}...`
                            : description;

                        return (
                          <tr key={index} className="border-b border-gray-300">
                            <td
                              className="py-1 pr-4 text-gray-900 dark:text-gray-900 whitespace-nowrap overflow-hidden text-ellipsis"
                              style={{ maxWidth: "200px" }}
                            >
                              {truncatedDescription}
                            </td>
                            <td className="py-1 pr-4 whitespace-nowrap text-gray-900 dark:text-gray-900">
                              {date}
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
                              {assignee}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>

              {/* Considerations Section */}
              <div className="border-2 border-gray-300 p-3 mb-2">
                <h3 className="text-lg font-bold mb-2 text-gray-900 dark:text-gray-900">
                  Questions / Items for Consideration
                </h3>
                <ul className="list-disc pl-5 space-y-1">
                  {(data.considerations || []).map((item, index) => (
                    <li
                      key={index}
                      className="text-gray-900 dark:text-gray-900"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Changes Section */}
              <div className="border-2 border-gray-300 p-3">
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
                            {change}
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

            <div>
              {/* Project Schedule Section */}
              <div className="border-2 border-gray-300 p-3 mb-2">
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
                        // Convert dates to timestamps for comparison
                        const dateA = new Date(a.date || "").getTime();
                        const dateB = new Date(b.date || "").getTime();
                        return dateA - dateB; // Sort earliest to latest
                      })
                      .map((milestone, index) => (
                        <React.Fragment key={index}>
                          <tr className="border-b border-gray-300">
                            <td className="py-1 pr-4">
                              <div
                                className={`w-16 text-center text-sm font-medium py-1 px-2 rounded ${getMilestoneStatus(milestone.completion || 0, milestone.status || "green")}`}
                              >
                                {milestone.completion || 0}%
                              </div>
                            </td>
                            <td className="py-1 pr-4 whitespace-nowrap text-gray-900 dark:text-gray-900">
                              {milestone.date || ""}
                            </td>
                            <td className="py-1 pr-4 text-gray-900 dark:text-gray-900 font-medium">
                              {milestone.milestone || ""}
                            </td>
                          </tr>
                          {/* Tasks are hidden from Status Sheet view */}
                        </React.Fragment>
                      ))}
                  </tbody>
                </table>
              </div>

              {/* Risks Section */}
              <div className="border-2 border-gray-300 p-3">
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
                            {description}
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
            </div>
          </div>

          {/* Status Legend */}
          <div className="flex items-center justify-start gap-4 mt-4 mb-8 px-2">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-100"></div>
              <span className="text-sm text-gray-900 dark:text-gray-900">
                Completed
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-100"></div>
              <span className="text-sm text-gray-900 dark:text-gray-900">
                On Schedule
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-100"></div>
              <span className="text-sm text-gray-900 dark:text-gray-900">
                Risk
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-100"></div>
              <span className="text-sm text-gray-900 dark:text-gray-900">
                High Risk
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatusSheet;
