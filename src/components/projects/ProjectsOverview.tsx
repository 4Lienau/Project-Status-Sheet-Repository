/**
 * File: ProjectsOverview.tsx
 * Purpose: Component for displaying a tabular overview of all projects with detailed metrics
 * Description: This component renders a comprehensive table view of all projects with columns for
 * key metrics like status, completion, budget, milestones, and risks. It includes filtering options,
 * Excel export functionality, and navigation to project details. The component also handles loading
 * states and user permissions based on department.
 */

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { Loader2 } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  Eye,
  EyeOff,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Briefcase,
  Activity,
  DollarSign,
  TrendingUp,
} from "lucide-react";
import {
  projectService,
  calculateProjectHealthStatusColor,
  calculateTimeRemainingPercentage,
  getTimeRemainingTooltipText,
} from "@/lib/services/project";
import { formatDistanceToNow } from "date-fns";
import { FileSpreadsheet, ArrowLeft, ExternalLink } from "lucide-react";
import { exportProjectsToExcel } from "@/lib/services/excelExport";
import { useToast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getColumnResizeMode,
  flexRender,
  createColumnHelper,
  SortingState,
  ColumnDef,
  ColumnResizeMode,
  PaginationState,
} from "@tanstack/react-table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X } from "lucide-react";
import {
  loadUserPreferences,
  saveUserPreferences,
  getDefaultPreferences,
  type ProjectsOverviewPreferences,
} from "@/lib/services/userPreferencesService";

interface ProjectsOverviewProps {
  onBack: () => void;
  filterManager?: string | string[];
  filterStatus?: string;
  filterDepartment?: string;
  filterStatusHealth?: string;
}

// Define project type for better type safety
type ProjectData = {
  id: string;
  project_id?: string;
  title: string;
  department?: string;
  status: string;
  project_manager?: string;
  milestones?: any[];
  budget_total?: number;
  budget_actuals?: number;
  budget_forecast?: number;
  working_days_remaining?: number;
  calculated_end_date?: string;
  total_days?: number;
  [key: string]: any;
};

const columnHelper = createColumnHelper<ProjectData>();

