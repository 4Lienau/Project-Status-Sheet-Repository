import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ArrowLeft,
  Calendar,
  TrendingUp,
  Users,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from "lucide-react";
import {
  projectService,
  type ProjectWithRelations,
} from "@/lib/services/project";
import { useToast } from "@/components/ui/use-toast";
import {
  format,
  addDays,
  startOfYear,
  endOfYear,
  isAfter,
  getYear,
  startOfQuarter,
  endOfQuarter,
  addQuarters,
} from "date-fns";

// Import GSTC library
// import GSTC from "gantt-schedule-timeline-calendar";
// import "gantt-schedule-timeline-calendar/dist/style.css";

// Ensure GSTC is properly loaded
// if (typeof GSTC === "undefined") {
//   console.error("GSTC library not loaded properly");
// }

// Add custom GSTC styles
const gstcStyles = `
  .gantt-container {
    font-family: Inter, system-ui, sans-serif;
  }
  
  .gantt-schedule-timeline-calendar {
    --gstc-primary-color: #3B82F6;
    --gstc-secondary-color: #E5E7EB;
    --gstc-background-color: #FFFFFF;
    --gstc-text-color: #000000;
    --gstc-border-color: #D1D5DB;
    font-family: Inter, system-ui, sans-serif;
    width: 100% !important;
    height: 600px !important;
  }
  
  .gantt-schedule-timeline-calendar .gstc-item {
    border-radius: 6px !important;
    font-weight: 500 !important;
    font-size: 12px !important;
  }
  
  .gantt-schedule-timeline-calendar .gstc-list-column-header {
    background-color: #F9FAFB !important;
    border-bottom: 1px solid #E5E7EB !important;
    font-weight: 600 !important;
  }
  
  .gantt-schedule-timeline-calendar .gstc-chart-timeline-grid-row-block {
    border-bottom: 1px solid #F3F4F6 !important;
  }
  
  .gantt-schedule-timeline-calendar .gstc-list-row {
    border-bottom: 1px solid #F3F4F6 !important;
  }
  
  .gantt-schedule-timeline-calendar .gstc-list-column-data {
    padding: 8px !important;
    font-size: 13px !important;
  }
`;

// Department color mapping with lighter pastel colors
const DEPARTMENT_COLORS = {
  "Information Technology": "#A5B4FC", // Light indigo
  Technology: "#A5B4FC", // Light indigo (alternative name)
  "Human Resources": "#86EFAC", // Light green
  Finance: "#FDE68A", // Light amber
  Marketing: "#FCA5A5", // Light red
  Operations: "#C4B5FD", // Light purple
  Sales: "#67E8F9", // Light cyan
  Engineering: "#86EFAC", // Light green
  engineering: "#86EFAC", // Light green (lowercase variant)
  Legal: "#FDBA74", // Light orange
  Research: "#F9A8D4", // Light pink
  Support: "#D1D5DB", // Light gray
  "Asset Management": "#FCA5A5", // Light red
  "Project Management": "#6EE7B7", // Light emerald
  "Quality Assurance": "#C4B5FD", // Light violet
  "Business Development": "#FDBA74", // Light orange
  "Customer Service": "#7DD3FC", // Light sky
  "Data Analytics": "#F9A8D4", // Light pink
  Procurement: "#BEF264", // Light lime
  "Risk Management": "#FCA5A5", // Light red
  Compliance: "#D2B48C", // Light brown
  Training: "#5EEAD4", // Light teal
  "Software Development": "#A78BFA", // Light purple
  "Product Management": "#93C5FD", // Light blue
  "Data Science": "#F0ABFC", // Light fuchsia
  DevOps: "#A7F3D0", // Light emerald
  "UI/UX Design": "#FBB6CE", // Light rose
  "Business Analysis": "#FED7AA", // Light orange
  "System Administration": "#E0E7FF", // Light indigo
};

