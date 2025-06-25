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
import { Card } from "@/components/ui/card";
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
  filterManager = "all",
  filterStatus = "all",
  filterDepartment = "all",
  filterStatusHealth = "all",
}) => {
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnResizeMode, setColumnResizeMode] =
    useState<ColumnResizeMode>("onChange");
  const [globalFilter, setGlobalFilter] = useState("");
  const [columnVisibility, setColumnVisibility] = useState({
    budget_forecast: false, // Hide forecast by default
    budget_status: false, // Hide budget status by default
    milestones: true,
    working_days_remaining: true,
    calculated_end_date: false, // Hide end date by default
    total_days: false, // Hide duration by default
    last_updated: true, // Show last updated by default
  });
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 25, // Show more rows by default
  });

  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<{ full_name: string | null }>({
    full_name: null,
  });

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
          // Sort order: green < yellow < red
          const order = { green: 0, yellow: 1, red: 2 };
          return order[a] - order[b];
        },
        cell: (info) => {
          const healthStatus = info.getValue();
          const project = info.row.original;

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
            return <div className="text-center text-gray-500">—</div>;
          }

          try {
            const timeAgo = formatDistanceToNow(new Date(updatedAt), {
              addSuffix: true,
            });
            return (
              <div className="text-center text-sm text-gray-600">{timeAgo}</div>
            );
          } catch (error) {
            return <div className="text-center text-gray-500">—</div>;
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

  // Create the table instance
  const table = useReactTable({
    data: projects,
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
    <TooltipProvider>
      <div className="w-full space-y-6 px-4">
        {/* Remove horizontal margins to allow full width */}
        <div className="w-full">
          <div className="flex justify-between items-center mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="flex items-center gap-2 text-white hover:text-white hover:bg-white/20 font-medium"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Projects
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                try {
                  setExporting(true);
                  await new Promise((resolve) => setTimeout(resolve, 100)); // Let UI update
                  const username =
                    profile.full_name || user?.email?.split("@")[0] || "user";
                  await exportProjectsToExcel(projects, username);
                  toast({
                    title: "Export Successful",
                    description:
                      "The Excel file has been generated and downloaded.",
                    className: "bg-green-50 border-green-200",
                  });
                } catch (error) {
                  toast({
                    title: "Export Failed",
                    description:
                      "There was an error generating the Excel file.",
                    variant: "destructive",
                  });
                } finally {
                  setExporting(false);
                }
              }}
              disabled={projects.length === 0 || exporting}
              className="flex items-center gap-2"
            >
              {exporting ? (
                <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <FileSpreadsheet className="h-4 w-4" />
              )}
              {exporting ? "Generating..." : "Export to Excel"}
            </Button>
          </div>

          <div className="w-full bg-white shadow-md rounded-lg">
            <div className="p-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-blue-800">
                  Projects Overview Table
                </h2>
                <div className="flex items-center gap-4">
                  {/* Global Search */}
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search all columns..."
                      value={globalFilter}
                      onChange={(event) => setGlobalFilter(event.target.value)}
                      className="pl-8 w-64"
                    />
                  </div>

                  {/* Column Visibility Toggle */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Settings className="h-4 w-4 mr-2" />
                        Columns
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      {table
                        .getAllColumns()
                        .filter((column) => column.getCanHide())
                        .map((column) => {
                          return (
                            <DropdownMenuCheckboxItem
                              key={column.id}
                              className="capitalize"
                              checked={column.getIsVisible()}
                              onCheckedChange={(value) => {
                                column.toggleVisibility(!!value);
                              }}
                              onSelect={(event) => {
                                // Prevent the dropdown from closing when clicking on checkbox items
                                event.preventDefault();
                              }}
                            >
                              {getColumnDisplayName(column.id)}
                            </DropdownMenuCheckboxItem>
                          );
                        })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {loading ? (
                <div className="flex justify-center items-center py-12">
                  <div className="h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <>
                  {/* Enhanced table container with proper horizontal scrolling */}
                  <div className="w-full border border-gray-200 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto overflow-y-auto max-h-[75vh]">
                      <Table
                        className="w-full"
                        style={{ 
                          tableLayout: "auto", // Changed from "fixed" to "auto" to allow dynamic sizing
                          minWidth: "100%" // Ensure table takes at least full width
                        }}
                      >
                        <TableHeader>
                          {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                              {headerGroup.headers.map((header) => {
                                const canSort = header.column.getCanSort();
                                const sortDirection =
                                  header.column.getIsSorted();

                                return (
                                  <TableHead
                                    key={header.id}
                                    className={`font-bold text-xs whitespace-nowrap px-3 py-3 relative ${
                                      canSort
                                        ? "cursor-pointer hover:bg-gray-50 active:bg-gray-100"
                                        : ""
                                    }`}
                                    style={{
                                      width: header.getSize(),
                                      minWidth: header.column.columnDef.minSize || header.getSize(),
                                      maxWidth: header.column.columnDef.maxSize,
                                    }}
                                    onClick={
                                      canSort
                                        ? header.column.getToggleSortingHandler()
                                        : undefined
                                    }
                                  >
                                    {header.isPlaceholder ? null : (
                                      <div className="flex items-center">
                                        {flexRender(
                                          header.column.columnDef.header,
                                          header.getContext(),
                                        )}
                                        {canSort &&
                                          renderSortIndicator(sortDirection)}
                                      </div>
                                    )}
                                    {/* Column Resize Handle */}
                                    {header.column.getCanResize() && (
                                      <div
                                        onMouseDown={header.getResizeHandler()}
                                        onTouchStart={header.getResizeHandler()}
                                        className={`absolute right-0 top-0 h-full w-1 cursor-col-resize select-none touch-none border-r border-gray-300 hover:border-blue-500 hover:border-r-2 ${
                                          header.column.getIsResizing()
                                            ? "border-blue-500 border-r-2"
                                            : ""
                                        }`}
                                        style={{ zIndex: 10 }}
                                      />
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
                                className="cursor-pointer hover:bg-gray-50"
                                onClick={() => {
                                  navigate("/", {
                                    state: {
                                      projectId: row.original.id,
                                      mode: "preview",
                                    },
                                  });
                                }}
                              >
                                {row.getVisibleCells().map((cell) => (
                                  <TableCell
                                    key={cell.id}
                                    className="text-xs px-3 py-2 whitespace-nowrap"
                                    style={{
                                      width: cell.column.getSize(),
                                      minWidth: cell.column.columnDef.minSize || cell.column.getSize(),
                                      maxWidth: cell.column.columnDef.maxSize,
                                    }}
                                  >
                                    {flexRender(
                                      cell.column.columnDef.cell,
                                      cell.getContext(),
                                    )}
                                  </TableCell>
                                ))}
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell
                                colSpan={columns.length}
                                className="text-center py-8 text-gray-500"
                              >
                                No projects found matching the current filters.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>

                  {/* Pagination Controls */}
                  <div className="flex items-center justify-between px-2 py-4">
                    <div className="flex items-center space-x-2">
                      <p className="text-sm font-medium">Rows per page:</p>
                      <select
                        value={table.getState().pagination.pageSize}
                        onChange={(e) => {
                          table.setPageSize(Number(e.target.value));
                        }}
                        className="h-8 w-16 rounded border border-input bg-background px-2 text-sm"
                      >
                        {[10, 25, 50, 100].map((pageSize) => (
                          <option key={pageSize} value={pageSize}>
                            {pageSize}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center space-x-6 lg:space-x-8">
                      <div className="flex w-[100px] items-center justify-center text-sm font-medium">
                        Page {table.getState().pagination.pageIndex + 1} of{" "}
                        {table.getPageCount()}
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          className="hidden h-8 w-8 p-0 lg:flex"
                          onClick={() => table.setPageIndex(0)}
                          disabled={!table.getCanPreviousPage()}
                        >
                          <span className="sr-only">Go to first page</span>
                          <ChevronsLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          className="h-8 w-8 p-0"
                          onClick={() => table.previousPage()}
                          disabled={!table.getCanPreviousPage()}
                        >
                          <span className="sr-only">Go to previous page</span>
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          className="h-8 w-8 p-0"
                          onClick={() => table.nextPage()}
                          disabled={!table.getCanNextPage()}
                        >
                          <span className="sr-only">Go to next page</span>
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          className="hidden h-8 w-8 p-0 lg:flex"
                          onClick={() =>
                            table.setPageIndex(table.getPageCount() - 1)
                          }
                          disabled={!table.getCanNextPage()}
                        >
                          <span className="sr-only">Go to last page</span>
                          <ChevronsRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="text-sm text-muted-foreground">
                      Showing {table.getRowModel().rows.length} of{" "}
                      {table.getFilteredRowModel().rows.length} row(s).
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
          <Toaster />
        </div>
      </div>
    </TooltipProvider>
  );
};

export default ProjectsOverview;