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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { projectService } from "@/lib/services/project";
import { FileSpreadsheet, ArrowLeft, ExternalLink } from "lucide-react";
import { exportProjectsToExcel } from "@/lib/services/excelExport";
import { useToast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/hooks/useAuth";
import { supabase } from "@/lib/supabase";

interface ProjectsOverviewProps {
  onBack: () => void;
  filterManager?: string | string[];
  filterStatus?: string;
  filterDepartment?: string;
}

// Define column types for better type safety
type SortDirection = "asc" | "desc";

interface ColumnDefinition {
  id: string;
  label: string;
  accessor: (project: any) => any;
  sortable: boolean;
  className?: string;
  cellClassName?: string;
  renderCell?: (value: any, project: any) => React.ReactNode;
}

const ProjectsOverview: React.FC<ProjectsOverviewProps> = ({
  onBack,
  filterManager = "all",
  filterStatus = "all",
  filterDepartment = "all",
}) => {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: SortDirection;
  }>({ key: "title", direction: "asc" });
  // Add a force update state to trigger re-renders when needed
  const [forceUpdate, setForceUpdate] = useState(0);

  // Debug counter to verify component updates
  const [debugRenderCount, setDebugRenderCount] = useState(0);

  // Increment render count on each render to verify updates
  useEffect(() => {
    setDebugRenderCount((prev) => prev + 1);
    console.log(`ProjectsOverview render count: ${debugRenderCount + 1}`);
  }, []);

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

  // Define columns configuration
  const columns: ColumnDefinition[] = [
    {
      id: "title",
      label: "Project",
      accessor: (project) =>
        project.title?.replace(/<[^>]*>/g, "").toLowerCase() || "",
      sortable: true,
      cellClassName:
        "font-medium text-blue-600 hover:text-blue-800 hover:underline",
      renderCell: (value, project) => (
        <div className="flex items-center">
          {project.title.replace(/<[^>]*>/g, "")}
          <ExternalLink className="h-3 w-3 text-muted-foreground ml-1" />
        </div>
      ),
    },
    {
      id: "department",
      label: "Department",
      accessor: (project) => project.department?.toLowerCase() || "",
      sortable: true,
      renderCell: (value, project) => project.department || "—",
    },
    {
      id: "status",
      label: "Status",
      accessor: (project) => project.status?.toLowerCase() || "",
      sortable: true,
      renderCell: (value, project) => {
        const statusClasses = {
          active: "bg-green-100 text-green-800 border border-green-200",
          on_hold: "bg-yellow-100 text-yellow-800 border border-yellow-200",
          completed: "bg-blue-100 text-blue-800 border border-blue-200",
          cancelled: "bg-red-100 text-red-800 border border-red-200",
          draft: "bg-gray-100 text-gray-800 border border-gray-200",
        };

        const status = project.status || "active";
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
    },
    {
      id: "project_manager",
      label: "Project Manager",
      accessor: (project) => project.project_manager?.toLowerCase() || "",
      sortable: true,
      renderCell: (value, project) => project.project_manager || "—",
    },
    {
      id: "completion",
      label: "Completion",
      accessor: (project) => calculateCompletion(project),
      sortable: true,
      renderCell: (value, project) => {
        const completion = calculateCompletion(project);
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
    },
    {
      id: "budget_total",
      label: "Budget",
      accessor: (project) => Number(project.budget_total) || 0,
      sortable: true,
      renderCell: (value, project) => formatCurrency(project.budget_total),
    },
    {
      id: "budget_actuals",
      label: "Actuals",
      accessor: (project) => Number(project.budget_actuals) || 0,
      sortable: true,
      renderCell: (value, project) => formatCurrency(project.budget_actuals),
    },
    {
      id: "budget_forecast",
      label: "Forecast",
      accessor: (project) => Number(project.budget_forecast) || 0,
      sortable: true,
      renderCell: (value, project) => formatCurrency(project.budget_forecast),
    },
    {
      id: "budget_status",
      label: "Budget Status",
      accessor: (project) =>
        getBudgetStatus(
          project.budget_total,
          project.budget_actuals,
          project.budget_forecast,
        ),
      sortable: true,
      renderCell: (value, project) => {
        const budgetStatus = getBudgetStatus(
          project.budget_total,
          project.budget_actuals,
          project.budget_forecast,
        );

        const statusClasses = {
          "On Budget": "bg-green-100 text-green-800 border border-green-200",
          "At Risk": "bg-yellow-100 text-yellow-800 border border-yellow-200",
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
    {
      id: "milestones",
      label: "Milestones",
      accessor: (project) => Number(project.milestones?.length) || 0,
      sortable: true,
      renderCell: (value, project) => project.milestones?.length || 0,
    },
    {
      id: "risks",
      label: "Risks",
      accessor: (project) => Number(project.risks?.length) || 0,
      sortable: true,
      renderCell: (value, project) => project.risks?.length || 0,
    },
  ];

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
  }, [user, filterManager, filterStatus, filterDepartment, toast]);

  // Handle column sorting - use useCallback to prevent unnecessary re-renders
  const handleSort = useCallback((columnId: string) => {
    console.log(`Sort clicked for column: ${columnId}`);
    setSortConfig((prevConfig) => {
      const newConfig =
        prevConfig.key === columnId
          ? {
              key: columnId,
              direction: prevConfig.direction === "asc" ? "desc" : "asc",
            }
          : { key: columnId, direction: "asc" };

      console.log(`New sort config:`, newConfig);
      // Force a re-render to ensure the UI updates
      setForceUpdate((prev) => prev + 1);
      return newConfig;
    });
  }, []);

  // Get sorted projects using useMemo to prevent unnecessary re-calculations
  const sortedProjects = useMemo(() => {
    if (!projects.length) return [];

    console.log(
      `Sorting by ${sortConfig.key} in ${sortConfig.direction} order`,
    );

    // Find the column definition for the current sort key
    const column = columns.find((col) => col.id === sortConfig.key);
    if (!column) {
      console.log(`Column not found for key: ${sortConfig.key}`);
      return [...projects];
    }

    console.log(`Using column: ${column.id} (${column.label})`);

    // Create a new array to avoid mutating the original
    const sorted = [...projects].sort((a, b) => {
      try {
        const valueA = column.accessor(a);
        const valueB = column.accessor(b);

        console.log(`Comparing: ${valueA} vs ${valueB}`);

        // Handle null/undefined values
        if (valueA == null && valueB == null) return 0;
        if (valueA == null) return 1;
        if (valueB == null) return -1;

        // Compare values based on sort direction
        const comparison = valueA < valueB ? -1 : valueA > valueB ? 1 : 0;
        const result =
          sortConfig.direction === "asc" ? comparison : -comparison;

        console.log(`Comparison result: ${result}`);
        return result;
      } catch (error) {
        console.error("Error during sort comparison:", error);
        return 0; // Return equal if comparison fails
      }
    });

    console.log("Sorted projects count:", sorted.length);
    return sorted;
  }, [projects, sortConfig, columns, forceUpdate]); // Include forceUpdate to ensure re-render

  // Render sort indicator for column headers
  const renderSortIndicator = (columnId: string) => {
    if (sortConfig.key !== columnId) {
      return <ArrowUpDown className="ml-2 h-4 w-4 flex-shrink-0 opacity-70" />;
    }
    return sortConfig.direction === "asc" ? (
      <ArrowUp className="ml-2 h-4 w-4 flex-shrink-0 text-blue-600" />
    ) : (
      <ArrowDown className="ml-2 h-4 w-4 flex-shrink-0 text-blue-600" />
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="flex items-center gap-2"
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
                description: "There was an error generating the Excel file.",
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

      <Card className="bg-white shadow-md">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-blue-800 mb-6">
            Projects Overview Table
          </h2>

          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {columns.map((column) => (
                      <TableHead
                        key={column.id}
                        className={`font-bold ${column.sortable ? "cursor-pointer hover:bg-gray-50 active:bg-gray-100" : ""} ${column.className || ""}`}
                      >
                        {column.sortable ? (
                          <button
                            type="button"
                            className="flex items-center w-full text-left focus:outline-none"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              console.log(
                                "Sort button clicked for column:",
                                column.id,
                              );
                              handleSort(column.id);
                            }}
                          >
                            {column.label}
                            {renderSortIndicator(column.id)}
                          </button>
                        ) : (
                          column.label
                        )}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projects.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={columns.length}
                        className="text-center py-8 text-gray-500"
                      >
                        No projects found matching the current filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedProjects.map((project) => (
                      <TableRow
                        key={project.id}
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => {
                          navigate("/", {
                            state: { projectId: project.id, mode: "preview" },
                          });
                        }}
                      >
                        {columns.map((column) => (
                          <TableCell
                            key={`${project.id}-${column.id}`}
                            className={column.cellClassName || ""}
                          >
                            {(() => {
                              try {
                                return column.renderCell
                                  ? column.renderCell(
                                      column.accessor(project),
                                      project,
                                    )
                                  : column.accessor(project);
                              } catch (error) {
                                console.error(
                                  `Error rendering cell for column ${column.id}:`,
                                  error,
                                );
                                return "—";
                              }
                            })()}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </Card>
      <Toaster />
    </div>
  );
};

export default ProjectsOverview;
