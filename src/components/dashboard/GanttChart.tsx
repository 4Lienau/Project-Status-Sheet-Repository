/**
 * File: GanttChart.tsx
 * Purpose: Component for displaying project milestones in a Gantt chart format
 * Description: This component renders a Gantt chart visualization of project milestones using
 * the gantt-task-react library. It allows users to view milestones in different time scales
 * (day, week, month, year), provides custom styling, and includes tooltips with detailed milestone
 * information. The chart also highlights the current date and color-codes milestones based on status.
 *
 * Imports from:
 * - React core libraries
 * - date-fns for date manipulation
 * - UI components from shadcn/ui
 * - gantt-task-react for Gantt chart visualization
 *
 * Called by:
 * - src/components/dashboard/GanttChartDialog.tsx
 * - src/pages/ProjectDashboard.tsx
 */

import React, { useState } from "react";
import {
  format,
  parseISO,
  isAfter,
  isBefore,
  addDays,
  addMonths,
} from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import GSTC from "gantt-schedule-timeline-calendar";
import "gantt-schedule-timeline-calendar/dist/style.css";

// Custom CSS to override the today line color
import { useEffect } from "react";

interface Milestone {
  id?: string;
  date: string;
  milestone: string;
  owner: string;
  completion: number;
  status: "green" | "yellow" | "red";
}

interface GanttChartProps {
  milestones: Milestone[];
  projectTitle: string;
}

// Helper function to strip HTML tags from text
const stripHtmlTags = (html: string): string => {
  if (!html) return "";
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
};