const ProjectsOverview: React.FC<ProjectsOverviewProps> = ({
  onBack,
  filterManager,
  filterStatus,
  filterDepartment,
  filterStatusHealth,
}) => {
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  
  // Initialize state with default values (will be overridden by saved preferences or props)
  const defaultPrefs = getDefaultPreferences();
  const [sorting, setSorting] = useState<SortingState>(defaultPrefs.sorting);
  const [columnResizeMode, setColumnResizeMode] =
    useState<ColumnResizeMode>("onChange");
  const [globalFilter, setGlobalFilter] = useState("");
  const [columnVisibility, setColumnVisibility] = useState(defaultPrefs.columnVisibility);
  const [pagination, setPagination] = useState<PaginationState>(defaultPrefs.pagination);

  // Local filter states - initialize with defaults only, let useEffect handle props/saved preferences
  const [localProjectIdFilter, setLocalProjectIdFilter] = useState(defaultPrefs.filters.projectId);
  const [localStatusFilter, setLocalStatusFilter] = useState(defaultPrefs.filters.status);
  const [localHealthStatusFilter, setLocalHealthStatusFilter] = useState(defaultPrefs.filters.healthStatus);
  const [localDepartmentFilter, setLocalDepartmentFilter] = useState(defaultPrefs.filters.department);
  const [localManagerFilter, setLocalManagerFilter] = useState(defaultPrefs.filters.manager);

  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<{ full_name: string | null }>({
    full_name: null,
  });

  // Load user preferences on mount - ONLY ONCE
  useEffect(() => {
    if (user?.id && !preferencesLoaded) {
      const savedPreferences = loadUserPreferences(user.id);
      
      if (savedPreferences) {
        console.log("Loading saved user preferences:", savedPreferences);
        
        // Apply saved preferences for sorting, columns, and pagination
        setSorting(savedPreferences.sorting);
        setColumnVisibility(savedPreferences.columnVisibility);
        setPagination(savedPreferences.pagination);
        
        // Apply saved filters - ALWAYS use saved preferences, ignore props
        // Props are only for initial navigation, not for restoring user preferences
        setLocalProjectIdFilter(savedPreferences.filters.projectId || "");
        setLocalStatusFilter(savedPreferences.filters.status || "all");
        setLocalHealthStatusFilter(savedPreferences.filters.healthStatus || "all");
        setLocalDepartmentFilter(savedPreferences.filters.department || "all");
        setLocalManagerFilter(savedPreferences.filters.manager || "all");
      }
      
      setPreferencesLoaded(true);
    }
  }, [user?.id]); // Only depend on user.id, run once when user is available

  // Save preferences whenever they change (debounced)
  useEffect(() => {
    // Don't save until preferences are loaded and user is authenticated
    if (!user?.id || !preferencesLoaded) {
      return;
    }

    const timeoutId = setTimeout(() => {
      const preferences: ProjectsOverviewPreferences = {
        sorting,
        columnVisibility,
        pagination,
        filters: {
          projectId: localProjectIdFilter,
          status: localStatusFilter,
          healthStatus: localHealthStatusFilter,
          department: localDepartmentFilter,
          manager: localManagerFilter,
        },
      };

      console.log("Saving user preferences:", preferences);
      saveUserPreferences(user.id, preferences);
    }, 500); // Debounce for 500ms

    return () => clearTimeout(timeoutId);
  }, [
    user?.id,
    preferencesLoaded,
    sorting,
    columnVisibility,
    pagination,
    localProjectIdFilter,
    localStatusFilter,
    localHealthStatusFilter,
    localDepartmentFilter,
    localManagerFilter,
  ]);

  // Calculate overall completion for a project
  const calculateCompletion = (project: any) => {
    if (!project.milestones || project.milestones.length === 0) return 0;
    return Math.round(
      project.milestones.reduce(
        (acc: number, m: any) => acc + m.completion,
        0,
      ) / project.milestones.length,
    );
  };

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value || 0);
  };

  // Get budget status
  const getBudgetStatus = (
    total: number,
    actuals: number,
    forecast: number,
  ) => {
    if (actuals + forecast > total) return "At Risk";
    if (actuals > total) return "Over Budget";
    return "On Budget";
  };

  // Extract unique values for filters
  const uniqueProjectIds = useMemo(() => {
    const ids = projects
      .map((p) => p.project_id)
      .filter((id) => id)
      .sort();
    return Array.from(new Set(ids));
  }, [projects]);

  const uniqueDepartments = useMemo(() => {
    const depts = projects
      .map((p) => p.department)
      .filter((d) => d)
      .sort();
    return Array.from(new Set(depts));
  }, [projects]);

  const uniqueManagers = useMemo(() => {
    const managers = projects
      .map((p) => p.project_manager)
      .filter((m) => m)
      .sort();
    return Array.from(new Set(managers));
  }, [projects]);

  // Apply local filters to the table data
  const filteredProjects = useMemo(() => {
    let filtered = [...projects];

    // Project ID filter
    if (localProjectIdFilter && localProjectIdFilter !== "all") {
      filtered = filtered.filter((p) => p.project_id === localProjectIdFilter);
    }

    // Status filter
    if (localStatusFilter && localStatusFilter !== "all") {
      filtered = filtered.filter((p) => p.status === localStatusFilter);
    }

    // Health status filter
    if (localHealthStatusFilter && localHealthStatusFilter !== "all") {
      filtered = filtered.filter((project) => {
        if (localHealthStatusFilter === "red" && project.status === "cancelled") {
          return false;
        }
        let statusHealthColor = project.computed_status_color;
        if (!statusHealthColor) {
          statusHealthColor = calculateProjectHealthStatusColor(project);
        }
        return statusHealthColor === localHealthStatusFilter;
      });
    }

    // Department filter
    if (localDepartmentFilter && localDepartmentFilter !== "all") {
      filtered = filtered.filter((p) => p.department === localDepartmentFilter);
    }

    // Manager filter
    if (localManagerFilter && localManagerFilter !== "all") {
      filtered = filtered.filter((p) => p.project_manager === localManagerFilter);
    }

    return filtered;
  }, [projects, localProjectIdFilter, localStatusFilter, localHealthStatusFilter, localDepartmentFilter, localManagerFilter]);

  // Check if any filters are active
  const hasActiveFilters = 
    (localProjectIdFilter && localProjectIdFilter !== "all") ||
    (localStatusFilter && localStatusFilter !== "all") ||
    (localHealthStatusFilter && localHealthStatusFilter !== "all") ||
    (localDepartmentFilter && localDepartmentFilter !== "all") ||
    (localManagerFilter && localManagerFilter !== "all");

  // Clear all filters
  const clearAllFilters = () => {
    setLocalProjectIdFilter("");
    setLocalStatusFilter("all");
    setLocalHealthStatusFilter("all");
    setLocalDepartmentFilter("all");
    setLocalManagerFilter("all");
  };

  // Define columns using TanStack Table
  const columns = useMemo<ColumnDef<ProjectData>[]>(
    () => [
      columnHelper.accessor("project_id", {
        id: "project_id",
        header: "Project ID",
        size: 120,
        minSize: 100,
        maxSize: 180,
        enableResizing: true,
        cell: (info) => (
          <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-sm font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10 whitespace-nowrap">
            {info.getValue() || "—"}
          </span>
        ),
        sortingFn: "alphanumeric",
      }),
      columnHelper.accessor("title", {
        id: "title",
        header: "Project",
        size: 250,
        minSize: 200,
        maxSize: 350,
        enableResizing: true,
        cell: (info) => {
          const project = info.row.original;
          return (
            <div className="flex items-center gap-2 font-medium text-blue-600 hover:text-blue-800 hover:underline cursor-pointer">
              <span className="truncate">
                {project.title.replace(/<[^>]*>/g, "")}
              </span>
              <ExternalLink className="h-3 w-3 text-muted-foreground flex-shrink-0" />
            </div>
          );
        },
        sortingFn: (rowA, rowB) => {
          const a =
            rowA.original.title?.replace(/<[^>]*>/g, "").toLowerCase() || "";
          const b =
            rowB.original.title?.replace(/<[^>]*>/g, "").toLowerCase() || "";
          return a.localeCompare(b);
        },
      }),
      columnHelper.accessor("department", {
        id: "department",
        header: "Department",
        size: 110,
        minSize: 100,
        maxSize: 150,
        enableResizing: true,
        cell: (info) => info.getValue() || "—",
      }),
      columnHelper.accessor("status", {
        id: "status",
        header: "Status",
        size: 90,
        minSize: 80,
        maxSize: 120,
        enableResizing: true,
        cell: (info) => {
          const statusClasses = {
            active: "bg-green-100 text-green-800 border border-green-200",
            on_hold: "bg-yellow-100 text-yellow-800 border border-yellow-200",
            completed: "bg-blue-100 text-blue-800 border border-blue-200",
            cancelled: "bg-red-100 text-red-800 border border-red-200",
            draft: "bg-gray-100 text-gray-800 border border-gray-200",
          };

          const status = info.getValue() || "active";
          const displayStatus =
            status.replace("_", " ").charAt(0).toUpperCase() +
            status.slice(1).replace("_", " ");

          return (
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusClasses[status]}`}
            >
              {displayStatus}
            </span>
          );
        },
      }),
      columnHelper.accessor("project_manager", {
        id: "project_manager",
        header: "Project Manager",
        size: 130,
        minSize: 120,
        maxSize: 180,
        enableResizing: true,
        cell: (info) => info.getValue() || "—",
      }),
      columnHelper.accessor((row) => calculateProjectHealthStatusColor(row), {
        id: "health_status",
        header: "Health Status",
        size: 130,
        enableSorting: true,
        sortingFn: (rowA, rowB) => {
          const a = calculateProjectHealthStatusColor(rowA.original);
          const b = calculateProjectHealthStatusColor(rowB.original);
          // Sort order: green < yellow < red < finished
          const order = { green: 0, yellow: 1, red: 2, finished: 3 };
          return order[a] - order[b];
        },
        cell: (info) => {
          const healthStatus = info.getValue();
          const project = info.row.original;

          // Show "Finished" for completed projects
          if (project.status === 'completed') {
            return (
              <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                Finished
              </span>
            );
          }

          // Don't show health status for cancelled projects
          if (project.status === "cancelled") {
            return (
              <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                Cancelled
              </span>
            );
          }

          const statusConfig = {
            green: {
              label: "On Track",
              className: "bg-green-100 text-green-800 border border-green-200",
            },
            yellow: {
              label: "At Risk",
              className:
                "bg-yellow-100 text-yellow-800 border border-yellow-200",
            },
            red: {
              label: "Critical",
              className: "bg-red-100 text-red-800 border border-red-200",
            },
          };

          const config = statusConfig[healthStatus] || statusConfig.green;

          return (
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.className}`}
            >
              {config.label}
            </span>
          );
        },
      }),
      columnHelper.accessor((row) => calculateCompletion(row), {
        id: "completion",
        header: "Completion",
        size: 120,
        minSize: 110,
        maxSize: 150,
        enableResizing: true,
        enableSorting: true,
        sortingFn: (rowA, rowB) => {
          const a = calculateCompletion(rowA.original);
          const b = calculateCompletion(rowB.original);
          return a - b;
        },
        cell: (info) => {
          const completion = info.getValue();
          return (
            <div className="flex items-center gap-2">
              <div className="w-12 text-center">{completion}%</div>
              <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full ${
                    completion === 100
                      ? "bg-blue-500"
                      : completion >= 50
                        ? "bg-green-500"
                        : "bg-yellow-500"
                  }`}
                  style={{ width: `${completion}%` }}
                ></div>
              </div>
            </div>
          );
        },
      }),
      columnHelper.accessor("budget_total", {
        id: "budget_total",
        header: "Budget",
        size: 90,
        minSize: 80,
        maxSize: 120,
        enableResizing: true,
        cell: (info) => formatCurrency(info.getValue()),
      }),
      columnHelper.accessor("budget_actuals", {
        id: "budget_actuals",
        header: "Actuals",
        size: 90,
        minSize: 80,
        maxSize: 120,
        enableResizing: true,
        cell: (info) => formatCurrency(info.getValue()),
      }),
      columnHelper.accessor(
        (row) => (row.budget_total || 0) - (row.budget_actuals || 0),
        {
          id: "budget_remaining",
          header: "Budget Remaining",
          size: 120,
          minSize: 110,
          maxSize: 150,
          enableResizing: true,
          enableSorting: true,
          sortingFn: (rowA, rowB) => {
            const a =
              (rowA.original.budget_total || 0) -
              (rowA.original.budget_actuals || 0);
            const b =
              (rowB.original.budget_total || 0) -
              (rowB.original.budget_actuals || 0);
            return a - b;
          },
          cell: (info) => {
            const remaining = info.getValue();
            const isNegative = remaining < 0;
            return (
              <span className={isNegative ? "text-red-600 font-semibold" : ""}>
                {formatCurrency(remaining)}
              </span>
            );
          },
        },
      ),
      columnHelper.accessor("budget_forecast", {
        id: "budget_forecast",
        header: "Forecast",
        size: 90,
        minSize: 80,
        maxSize: 120,
        enableResizing: true,
        cell: (info) => formatCurrency(info.getValue()),
      }),
      columnHelper.accessor(
        (row) =>
          getBudgetStatus(
            row.budget_total,
            row.budget_actuals,
            row.budget_forecast,
          ),
        {
          id: "budget_status",
          header: "Budget Status",
          size: 110,
          minSize: 100,
          maxSize: 140,
          enableResizing: true,
          enableSorting: true,
          sortingFn: (rowA, rowB) => {
            const a = getBudgetStatus(
              rowA.original.budget_total,
              rowA.original.budget_actuals,
              rowA.original.budget_forecast,
            );
            const b = getBudgetStatus(
              rowB.original.budget_total,
              rowB.original.budget_actuals,
              rowB.original.budget_forecast,
            );
            // Sort order: On Budget < At Risk < Over Budget
            const order = { "On Budget": 0, "At Risk": 1, "Over Budget": 2 };
            return order[a] - order[b];
          },
          cell: (info) => {
            const budgetStatus = info.getValue();

            const statusClasses = {
              "On Budget":
                "bg-green-100 text-green-800 border border-green-200",
              "At Risk":
                "bg-yellow-100 text-yellow-800 border border-yellow-200",
              "Over Budget": "bg-red-100 text-red-800 border border-red-200",
            };

            return (
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusClasses[budgetStatus]}`}
              >
                {budgetStatus}
              </span>
            );
          },
        },
      ),
      columnHelper.accessor("milestones", {
        id: "milestones",
        header: "Milestones",
        size: 90,
        minSize: 80,
        maxSize: 120,
        enableResizing: true,
        cell: (info) => (
          <div className="text-center">{info.getValue()?.length || 0}</div>
        ),
        sortingFn: (rowA, rowB) => {
          const a = rowA.original.milestones?.length || 0;
          const b = rowB.original.milestones?.length || 0;
          return a - b;
        },
      }),
      columnHelper.accessor("working_days_remaining", {
        id: "working_days_remaining",
        header: "Days Left",
        size: 90,
        minSize: 80,
        maxSize: 120,
        enableResizing: true,
        cell: (info) => {
          const daysRemaining = info.getValue();
          const project = info.row.original;

          // Show 0 for completed projects
          if (project.status === 'completed') {
            return <div className="text-center text-blue-600 font-medium">0</div>;
          }

          if (daysRemaining === null || daysRemaining === undefined) {
            return <div className="text-center">—</div>;
          }

          // Calculate time remaining percentage for tooltip
          const timeRemainingPercentage =
            calculateTimeRemainingPercentage(project);
          const tooltipText =
            timeRemainingPercentage && timeRemainingPercentage > 100
              ? getTimeRemainingTooltipText(project, timeRemainingPercentage)
              : null;

          // Color code based on days remaining
          let colorClass = "text-green-600";
          if (daysRemaining < 0) {
            colorClass = "text-red-600 font-semibold";
          } else if (daysRemaining <= 30) {
            colorClass = "text-yellow-600 font-medium";
          }

          const daysDisplay = (
            <div className="text-center">
              <span className={colorClass}>
                {daysRemaining < 0
                  ? `${Math.abs(daysRemaining)} overdue`
                  : `${daysRemaining}d`}
              </span>
              {timeRemainingPercentage && timeRemainingPercentage > 100 && (
                <div className="text-xs text-orange-600 font-medium mt-1">
                  {timeRemainingPercentage}% time left
                </div>
              )}
            </div>
          );

          // Wrap with tooltip if percentage is over 100%
          if (tooltipText) {
            return (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="cursor-help">{daysDisplay}</div>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-sm">{tooltipText}</p>
                </TooltipContent>
              </Tooltip>
            );
          }

          return daysDisplay;
        },
      }),
      columnHelper.accessor("calculated_end_date", {
        id: "calculated_end_date",
        header: "End Date",
        size: 100,
        minSize: 90,
        maxSize: 130,
        enableResizing: true,
        cell: (info) => {
          const date = info.getValue();
          if (!date) return <div className="text-center">—</div>;
          return (
            <div className="text-center">
              {new Date(date).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "2-digit",
              })}
            </div>
          );
        },
      }),
      columnHelper.accessor("total_days", {
        id: "total_days",
        header: "Duration",
        size: 90,
        minSize: 80,
        maxSize: 120,
        enableResizing: true,
        cell: (info) => {
          const totalDays = info.getValue();
          if (totalDays === null || totalDays === undefined) {
            return <div className="text-center">—</div>;
          }
          return <div className="text-center">{totalDays}d</div>;
        },
      }),
      columnHelper.accessor("updated_at", {
        id: "last_updated",
        header: "Last Updated",
        size: 120,
        minSize: 110,
        maxSize: 150,
        enableResizing: true,
        enableSorting: true,
        sortingFn: (rowA, rowB) => {
          const a = rowA.original.updated_at;
          const b = rowB.original.updated_at;
          if (!a && !b) return 0;
          if (!a) return 1;
          if (!b) return -1;
          return new Date(b).getTime() - new Date(a).getTime();
        },
        cell: (info) => {
          const updatedAt = info.getValue();
          if (!updatedAt) {
            return <div className="text-center text-muted-foreground">—</div>;
          }

          try {
            const timeAgo = formatDistanceToNow(new Date(updatedAt), {
              addSuffix: true,
            });
            return (
              <div className="text-center text-sm text-muted-foreground">{timeAgo}</div>
            );
          } catch (error) {
            return <div className="text-center text-muted-foreground">—</div>;
          }
        },
      }),
    ],
    [],
  );

  // Load user profile
  useEffect(() => {
    if (user?.id) {
      supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single()
        .then(({ data }) => {
          if (data) {
            setProfile(data);
          }
        });
    }
  }, [user?.id]);

  // Load projects with filters
  useEffect(() => {
    const loadProjects = async () => {
      setLoading(true);
      console.log("ProjectsOverview (FIXED) - Loading projects with filters:", {
        filterManager,
        filterStatus,
        filterDepartment,
        filterStatusHealth,
      });

      try {
        // Get user's department
        let userDepartment = "";
        let userEmail = "";
        let userName = "";

        if (user?.id) {
          const { data: userData } = await supabase
            .from("profiles")
            .select("department, email, full_name")
            .eq("id", user.id)
            .single();

          if (userData) {
            userDepartment = userData.department || "";
            userEmail = userData.email || user.email || "";
            userName = userData.full_name || "";
          } else {
            userEmail = user.email || "";
          }
        }

        // Get all projects with their related data
        const allProjectsData = await projectService.getAllProjects();
        const projectPromises = allProjectsData.map((p) =>
          projectService.getProject(p.id),
        );
        const allProjects = (await Promise.all(projectPromises)).filter(
          (p) => p !== null,
        );

        // Apply filters
        let filtered = [...allProjects];

        // Apply department filter if selected
        if (filterDepartment && filterDepartment !== "all") {
          filtered = filtered.filter((project) => {
            return project.department === filterDepartment;
          });
        }

        // Convert filterManager to array if it's a string for backward compatibility
        const filterManagerArray = Array.isArray(filterManager)
          ? filterManager
          : filterManager === "all" || !filterManager
            ? []
            : [filterManager];

        // Apply project manager filter only if specific managers are selected
        if (filterManagerArray.length > 0) {
          filtered = filtered.filter((project) => {
            // Check if the project's manager is in the selected managers array
            return filterManagerArray.includes(project.project_manager);
          });
        }

        // Apply status filter
        if (filterStatus && filterStatus !== "all") {
          filtered = filtered.filter((p) => p.status === filterStatus);
        }

        // Apply status health filter
        if (filterStatusHealth && filterStatusHealth !== "all") {
          filtered = filtered.filter((project) => {
            // Special handling: Exclude cancelled projects from "Red (Critical)" filter
            if (
              filterStatusHealth === "red" &&
              project.status === "cancelled"
            ) {
              return false;
            }

            // Use computed status color if available, otherwise calculate it
            let statusHealthColor = project.computed_status_color;
            if (!statusHealthColor) {
              statusHealthColor = calculateProjectHealthStatusColor(project);
            }

            return statusHealthColor === filterStatusHealth;
          });
        }

        setProjects(filtered);
      } catch (error) {
        console.error("Error loading projects:", error);
        toast({
          title: "Error",
          description: "Failed to load projects",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadProjects();
  }, [
    user,
    filterManager,
    filterStatus,
    filterDepartment,
    filterStatusHealth,
    toast,
  ]);

  // Create the table instance with filtered data
  const table = useReactTable({
    data: filteredProjects,
    columns,
    state: {
      sorting,
      globalFilter,
      columnVisibility,
      pagination,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    enableColumnResizing: true,
    columnResizeMode: "onChange",
    enableSorting: true,
    debugTable: false,
  });

  // Function to get proper display name for column in dropdown menu
  const getColumnDisplayName = (columnId: string) => {
    const columnDisplayNames = {
      project_id: "Project ID",
      title: "Project",
      department: "Department", 
      status: "Status",
      project_manager: "Project Manager",
      health_status: "Health Status",
      completion: "Completion",
      budget_total: "Budget",
      budget_actuals: "Actuals",
      budget_remaining: "Budget Remaining",
      budget_forecast: "Forecast",
      budget_status: "Budget Status",
      milestones: "Milestones",
      working_days_remaining: "Days Left",
      calculated_end_date: "End Date",
      total_days: "Duration",
      last_updated: "Last Updated"
    };
    
    return columnDisplayNames[columnId] || columnId.replace(/_/g, " ");
  };

  // Render sort indicator for column headers
  const renderSortIndicator = (isSorted: false | "asc" | "desc") => {
    if (!isSorted) {
      return <ArrowUpDown className="ml-2 h-4 w-4 flex-shrink-0 opacity-70" />;
    }
    return isSorted === "asc" ? (
      <ArrowUp className="ml-2 h-4 w-4 flex-shrink-0 text-blue-600" />
    ) : (
      <ArrowDown className="ml-2 h-4 w-4 flex-shrink-0 text-blue-600" />
    );
  };

  return (
    <div className="w-full bg-background">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={onBack}
            className="text-foreground border-border hover:bg-card"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Projects
          </Button>
          <h1 className="text-3xl font-bold text-foreground">Projects Overview</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={async () => {
              setExporting(true);
              try {
                await exportProjectsToExcel(projects);
                toast({
                  title: "Success",
                  description: "Projects exported to Excel successfully",
                });
              } catch (error) {
                console.error("Error exporting projects:", error);
                toast({
                  title: "Error",
                  description: "Failed to export projects",
                  variant: "destructive",
                });
              } finally {
                setExporting(false);
              }
            }}
            disabled={exporting || projects.length === 0}
          >
            {exporting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <FileSpreadsheet className="h-4 w-4 mr-2" />
            )}
            Export to Excel
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Projects
            </CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{projects.length}</div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Projects
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {projects.filter((p) => p.status === "active").length}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Budget
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              }).format(projects.reduce((sum, p) => sum + (p.budget_total || 0), 0))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Completion
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {Math.round(projects.reduce((sum, p) => sum + calculateCompletion(p), 0) / projects.length) || 0}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Projects Table */}
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center justify-between mb-4">
            <CardTitle className="text-foreground">All Projects</CardTitle>
            <div className="flex items-center gap-2">
              {/* Search Input */}
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search projects..."
                  value={globalFilter ?? ""}
                  onChange={(e) => setGlobalFilter(e.target.value)}
                  className="pl-8 w-64"
                />
              </div>
              
              {/* Column Visibility Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Settings className="h-4 w-4 mr-2" />
                    Columns
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {table
                    .getAllColumns()
                    .filter((column) => column.getCanHide())
                    .map((column) => {
                      return (
                        <DropdownMenuCheckboxItem
                          key={column.id}
                          className="capitalize"
                          checked={column.getIsVisible()}
                          onCheckedChange={(value) =>
                            column.toggleVisibility(!!value)
                          }
                        >
                          {getColumnDisplayName(column.id)}
                        </DropdownMenuCheckboxItem>
                      );
                    })}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Filter Controls */}
          <div className="flex flex-wrap items-center gap-3 pb-4 border-b border-border">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              Filters:
            </div>

            {/* Project ID Filter */}
            <Select value={localProjectIdFilter} onValueChange={setLocalProjectIdFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Project ID" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Project IDs</SelectItem>
                {uniqueProjectIds.map((id) => (
                  <SelectItem key={id} value={id}>
                    {id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select value={localStatusFilter} onValueChange={setLocalStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="on_hold">On Hold</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
              </SelectContent>
            </Select>

            {/* Health Status Filter */}
            <Select value={localHealthStatusFilter} onValueChange={setLocalHealthStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Health Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Health</SelectItem>
                <SelectItem value="green">On Track</SelectItem>
                <SelectItem value="yellow">At Risk</SelectItem>
                <SelectItem value="red">Critical</SelectItem>
              </SelectContent>
            </Select>

            {/* Department Filter */}
            <Select value={localDepartmentFilter} onValueChange={setLocalDepartmentFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {uniqueDepartments.map((dept) => (
                  <SelectItem key={dept} value={dept}>
                    {dept}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Project Manager Filter */}
            <Select value={localManagerFilter} onValueChange={setLocalManagerFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Project Manager" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Managers</SelectItem>
                {uniqueManagers.map((manager) => (
                  <SelectItem key={manager} value={manager}>
                    {manager}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Clear Filters Button */}
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="h-9 px-2 lg:px-3"
              >
                Clear Filters
                <X className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => {
                        return (
                          <TableHead
                            key={header.id}
                            style={{
                              width: header.getSize(),
                              minWidth: header.column.columnDef.minSize,
                              maxWidth: header.column.columnDef.maxSize,
                            }}
                          >
                            {header.isPlaceholder ? null : (
                              <div
                                className={
                                  header.column.getCanSort()
                                    ? "flex items-center cursor-pointer select-none hover:text-foreground"
                                    : "flex items-center"
                                }
                                onClick={header.column.getToggleSortingHandler()}
                              >
                                {flexRender(
                                  header.column.columnDef.header,
                                  header.getContext()
                                )}
                                {header.column.getCanSort() &&
                                  renderSortIndicator(header.column.getIsSorted())}
                              </div>
                            )}
                          </TableHead>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows?.length ? (
                    table.getRowModel().rows.map((row) => (
                      <TableRow
                        key={row.id}
                        data-state={row.getIsSelected() && "selected"}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => navigate(`/project/${row.original.id}`)}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell
                            key={cell.id}
                            style={{
                              width: cell.column.getSize(),
                            }}
                          >
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={columns.length}
                        className="h-24 text-center"
                      >
                        No projects found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center justify-between px-2 py-4">
            <div className="flex items-center gap-2">
              <p className="text-sm text-muted-foreground">
                Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{" "}
                {Math.min(
                  (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                  table.getFilteredRowModel().rows.length
                )}{" "}
                of {table.getFilteredRowModel().rows.length} projects
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {table.getState().pagination.pageIndex + 1} of{" "}
                {table.getPageCount()}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      <Toaster />
    </div>
  );
};

export default ProjectsOverview;