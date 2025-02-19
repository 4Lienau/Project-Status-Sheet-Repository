import React from "react";
import { Button } from "@/components/ui/button";
import { FileText, Download } from "lucide-react";
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
    budget: {
      total: string;
      actuals: string;
      forecast: string;
    };
    charterLink: string;
    sponsors: string;
    businessLeads: string;
    projectManager: string;
    accomplishments: string[];
    nextPeriodActivities: string[];
    milestones: Array<{
      date: string;
      milestone: string;
      owner: string;
      completion: number;
      status: "green" | "yellow" | "red";
    }>;
    risks: string[];
    considerations: string[];
  };
}

const StatusSheet: React.FC<StatusSheetProps> = ({ data }) => {
  const handleExport = async () => {
    const element = document.getElementById("status-sheet");
    if (!element) return;

    try {
      const canvas = await html2canvas(element, {
        backgroundColor: "#ffffff",
        scale: 2, // Higher quality
      });

      const date = new Date().toISOString().split("T")[0];
      const fileName = `${data.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}_${date}.jpg`;

      // Convert and download
      const link = document.createElement("a");
      link.download = fileName;
      link.href = canvas.toDataURL("image/jpeg", 0.9);
      link.click();
    } catch (error) {
      console.error("Export failed:", error);
    }
  };
  if (!data) return null;

  // Calculate overall completion percentage
  const overallCompletion = Math.round(
    data.milestones.reduce((acc, m) => acc + m.completion, 0) /
      Math.max(data.milestones.length, 1),
  );

  // Determine overall status color
  const getStatusColor = (status: string) => {
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
    actuals: number,
    total: number,
    forecast: number,
  ) => {
    if (actuals + forecast > total) return "At Risk";
    if (actuals > total) return "Over Budget";
    return "On Budget";
  };

  const getBudgetStatusColor = (
    actuals: number,
    total: number,
    forecast: number,
  ) => {
    if (actuals + forecast > total) return "text-yellow-600 font-medium";
    if (actuals > total) return "text-red-600 font-medium";
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

  return (
    <div className="relative">
      <div className="sticky top-0 z-10 flex justify-end mb-4">
        <Button
          onClick={handleExport}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Download className="h-4 w-4" />
          Export as JPG
        </Button>
      </div>
      <div id="status-sheet" className="bg-white dark:bg-white">
        {/* Title and Description */}
        <div className="bg-gradient-to-r from-blue-650 via-blue-600 to-blue-450 p-3 mb-2">
          <h1 className="text-2xl font-bold text-white dark:text-white">
            {data.title}
          </h1>
          <h2 className="text-xl text-blue-50 dark:text-blue-50">
            {data.description}
          </h2>
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
                      {data.status?.replace("_", " ").charAt(0).toUpperCase() +
                        data.status?.slice(1).replace("_", " ") || "Active"}
                    </div>
                    <div className="text-cyan-600 dark:text-cyan-600">
                      {data.status === "completed"
                        ? "Project Complete"
                        : data.status === "on_hold"
                          ? "Project on Hold"
                          : data.status === "cancelled"
                            ? "Project Cancelled"
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
                    {data.sponsors}
                  </div>
                </div>
                <div className="flex-1 border-l-2 border-gray-300 pl-4">
                  <div className="font-bold mb-1 text-gray-900 dark:text-gray-900">
                    Business Lead(s)
                  </div>
                  <div className="text-gray-900 dark:text-gray-900">
                    {data.businessLeads}
                  </div>
                </div>
                <div className="flex-1 border-l-2 border-gray-300 pl-4">
                  <div className="font-bold mb-1 text-gray-900 dark:text-gray-900">
                    PM
                  </div>
                  <div className="text-gray-900 dark:text-gray-900">
                    {data.projectManager}
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
                    ${data.budget.total}
                  </div>
                </div>
                <div className="border-l-2 border-gray-300 pl-4">
                  <div className="font-bold mb-1 text-gray-900 dark:text-gray-900">
                    Actuals
                  </div>
                  <div className="text-gray-900 dark:text-gray-900">
                    ${data.budget.actuals}
                  </div>
                </div>
                <div className="border-l-2 border-gray-300 pl-4">
                  <div className="font-bold mb-1 text-gray-900 dark:text-gray-900">
                    Forecast
                  </div>
                  <div className="text-gray-900 dark:text-gray-900">
                    ${data.budget.forecast}
                  </div>
                </div>
                <div className="border-l-2 border-gray-300 pl-4">
                  <div className="font-bold mb-1 text-gray-900 dark:text-gray-900">
                    Budget Status
                  </div>
                  <div
                    className={`${getBudgetStatusColor(
                      parseFloat(data.budget.actuals.replace(/,/g, "")),
                      parseFloat(data.budget.total.replace(/,/g, "")),
                      parseFloat(data.budget.forecast.replace(/,/g, "")),
                    )}`}
                  >
                    {getBudgetStatus(
                      parseFloat(data.budget.actuals.replace(/,/g, "")),
                      parseFloat(data.budget.total.replace(/,/g, "")),
                      parseFloat(data.budget.forecast.replace(/,/g, "")),
                    )}
                  </div>
                </div>
              </div>
              <div className="border-l-2 border-gray-300 pl-4 ml-8">
                <div className="font-bold mb-1 text-gray-900 dark:text-gray-900">
                  Charter
                </div>
                {data.charterLink && (
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
                  {data.accomplishments.map((item, index) => (
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
                <ul className="list-disc pl-5 space-y-1">
                  {data.nextPeriodActivities.map((item, index) => (
                    <li
                      key={index}
                      className="text-gray-900 dark:text-gray-900"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Considerations Section */}
              <div className="border-2 border-gray-300 p-3">
                <h3 className="text-lg font-bold mb-2 text-gray-900 dark:text-gray-900">
                  Questions / Items for Consideration
                </h3>
                <ul className="list-disc pl-5 space-y-1">
                  {data.considerations.map((item, index) => (
                    <li
                      key={index}
                      className="text-gray-900 dark:text-gray-900"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
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
                      <th className="py-1 pr-4 font-bold text-gray-900 dark:text-gray-900">
                        Milestone
                      </th>
                      <th className="py-1 pr-4 font-bold text-gray-900 dark:text-gray-900">
                        Owner
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.milestones.map((milestone, index) => (
                      <tr key={index} className="border-b border-gray-300">
                        <td className="py-1 pr-4">
                          <div
                            className={`w-16 text-center text-sm font-medium py-1 px-2 rounded ${getMilestoneStatus(milestone.completion, milestone.status)}`}
                          >
                            {milestone.completion}%
                          </div>
                        </td>
                        <td className="py-1 pr-4 whitespace-nowrap text-gray-900 dark:text-gray-900">
                          {milestone.date}
                        </td>
                        <td className="py-1 pr-4 text-gray-900 dark:text-gray-900">
                          {milestone.milestone}
                        </td>
                        <td className="py-1 pr-4 text-gray-900 dark:text-gray-900">
                          {milestone.owner}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Risks Section */}
              <div className="border-2 border-gray-300 p-3">
                <h3 className="text-lg font-bold mb-2 text-gray-900 dark:text-gray-900">
                  Risks and Issues
                </h3>
                <ul className="list-disc pl-5 space-y-1">
                  {data.risks.map((risk, index) => (
                    <li
                      key={index}
                      className="text-gray-900 dark:text-gray-900"
                    >
                      {risk}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Status Legend */}
          <div className="flex items-center justify-start gap-4 mt-4 px-2">
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