// Generate a consistent pastel color for departments not in the predefined list
const generateDepartmentColor = (department: string): string => {
  // Use a simple hash function to generate consistent colors
  let hash = 0;
  for (let i = 0; i < department.length; i++) {
    hash = department.charCodeAt(i) + ((hash << 5) - hash);
  }

  // Convert hash to a pastel color (light and soft)
  const hue = Math.abs(hash) % 360;
  const saturation = 40 + (Math.abs(hash) % 20); // 40-60% for softer colors
  const lightness = 75 + (Math.abs(hash) % 15); // 75-90% for lighter colors

  // Convert HSL to hex
  const hslToHex = (h: number, s: number, l: number) => {
    l /= 100;
    const a = (s * Math.min(l, 1 - l)) / 100;
    const f = (n: number) => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color)
        .toString(16)
        .padStart(2, "0");
    };
    return `#${f(0)}${f(8)}${f(4)}`;
  };

  return hslToHex(hue, saturation, lightness);
};

// Get color for department with fallback
const getDepartmentColor = (department: string | null): string => {
  if (!department) return "#6B7280"; // Default gray
  return DEPARTMENT_COLORS[department] || generateDepartmentColor(department);
};

// Helper function to strip HTML tags from text
const stripHtmlTags = (html: string): string => {
  if (!html) return "";
  // Remove HTML tags and decode HTML entities
  return html
    .replace(/<[^>]*>/g, "") // Remove HTML tags
    .replace(/&nbsp;/g, " ") // Replace &nbsp; with space
    .replace(/&amp;/g, "&") // Replace &amp; with &
    .replace(/&lt;/g, "<") // Replace &lt; with <
    .replace(/&gt;/g, ">") // Replace &gt; with >
    .replace(/&quot;/g, '"') // Replace &quot; with "
    .replace(/&#39;/g, "'") // Replace &#39; with '
    .trim(); // Remove leading/trailing whitespace
};

// Convert project to GSTC format
const convertProjectToGanttItem = (
  project: ProjectWithRelations,
  selectedYears: number[],
) => {
  const originalStartDate = project.calculated_start_date
    ? new Date(project.calculated_start_date)
    : new Date();

  const originalEndDate = project.calculated_end_date
    ? new Date(project.calculated_end_date)
    : addDays(originalStartDate, 30);

  // Truncate dates to selected year range
  const yearStart = new Date(Math.min(...selectedYears), 0, 1);
  const yearEnd = new Date(Math.max(...selectedYears), 11, 31);

  const startDate =
    originalStartDate < yearStart ? yearStart : originalStartDate;
  const endDate = originalEndDate > yearEnd ? yearEnd : originalEndDate;

  // Calculate progress based on milestone completion
  let progress = 0;
  if (project.milestones && project.milestones.length > 0) {
    const totalCompletion = project.milestones.reduce(
      (sum, m) => sum + m.completion,
      0,
    );
    progress = Math.round(totalCompletion / project.milestones.length);
  }

  const departmentColor = getDepartmentColor(project.department);

  // GSTC requires all IDs to start with "gstcid-"
  const gstcId = `gstcid-${project.id}`;

  return {
    id: gstcId,
    label: stripHtmlTags(project.title),
    time: {
      start: startDate.getTime(),
      end: endDate.getTime(),
    },
    style: {
      backgroundColor: departmentColor,
      color: "#000000",
      fontWeight: "600",
      borderRadius: "8px",
      border: "1px solid rgba(0,0,0,0.1)",
    },
    progress: progress,
    project: project, // Store full project data for tooltip
    originalStart: originalStartDate,
    originalEnd: originalEndDate,
    originalId: project.id, // Keep original ID for reference
  };
};

// Custom tooltip content for GSTC
const createTooltipContent = (item: any) => {
  const project = item.project as ProjectWithRelations;
  if (!project) return "";

  const healthColor =
    project.computed_status_color || project.manual_status_color || "green";
  const healthText =
    healthColor === "green"
      ? "On Track"
      : healthColor === "yellow"
        ? "At Risk"
        : "Critical";

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const timeRemainingPercentage =
    project.total_days && project.total_days_remaining !== null
      ? Math.max(
          0,
          Math.min(
            100,
            Math.round(
              (project.total_days_remaining / project.total_days) * 100,
            ),
          ),
        )
      : null;

  return `
    <div class="bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-sm">
      <div class="space-y-3">
        <div>
          <h3 class="font-semibold text-gray-900 text-sm leading-tight">
            ${stripHtmlTags(project.title)}
          </h3>
          ${project.department ? `<span class="inline-block mt-1 px-2 py-1 text-xs border rounded" style="border-color: ${getDepartmentColor(project.department)}">${project.department}</span>` : ""}
        </div>
        
        <div class="flex items-center gap-2">
          <span class="text-xs text-gray-600">Health:</span>
          <span class="px-2 py-1 text-xs rounded ${
            healthColor === "green"
              ? "bg-green-100 text-green-800"
              : healthColor === "yellow"
                ? "bg-yellow-100 text-yellow-800"
                : "bg-red-100 text-red-800"
          }">${healthText}</span>
        </div>
        
        <div class="flex items-center gap-2">
          <span class="text-xs text-gray-600">Progress:</span>
          <div class="flex-1 bg-gray-200 rounded-full h-2">
            <div class="h-2 rounded-full" style="width: ${item.progress}%; background-color: ${getDepartmentColor(project.department)}"></div>
          </div>
          <span class="text-xs font-medium">${item.progress}%</span>
        </div>
        
        <div class="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span class="text-gray-600">Start:</span>
            <div class="font-medium">${format(new Date(item.time.start), "MMM dd, yyyy")}</div>
          </div>
          <div>
            <span class="text-gray-600">End:</span>
            <div class="font-medium">${format(new Date(item.time.end), "MMM dd, yyyy")}</div>
          </div>
        </div>
        
        ${
          timeRemainingPercentage !== null
            ? `
          <div class="flex items-center gap-2">
            <span class="text-xs text-gray-600">
              ${project.total_days_remaining} days remaining (${timeRemainingPercentage}%)
            </span>
          </div>
        `
            : ""
        }
        
        <div class="border-t pt-2">
          <div class="grid grid-cols-3 gap-2 text-xs">
            <div>
              <span class="text-gray-600">Budget:</span>
              <div class="font-medium">${formatCurrency(project.budget_total)}</div>
            </div>
            <div>
              <span class="text-gray-600">Spent:</span>
              <div class="font-medium">${formatCurrency(project.budget_actuals)}</div>
            </div>
            <div>
              <span class="text-gray-600">Forecast:</span>
              <div class="font-medium">${formatCurrency(project.budget_forecast)}</div>
            </div>
          </div>
        </div>
        
        <div class="border-t pt-2">
          <div class="text-xs">
            <div><strong>PM:</strong> ${project.project_manager}</div>
            ${project.sponsors ? `<div><strong>Sponsors:</strong> ${project.sponsors}</div>` : ""}
          </div>
        </div>
      </div>
    </div>
  `;
};

const ProjectsRoadmap: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [projects, setProjects] = useState<ProjectWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [ganttItems, setGanttItems] = useState<any[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [activeDepartments, setActiveDepartments] = useState<Set<string>>(
    new Set(),
  );
  const [viewMode, setViewMode] = useState<string>("month");
  const [selectedYears, setSelectedYears] = useState<number[]>([
    new Date().getFullYear(),
  ]);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [timelineStart, setTimelineStart] = useState<Date>(
    startOfYear(new Date()),
  );
  const [timelineEnd, setTimelineEnd] = useState<Date>(endOfYear(new Date()));
  const [gstcInstance, setGstcInstance] = useState<any>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(18); // Better default zoom level
  const [isInitializing, setIsInitializing] = useState(false);
  const ganttRef = useRef<HTMLDivElement>(null);
  const initTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load projects and initialize data
  useEffect(() => {
    const loadProjects = async () => {
      try {
        setLoading(true);
        const allProjects = await projectService.getAllProjects();

        // Filter to only active projects with dates
        const activeProjects = allProjects.filter(
          (project) =>
            project.status === "active" &&
            project.calculated_start_date &&
            project.calculated_end_date,
        );

        setProjects(activeProjects);

        // Extract unique departments
        const projectDepartments = activeProjects
          .map((p) => p.department)
          .filter(Boolean);

        const allProjectDepartments = allProjects
          .map((p) => p.department)
          .filter(Boolean);

        const uniqueDepartments = [
          ...new Set([...projectDepartments, ...allProjectDepartments]),
        ].sort();

        setDepartments(uniqueDepartments);
        setActiveDepartments(new Set(uniqueDepartments));

        // Determine available years and timeline range
        if (activeProjects.length > 0) {
          const startDates = activeProjects
            .map((p) => new Date(p.calculated_start_date!))
            .filter((date) => !isNaN(date.getTime()));

          const endDates = activeProjects
            .map((p) => new Date(p.calculated_end_date!))
            .filter((date) => !isNaN(date.getTime()));

          if (startDates.length > 0 && endDates.length > 0) {
            const earliestStart = new Date(
              Math.min(...startDates.map((d) => d.getTime())),
            );
            const latestEnd = new Date(
              Math.max(...endDates.map((d) => d.getTime())),
            );

            const projectStartYear = earliestStart.getFullYear();
            const projectEndYear = latestEnd.getFullYear();
            const currentYear = new Date().getFullYear();

            const years = [];
            for (
              let year = Math.min(projectStartYear, currentYear);
              year <= Math.max(projectEndYear, currentYear);
              year++
            ) {
              years.push(year);
            }
            setAvailableYears(years);

            setTimelineStart(startOfYear(new Date(currentYear, 0, 1)));
            setTimelineEnd(endOfYear(new Date(currentYear, 11, 31)));
          }
        }
      } catch (error) {
        console.error("Error loading projects:", error);
        toast({
          title: "Error",
          description: "Failed to load projects for roadmap",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadProjects();
  }, [toast]);

  // Debounced update for gantt items to prevent rapid re-initialization
  const [debouncedFilters, setDebouncedFilters] = useState({
    activeDepartments,
    selectedYears,
  });

  // Debounce filter changes to prevent rapid re-initialization
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedFilters({ activeDepartments, selectedYears });
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [activeDepartments, selectedYears]);

  // Update gantt items when projects or debounced filters change
  useEffect(() => {
    const filteredProjects = projects.filter((project) => {
      const departmentMatch =
        !project.department ||
        debouncedFilters.activeDepartments.has(project.department) ||
        Array.from(debouncedFilters.activeDepartments).some(
          (activeDept) =>
            project.department &&
            (project.department.toLowerCase() === activeDept.toLowerCase() ||
              project.department
                .toLowerCase()
                .includes(activeDept.toLowerCase()) ||
              activeDept
                .toLowerCase()
                .includes(project.department.toLowerCase())),
        );

      const yearMatch = debouncedFilters.selectedYears.some((year) => {
        const yearStart = new Date(year, 0, 1);
        const yearEnd = new Date(year, 11, 31);
        const projectStart = new Date(project.calculated_start_date!);
        const projectEnd = new Date(project.calculated_end_date!);
        return projectStart <= yearEnd && projectEnd >= yearStart;
      });

      return departmentMatch && yearMatch;
    });

    const ganttData = filteredProjects.map((project) =>
      convertProjectToGanttItem(project, debouncedFilters.selectedYears),
    );
    setGanttItems(ganttData);

    // Calculate timeline range based on actual project dates and selected years
    if (filteredProjects.length > 0) {
      const projectStartDates = filteredProjects
        .map((p) => new Date(p.calculated_start_date!))
        .filter((date) => !isNaN(date.getTime()));

      const projectEndDates = filteredProjects
        .map((p) => new Date(p.calculated_end_date!))
        .filter((date) => !isNaN(date.getTime()));

      if (projectStartDates.length > 0 && projectEndDates.length > 0) {
        const earliestProject = new Date(
          Math.min(...projectStartDates.map((d) => d.getTime())),
        );
        const latestProject = new Date(
          Math.max(...projectEndDates.map((d) => d.getTime())),
        );

        // Expand timeline to include some buffer and respect year selection
        const yearStart = new Date(
          Math.min(...debouncedFilters.selectedYears),
          0,
          1,
        );
        const yearEnd = new Date(
          Math.max(...debouncedFilters.selectedYears),
          11,
          31,
        );

        const timelineStartDate = new Date(
          Math.min(earliestProject.getTime(), yearStart.getTime()),
        );
        const timelineEndDate = new Date(
          Math.max(latestProject.getTime(), yearEnd.getTime()),
        );

        // Add buffer (1 month before and after)
        setTimelineStart(addDays(timelineStartDate, -30));
        setTimelineEnd(addDays(timelineEndDate, 30));
      } else {
        // Fallback to year-based timeline
        setTimelineStart(
          startOfYear(
            new Date(Math.min(...debouncedFilters.selectedYears), 0, 1),
          ),
        );
        setTimelineEnd(
          endOfYear(
            new Date(Math.max(...debouncedFilters.selectedYears), 11, 31),
          ),
        );
      }
    } else if (debouncedFilters.selectedYears.length > 0) {
      setTimelineStart(
        startOfYear(
          new Date(Math.min(...debouncedFilters.selectedYears), 0, 1),
        ),
      );
      setTimelineEnd(
        endOfYear(
          new Date(Math.max(...debouncedFilters.selectedYears), 11, 31),
        ),
      );
    }
  }, [projects, debouncedFilters]);

  // Cleanup function for GSTC instance
  const cleanupGstcInstance = useCallback(() => {
    if (gstcInstance) {
      try {
        if (typeof gstcInstance.destroy === "function") {
          gstcInstance.destroy();
        }
      } catch (error) {
        console.warn("GSTC: Error destroying instance:", error);
      }
      setGstcInstance(null);
    }
  }, [gstcInstance]);

  // Update GSTC instance safely
  const updateGstcInstance = useCallback(
    (updates: Record<string, any>) => {
      if (!gstcInstance || !gstcInstance.state) {
        return false;
      }

      try {
        Object.entries(updates).forEach(([key, value]) => {
          gstcInstance.state.update(key, value);
        });
        return true;
      } catch (error) {
        console.warn("GSTC: Error updating instance:", error);
        return false;
      }
    },
    [gstcInstance],
  );

  // Zoom control functions - GSTC uses lower numbers for zoomed out, higher for zoomed in
  const handleZoomIn = useCallback(() => {
    if (zoomLevel < 25) {
      const newZoom = Math.min(zoomLevel + 1, 25);
      setZoomLevel(newZoom);
    }
  }, [zoomLevel]);

  const handleZoomOut = useCallback(() => {
    if (zoomLevel > 10) {
      // Set minimum to 10 instead of 0 for better usability
      const newZoom = Math.max(zoomLevel - 1, 10);
      setZoomLevel(newZoom);
    }
  }, [zoomLevel]);

  const handleFitAll = useCallback(() => {
    if (ganttItems.length > 0) {
      // Calculate optimal zoom level based on timeline range
      const timeRange = timelineEnd.getTime() - timelineStart.getTime();
      const daysRange = timeRange / (1000 * 60 * 60 * 24);

      let optimalZoom;
      if (daysRange <= 30) {
        optimalZoom = 22; // Day view for short projects
      } else if (daysRange <= 90) {
        optimalZoom = 20; // Week view for quarterly projects
      } else if (daysRange <= 365) {
        optimalZoom = 18; // Month view for yearly projects
      } else {
        optimalZoom = 15; // Quarter view for multi-year projects
      }

      setZoomLevel(optimalZoom);
    }
  }, [ganttItems.length, timelineEnd, timelineStart]);

  // Update zoom level when view mode changes
  const handleViewModeChange = useCallback((newViewMode: string) => {
    setViewMode(newViewMode);

    // Set appropriate zoom levels for each view mode
    let newZoom;
    switch (newViewMode) {
      case "day":
        newZoom = 22;
        break;
      case "week":
        newZoom = 20;
        break;
      case "month":
        newZoom = 18;
        break;
      case "quarter":
        newZoom = 16;
        break;
      case "year":
        newZoom = 14;
        break;
      default:
        newZoom = 18;
    }

    setZoomLevel(newZoom);
  }, []);

  // Debounced zoom level updates to prevent rapid changes
  const [debouncedZoomLevel, setDebouncedZoomLevel] = useState(zoomLevel);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedZoomLevel(zoomLevel);
    }, 100); // 100ms debounce for zoom

    return () => clearTimeout(timeoutId);
  }, [zoomLevel]);

  // Effect to update GSTC when debounced zoom level changes - with stability checks
  useEffect(() => {
    if (gstcInstance && gstcInstance.state && !isInitializing) {
      try {
        console.log("GSTC: Updating zoom level to", debouncedZoomLevel);
        gstcInstance.state.update("config.chart.time.zoom", debouncedZoomLevel);
        gstcInstance.state.update(
          "config.chart.time.from",
          timelineStart.getTime(),
        );
        gstcInstance.state.update(
          "config.chart.time.to",
          timelineEnd.getTime(),
        );
      } catch (error) {
        console.warn("GSTC: Error updating zoom level:", error);
      }
    }
  }, [
    debouncedZoomLevel,
    timelineStart,
    timelineEnd,
    gstcInstance,
    isInitializing,
  ]);

  // Memoize GSTC data to prevent unnecessary recalculations
  const gstcData = useMemo(() => {
    if (ganttItems.length === 0) {
      return null;
    }

    // Validate ganttItems data
    const validGanttItems = ganttItems.filter((item) => {
      if (!item || !item.id || !item.label || !item.time) {
        return false;
      }
      if (!item.time.start || !item.time.end) {
        return false;
      }
      // Ensure ID has proper gstcid- prefix
      if (!item.id.startsWith("gstcid-")) {
        item.id = `gstcid-${item.id}`;
      }
      return true;
    });

    if (validGanttItems.length === 0) {
      return null;
    }

    // Prepare data
    const rowsData = {};
    const itemsData = {};

    validGanttItems.forEach((item) => {
      const gstcId = item.id;
      rowsData[gstcId] = {
        id: gstcId,
        label: item.label || "Untitled Project",
      };
      itemsData[gstcId] = {
        id: gstcId,
        rowId: gstcId,
        label: item.label || "Untitled Project",
        time: {
          start: item.time.start,
          end: item.time.end,
        },
        style: item.style || {},
      };
    });

    const timelineStartTime = timelineStart
      ? timelineStart.getTime()
      : Date.now();
    const timelineEndTime = timelineEnd
      ? timelineEnd.getTime()
      : Date.now() + 365 * 24 * 60 * 60 * 1000;

    if (timelineStartTime >= timelineEndTime) {
      return null;
    }

    return {
      validGanttItems,
      rowsData,
      itemsData,
      timelineStartTime,
      timelineEndTime,
    };
  }, [ganttItems, timelineStart, timelineEnd]);

  // Initialize GSTC with proper guards and stability checks
  const initializeGstc = useCallback(async () => {
    // GSTC implementation removed
    return;
  }, [gstcData, debouncedZoomLevel, gstcInstance, toast]);

  // Effect to initialize GSTC when data changes - with stability controls
  useEffect(() => {
    // GSTC removed: no-op
    return () => {
      if (initTimeoutRef.current) {
        clearTimeout(initTimeoutRef.current);
      }
    };
  }, [gstcData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log("GSTC: Component unmounting, cleaning up...");
      if (gstcInstance) {
        try {
          if (typeof gstcInstance.destroy === "function") {
            gstcInstance.destroy();
          }
        } catch (error) {
          console.warn("GSTC: Error destroying instance on unmount:", error);
        }
      }
      if (initTimeoutRef.current) {
        clearTimeout(initTimeoutRef.current);
      }
    };
  }, []); // Empty dependency array to run only on unmount

  // Toggle department visibility
  const toggleDepartment = (department: string) => {
    const newActiveDepartments = new Set(activeDepartments);
    if (newActiveDepartments.has(department)) {
      newActiveDepartments.delete(department);
    } else {
      newActiveDepartments.add(department);
    }
    setActiveDepartments(newActiveDepartments);
  };

  // Toggle all departments
  const toggleAllDepartments = () => {
    if (activeDepartments.size === departments.length) {
      setActiveDepartments(new Set());
    } else {
      setActiveDepartments(new Set(departments));
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-lg text-muted-foreground">
            Loading roadmap...
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <style>{gstcStyles}</style>
      <div className="p-4 space-y-4 bg-gradient-to-br from-blue-50 to-blue-100 min-h-screen">
        {/* Header */}
        <div className="flex items-center justify-between bg-white rounded-lg p-3 shadow-sm">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/")}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                Projects Roadmap
              </h1>
              <p className="text-sm text-gray-600">
                Interactive Gantt chart view of active projects
              </p>
            </div>
          </div>
          <img
            src="/images/rewa-logo-color.png"
            alt="ReWa Logo"
            className="h-8 w-auto"
          />
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Card className="bg-white shadow-sm">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-600" />
                <div>
                  <div className="text-lg font-bold">{ganttItems.length}</div>
                  <div className="text-xs text-gray-600">Active Projects</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-green-600" />
                <div>
                  <div className="text-lg font-bold">{departments.length}</div>
                  <div className="text-xs text-gray-600">Departments</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-purple-600" />
                <div>
                  <div className="text-lg font-bold">
                    {selectedYears.length === 1
                      ? selectedYears[0]
                      : `${Math.min(...selectedYears)} - ${Math.max(...selectedYears)}`}
                  </div>
                  <div className="text-xs text-gray-600">Timeline Span</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Controls */}
        <Card className="bg-white shadow-sm">
          <CardContent className="p-3">
            <div className="flex flex-wrap items-center gap-4">
              {/* Year Selection */}
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium">Years:</Label>
                <Select
                  value={
                    selectedYears.length === 1
                      ? selectedYears[0].toString()
                      : "multiple"
                  }
                  onValueChange={(value) => {
                    if (value === "current") {
                      setSelectedYears([new Date().getFullYear()]);
                    } else if (value === "all") {
                      setSelectedYears(availableYears);
                    } else {
                      setSelectedYears([parseInt(value)]);
                    }
                  }}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="current">Current Year</SelectItem>
                    <SelectItem value="all">All Years</SelectItem>
                    {availableYears.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* View Mode */}
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium">View:</Label>
                <Select value={viewMode} onValueChange={handleViewModeChange}>
                  <SelectTrigger className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="year">Year</SelectItem>
                    <SelectItem value="quarter">Quarter</SelectItem>
                    <SelectItem value="month">Month</SelectItem>
                    <SelectItem value="week">Week</SelectItem>
                    <SelectItem value="day">Day</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Zoom Controls */}
              <div className="flex items-center gap-1">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleZoomOut}
                        disabled={zoomLevel <= 10}
                        className="px-2"
                      >
                        <ZoomOut className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Zoom Out</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <span className="text-xs text-gray-500 px-2 min-w-[3rem] text-center">
                  {zoomLevel}
                </span>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleZoomIn}
                        disabled={zoomLevel >= 25}
                        className="px-2"
                      >
                        <ZoomIn className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Zoom In</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleFitAll}
                        className="px-2 ml-1"
                      >
                        <Maximize2 className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Fit All Projects</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              {/* Department Toggle */}
              <Button
                variant="outline"
                size="sm"
                onClick={toggleAllDepartments}
              >
                {activeDepartments.size === departments.length
                  ? "Hide All"
                  : "Show All"}{" "}
                Depts
              </Button>
            </div>

            {/* Department Filters */}
            <div className="mt-3 flex flex-wrap gap-2">
              {departments.map((department) => {
                const isActive = activeDepartments.has(department);
                const color = getDepartmentColor(department);
                const projectCount = ganttItems.filter(
                  (item) => item.project?.department === department,
                ).length;

                return (
                  <div key={department} className="flex items-center space-x-2">
                    <Switch
                      id={`dept-${department}`}
                      checked={isActive}
                      onCheckedChange={() => toggleDepartment(department)}
                      className="scale-75"
                    />
                    <Label
                      htmlFor={`dept-${department}`}
                      className="flex items-center gap-1 cursor-pointer text-xs"
                    >
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      <span>{department}</span>
                      <Badge variant="secondary" className="text-xs px-1 py-0">
                        {projectCount}
                      </Badge>
                    </Label>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Gantt Chart */}
        <Card className="bg-white shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">
              Project Timeline - Gantt Chart
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            <div className="w-full">
              {ganttItems.length > 0 ? (
                <>
                  <div className="mb-2 text-sm text-gray-600">
                    Displaying {ganttItems.length} project
                    {ganttItems.length !== 1 ? "s" : ""}
                  </div>
                  <div
                    ref={ganttRef}
                    className="w-full border border-gray-200 rounded gantt-container"
                    style={{
                      minHeight: "600px",
                      height: "600px",
                      backgroundColor: "#ffffff",
                      position: "relative",
                      overflow: "hidden",
                    }}
                  >
                    {/* Initial loading state - will be replaced by GSTC */}
                    <div className="flex items-center justify-center h-full text-gray-500">
                      <div className="text-center">
                        <div className="animate-spin h-6 w-6 border-2 border-blue-500 rounded-full border-t-transparent mx-auto mb-2" />
                        <div>Initializing Gantt Chart...</div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <Calendar className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <h3 className="text-sm font-medium text-gray-900 mb-1">
                    No projects to display
                  </h3>
                  <p className="text-xs text-gray-600">
                    {activeDepartments.size === 0
                      ? "Select departments to view their projects"
                      : "No active projects found with timeline data"}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Legend */}
        <Card className="bg-white shadow-sm">
          <CardContent className="p-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <h4 className="font-medium mb-2 text-sm">Department Colors</h4>
                <div className="flex flex-wrap gap-2">
                  {departments
                    .filter((dept) => activeDepartments.has(dept))
                    .map((dept) => {
                      const color = getDepartmentColor(dept);
                      return (
                        <div key={dept} className="flex items-center gap-1">
                          <div
                            className="w-3 h-3 rounded"
                            style={{ backgroundColor: color }}
                          />
                          <span className="text-xs">{dept}</span>
                        </div>
                      );
                    })}
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-2 text-sm">Features</h4>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li>• Hover over project bars for detailed information</li>
                  <li>• Use year selector to focus timeline view</li>
                  <li>• Toggle departments to filter projects</li>
                  <li>• Change view mode for different time scales</li>
                  <li>• Use zoom controls (+/-) to adjust detail level</li>
                  <li>
                    • Click "Fit All" to auto-adjust zoom to show all projects
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default ProjectsRoadmap;