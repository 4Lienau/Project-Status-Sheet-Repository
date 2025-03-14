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
import {
  Gantt,
  Task,
  ViewMode,
  StylingOption,
  DisplayOption,
} from "gantt-task-react";
import "gantt-task-react/dist/index.css";

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

// Create a style element to inject custom CSS
const createTodayLineStyle = () => {
  const styleEl = document.createElement("style");
  styleEl.id = "gantt-today-line-style";
  styleEl.innerHTML = `
    .today-line {
      stroke: #2563eb !important;
      stroke-width: 2px !important;
    }
  `;
  return styleEl;
};

const GanttChart: React.FC<GanttChartProps> = ({
  milestones,
  projectTitle,
}) => {
  const [view, setView] = useState<ViewMode>(ViewMode.Month);

  // Inject custom CSS for today line when component mounts
  useEffect(() => {
    // Check if style already exists
    if (!document.getElementById("gantt-today-line-style")) {
      document.head.appendChild(createTodayLineStyle());
    }

    // Cleanup when component unmounts
    return () => {
      const styleEl = document.getElementById("gantt-today-line-style");
      if (styleEl) {
        styleEl.remove();
      }
    };
  }, []);

  // Convert milestones to tasks format required by gantt-task-react
  const tasks: Task[] = milestones.map((milestone, index) => {
    const date = new Date(milestone.date);
    const endDate = new Date(date);
    endDate.setDate(endDate.getDate() + 1); // Make it a 1-day task

    // Determine color based on status
    const statusColor = {
      green: "#22c55e", // richer green
      yellow: "#eab308", // richer yellow
      red: "#ef4444", // richer red
    }[milestone.status];

    // Determine background color based on status
    const barBackgroundColor = {
      green: "rgba(34, 197, 94, 0.15)", // light green background
      yellow: "rgba(234, 179, 8, 0.15)", // light yellow background
      red: "rgba(239, 68, 68, 0.15)", // light red background
    }[milestone.status];

    return {
      id: milestone.id || `milestone-${index}`,
      name: milestone.milestone,
      start: date,
      end: endDate,
      progress: milestone.completion / 100,
      type: "task",
      isDisabled: false,
      styles: {
        progressColor: statusColor,
        progressSelectedColor: statusColor,
        backgroundColor: barBackgroundColor,
        backgroundSelectedColor: barBackgroundColor,
      },
      fontSize: "14px",
      fontFamily: "Inter, sans-serif",
      project: projectTitle,
      dependencies: [],
      hideChildren: false,
      displayOrder: index,
    };
  });

  // Find date range for the chart
  const today = new Date();
  let startDate = today;
  let endDate = addMonths(today, 3); // Default 3 months ahead

  if (milestones.length > 0) {
    // Sort dates to find earliest and latest
    const dates = milestones
      .map((m) => new Date(m.date))
      .sort((a, b) => a.getTime() - b.getTime());
    startDate = dates[0];
    endDate = dates[dates.length - 1];

    // Add buffer before and after
    startDate = addDays(startDate, -15);
    endDate = addDays(endDate, 15);
  }

  // Custom styling options
  const ganttStyles: StylingOption = {
    headerHeight: 60,
    rowHeight: 50,
    barCornerRadius: 5,
    barFill: 80,
    fontFamily: "Inter, sans-serif",
    fontSize: "14px",
    arrowColor: "#64748b",
    arrowIndent: 10,
    todayColor: "#2563eb", // Solid blue color for today line
    tableRowPadding: 12,
    // Additional styling
    headerFontSize: "15px",
    headerFontWeight: "bold",
    tableCellPadding: 12,
    progressBarBackgroundColor: "#e5e7eb", // Light gray background
    progressBarCornerRadius: 3,
    projectBackgroundColor: "rgba(241, 245, 249, 0.6)", // Very light blue-gray
    projectProgressBarFill: 80,
    projectProgressBarBackgroundColor: "#e5e7eb",
    rtl: false,
  };

  // Display options
  const displayOptions: DisplayOption = {
    viewMode: view,
    viewDate: today,
    preStepsCount: 1,
    locale: "en-US",
    rtl: false,
    // Enable today line
    showToday: true,
  };

  // Handle view mode change
  const handleViewModeChange = (viewMode: ViewMode) => {
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
              onClick={() => handleViewModeChange(ViewMode.Day)}
              className={`px-3 py-1 text-sm rounded-md ${view === ViewMode.Day ? "bg-blue-600 text-white shadow-md" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
            >
              Day
            </button>
            <button
              onClick={() => handleViewModeChange(ViewMode.Week)}
              className={`px-3 py-1 text-sm rounded-md ${view === ViewMode.Week ? "bg-blue-600 text-white shadow-md" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
            >
              Week
            </button>
            <button
              onClick={() => handleViewModeChange(ViewMode.Month)}
              className={`px-3 py-1 text-sm rounded-md ${view === ViewMode.Month ? "bg-blue-600 text-white shadow-md" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
            >
              Month
            </button>
            <button
              onClick={() => handleViewModeChange(ViewMode.Year)}
              className={`px-3 py-1 text-sm rounded-md ${view === ViewMode.Year ? "bg-blue-600 text-white shadow-md" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
            >
              Year
            </button>
            <button
              onClick={() => {
                // Find the appropriate view mode based on date range
                const dateRange =
                  tasks.length > 0
                    ? Math.abs(
                        (tasks[tasks.length - 1].end.getTime() -
                          tasks[0].start.getTime()) /
                          (1000 * 60 * 60 * 24),
                      )
                    : 0;

                if (dateRange <= 14) {
                  setView(ViewMode.Day);
                } else if (dateRange <= 90) {
                  setView(ViewMode.Week);
                } else if (dateRange <= 365) {
                  setView(ViewMode.Month);
                } else {
                  setView(ViewMode.Year);
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
          {tasks.length > 0 ? (
            <Gantt
              tasks={tasks}
              viewMode={view}
              listCellWidth="" // Auto width
              columnWidth={60}
              ganttHeight={600}
              TooltipContent={({ task }) => {
                const milestone = milestones.find(
                  (m) =>
                    m.id === task.id ||
                    `milestone-${task.displayOrder}` === task.id,
                );
                const statusColor = {
                  green: "#22c55e",
                  yellow: "#eab308",
                  red: "#ef4444",
                }[milestone?.status || "green"];

                return (
                  <div className="bg-white p-4 border border-gray-200 shadow-lg rounded-md min-w-[250px]">
                    <div
                      className="border-l-4 pl-2 mb-2"
                      style={{ borderColor: statusColor }}
                    >
                      <p className="font-bold text-lg">{task.name}</p>
                    </div>
                    <div className="space-y-2">
                      <p className="flex justify-between">
                        <span className="text-gray-500">Date:</span>
                        <span className="font-medium">
                          {format(task.start, "MMM d, yyyy")}
                        </span>
                      </p>
                      <p className="flex justify-between">
                        <span className="text-gray-500">Completion:</span>
                        <span className="font-medium">
                          {Math.round(task.progress * 100)}%
                        </span>
                      </p>
                      <p className="flex justify-between">
                        <span className="text-gray-500">Owner:</span>
                        <span className="font-medium">
                          {milestone?.owner || ""}
                        </span>
                      </p>
                      <p className="flex justify-between">
                        <span className="text-gray-500">Status:</span>
                        <span className="font-medium flex items-center gap-1">
                          <span
                            className="inline-block w-3 h-3 rounded-full"
                            style={{ backgroundColor: statusColor }}
                          ></span>
                          <span className="capitalize">
                            {milestone?.status || ""}
                          </span>
                        </span>
                      </p>
                    </div>
                  </div>
                );
              }}
              onDateChange={() => {}} // Read-only, no changes allowed
              onProgressChange={() => {}} // Read-only, no changes allowed
              onDoubleClick={() => {}} // No action on double click
              onTaskDelete={() => {}} // No deletion allowed
              onTaskClick={() => {}} // No action on click
              onExpanderClick={() => {}} // No action on expander click
              stylingOption={ganttStyles}
              displayOption={displayOptions}
            />
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