const GanttChart: React.FC<GanttChartProps> = ({
  milestones,
  projectTitle,
}) => {
  const [view, setView] = useState<string>("month");

  // Convert milestones to format required by gantt-schedule-timeline-calendar
  const ganttItems = milestones.map((milestone, index) => {
    const date = new Date(milestone.date);
    const endDate = new Date(date);
    endDate.setDate(endDate.getDate() + 1); // Make it a 1-day task

    // Determine color based on status
    const statusColor = {
      green: "#22c55e", // richer green
      yellow: "#eab308", // richer yellow
      red: "#ef4444", // richer red
    }[milestone.status];

    return {
      id: milestone.id || `milestone-${index}`,
      label: stripHtmlTags(milestone.milestone),
      time: {
        start: date.getTime(),
        end: endDate.getTime(),
      },
      style: {
        backgroundColor: statusColor,
        color: "#ffffff",
        fontWeight: "600",
        borderRadius: "8px",
      },
      progress: milestone.completion,
      milestone: milestone, // Store full milestone data for tooltip
    };
  });

  // Find date range for the chart
  const today = new Date();
  let timelineStart = today;
  let timelineEnd = addMonths(today, 3); // Default 3 months ahead

  if (milestones.length > 0) {
    // Sort dates to find earliest and latest
    const dates = milestones
      .map((m) => new Date(m.date))
      .sort((a, b) => a.getTime() - b.getTime());
    timelineStart = dates[0];
    timelineEnd = dates[dates.length - 1];

    // Add buffer before and after
    timelineStart = addDays(timelineStart, -15);
    timelineEnd = addDays(timelineEnd, 15);
  }

  // Create tooltip content for milestones
  const createTooltipContent = (item: any) => {
    const milestone = item.milestone as Milestone;
    if (!milestone) return "";

    const statusColor = {
      green: "#22c55e",
      yellow: "#eab308",
      red: "#ef4444",
    }[milestone.status];

    return `
      <div class="bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-sm">
        <div class="space-y-3">
          <div>
            <h3 class="font-semibold text-gray-900 text-sm leading-tight">
              ${stripHtmlTags(milestone.milestone)}
            </h3>
          </div>
          
          <div class="flex items-center gap-2">
            <span class="text-xs text-gray-600">Status:</span>
            <span class="px-2 py-1 text-xs rounded ${
              milestone.status === "green"
                ? "bg-green-100 text-green-800"
                : milestone.status === "yellow"
                  ? "bg-yellow-100 text-yellow-800"
                  : "bg-red-100 text-red-800"
            }">${milestone.status}</span>
          </div>
          
          <div class="flex items-center gap-2">
            <span class="text-xs text-gray-600">Progress:</span>
            <div class="flex-1 bg-gray-200 rounded-full h-2">
              <div class="h-2 rounded-full" style="width: ${milestone.completion}%; background-color: ${statusColor}"></div>
            </div>
            <span class="text-xs font-medium">${milestone.completion}%</span>
          </div>
          
          <div class="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span class="text-gray-600">Date:</span>
              <div class="font-medium">${format(new Date(milestone.date), "MMM dd, yyyy")}</div>
            </div>
            <div>
              <span class="text-gray-600">Owner:</span>
              <div class="font-medium">${milestone.owner}</div>
            </div>
          </div>
        </div>
      </div>
    `;
  };

  // Handle view mode change
  const handleViewModeChange = (viewMode: string) => {
    setView(viewMode);
  };

  return (
    <Card className="w-full bg-gradient-to-b from-blue-50/90 to-white/90 backdrop-blur-sm border border-blue-100/50 shadow-md">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-blue-800 text-xl">
            {projectTitle} - Milestone Timeline
          </CardTitle>
          <div className="flex gap-2">
            <button
              onClick={() => handleViewModeChange("day")}
              className={`px-3 py-1 text-sm rounded-md ${view === "day" ? "bg-blue-600 text-white shadow-md" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
            >
              Day
            </button>
            <button
              onClick={() => handleViewModeChange("week")}
              className={`px-3 py-1 text-sm rounded-md ${view === "week" ? "bg-blue-600 text-white shadow-md" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
            >
              Week
            </button>
            <button
              onClick={() => handleViewModeChange("month")}
              className={`px-3 py-1 text-sm rounded-md ${view === "month" ? "bg-blue-600 text-white shadow-md" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
            >
              Month
            </button>
            <button
              onClick={() => handleViewModeChange("year")}
              className={`px-3 py-1 text-sm rounded-md ${view === "year" ? "bg-blue-600 text-white shadow-md" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
            >
              Year
            </button>
            <button
              onClick={() => {
                // Find the appropriate view mode based on date range
                const dateRange =
                  ganttItems.length > 0
                    ? Math.abs(
                        (ganttItems[ganttItems.length - 1].time.end -
                          ganttItems[0].time.start) /
                          (1000 * 60 * 60 * 24),
                      )
                    : 0;

                if (dateRange <= 14) {
                  setView("day");
                } else if (dateRange <= 90) {
                  setView("week");
                } else if (dateRange <= 365) {
                  setView("month");
                } else {
                  setView("year");
                }
              }}
              className="px-3 py-1 text-sm rounded-md bg-green-600 text-white hover:bg-green-700 shadow-md transition-all duration-200 hover:-translate-y-0.5"
            >
              Fit All
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[650px] w-full overflow-auto">
          {ganttItems.length > 0 ? (
            <div className="w-full" style={{ minHeight: "600px" }}>
              <style>{`
                .gantt-schedule-timeline-calendar {
                  --gstc-primary-color: #3B82F6;
                  --gstc-secondary-color: #E5E7EB;
                  --gstc-background-color: #FFFFFF;
                  --gstc-text-color: #000000;
                  --gstc-border-color: #D1D5DB;
                  font-family: Inter, system-ui, sans-serif;
                }
                
                .gantt-schedule-timeline-calendar .gstc-item {
                  border-radius: 8px !important;
                  font-weight: 600 !important;
                  color: #ffffff !important;
                }
                
                .gantt-schedule-timeline-calendar .gstc-tooltip {
                  max-width: 320px !important;
                  z-index: 9999 !important;
                }
              `}</style>
              <GSTC
                config={{
                  height: 600,
                  list: {
                    rows: ganttItems.reduce((acc, item) => {
                      acc[item.id] = {
                        id: item.id,
                        label: item.label,
                      };
                      return acc;
                    }, {}),
                    columns: {
                      data: {
                        id: {
                          id: "id",
                          data: "id",
                          width: 0,
                          header: {
                            content: "",
                          },
                        },
                        label: {
                          id: "label",
                          data: "label",
                          width: 200,
                          header: {
                            content: "Milestone",
                          },
                        },
                      },
                    },
                  },
                  chart: {
                    time: {
                      from: timelineStart.getTime(),
                      to: timelineEnd.getTime(),
                      zoom:
                        view === "month"
                          ? 21
                          : view === "week"
                            ? 22
                            : view === "day"
                              ? 23
                              : 20,
                    },
                    items: ganttItems.reduce((acc, item) => {
                      acc[item.id] = {
                        ...item,
                        rowId: item.id,
                      };
                      return acc;
                    }, {}),
                  },
                  plugins: {
                    ItemHold: {
                      enabled: false,
                    },
                    ItemMovement: {
                      enabled: false,
                    },
                    ItemResizing: {
                      enabled: false,
                    },
                    Selection: {
                      enabled: false,
                    },
                    Tooltip: {
                      enabled: true,
                      html: (item: any) => createTooltipContent(item),
                    },
                  },
                  locale: {
                    name: "en",
                    weekdays: [
                      "Sunday",
                      "Monday",
                      "Tuesday",
                      "Wednesday",
                      "Thursday",
                      "Friday",
                      "Saturday",
                    ],
                    weekdaysShort: [
                      "Sun",
                      "Mon",
                      "Tue",
                      "Wed",
                      "Thu",
                      "Fri",
                      "Sat",
                    ],
                    weekdaysMin: ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"],
                    months: [
                      "January",
                      "February",
                      "March",
                      "April",
                      "May",
                      "June",
                      "July",
                      "August",
                      "September",
                      "October",
                      "November",
                      "December",
                    ],
                    monthsShort: [
                      "Jan",
                      "Feb",
                      "Mar",
                      "Apr",
                      "May",
                      "Jun",
                      "Jul",
                      "Aug",
                      "Sep",
                      "Oct",
                      "Nov",
                      "Dec",
                    ],
                  },
                }}
              />
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500">
              No milestones available to display. Add milestones to see the
              timeline.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default GanttChart;
