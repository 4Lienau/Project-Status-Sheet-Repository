/**
 * File: ProjectList.tsx
 * Purpose: Component for displaying a grid of project cards with filtering and export capabilities
 * Description: This component renders a grid of project cards with filtering options by department,
 * project manager, and status. It includes functionality to export projects to Excel, create new
 * projects, and view project details. The component also handles loading states and user permissions
 * based on department.
 *
 * Imports from:
 * - React core libraries
 * - UI components from shadcn/ui
 * - Project service and related types
 * - Authentication hooks
 * - Supabase client
 * - Excel export service
 *
 * Called by: src/components/home.tsx
 */

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Plus, FileSpreadsheet, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import ProjectListSkeleton from "./ProjectListSkeleton";
import { useToast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { useNavigate } from "react-router-dom";
import {
  projectService,
  calculateWeightedCompletion,
  calculateProjectHealthStatusColor,
} from "@/lib/services/project";
import { useAuth } from "@/lib/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import type { ProjectWithRelations } from "@/lib/services/project";
import { exportProjectsToExcel } from "@/lib/services/excelExport";

interface ProjectListProps {
  onSelectProject: (project: ProjectWithRelations) => void;
  onCreateNew: () => void;
  filterManager?: string | string[];
  filterStatus?: string;
  filterDepartment?: string;
  filterStatusHealth?: string;
  onFilteredCountChange?: (count: number) => void;
}

const ProjectList = ({
  onSelectProject,
  onCreateNew,
  filterManager = "all",
  filterStatus = "all",
  filterDepartment = "all",
  filterStatusHealth = "all",
  onFilteredCountChange,
}: ProjectListProps) => {
  // Convert filterManager to array if it's a string for backward compatibility
  const filterManagerArray = Array.isArray(filterManager)
    ? filterManager
    : filterManager === "all" || !filterManager
      ? []
      : [filterManager];

  // Flag to determine if we should apply manager filtering
  // We only want to filter if we have specific managers selected
  const shouldFilterByManager = filterManagerArray.length > 0;

  console.log("ProjectList received filterManager:", filterManager);
  console.log("Converted to filterManagerArray:", filterManagerArray);
  console.log("shouldFilterByManager:", shouldFilterByManager);

  const { user } = useAuth();
  const [profile, setProfile] = useState<{ full_name: string | null }>({
    full_name: null,
  });

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
  const navigate = useNavigate();
  const [allProjects, setAllProjects] = useState<ProjectWithRelations[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<
    ProjectWithRelations[]
  >([]);
  const [loading, setLoading] = useState(true);

  const { toast } = useToast();

  // Helper function to get project status health color using standardized calculation
  const getProjectStatusHealthColor = (
    project: ProjectWithRelations,
  ): string => {
    // Calculate time remaining percentage for debug info
    let timeRemainingPercentage: number | null = null;
    if (
      project.total_days &&
      project.total_days_remaining !== null &&
      project.total_days_remaining !== undefined
    ) {
      const totalDays = project.total_days;
      const remainingDays = project.total_days_remaining;

      if (remainingDays < 0) {
        timeRemainingPercentage = 0;
      } else {
        timeRemainingPercentage = Math.round((remainingDays / totalDays) * 100);
      }
    }

    console.log(
      `[STATUS_HEALTH_DEBUG] Project "${project.title}" (${project.id}):`,
      {
        title: project.title,
        computed_status_color: project.computed_status_color,
        health_calculation_type: project.health_calculation_type,
        manual_status_color: project.manual_status_color,
        manual_health_percentage: project.manual_health_percentage,
        status: project.status,
        milestones_count: project.milestones?.length || 0,
        weighted_completion:
          project.milestones?.length > 0
            ? calculateWeightedCompletion(project.milestones)
            : 0,
        total_days: project.total_days,
        total_days_remaining: project.total_days_remaining,
        time_remaining_percentage: timeRemainingPercentage,
        working_days_remaining: project.working_days_remaining,
      },
    );

    // Always use the standardized calculation to ensure consistency
    // This ensures the same logic is used everywhere in the application
    const calculatedColor = calculateProjectHealthStatusColor(project);

    console.log(
      `[STATUS_HEALTH_DEBUG] Calculated color for "${project.title}": ${calculatedColor}`,
    );

    // If computed_status_color exists but doesn't match our calculation, log a warning
    // and trigger an update to fix the discrepancy
    if (
      project.computed_status_color &&
      project.computed_status_color !== calculatedColor
    ) {
      console.warn(
        `[STATUS_HEALTH_DEBUG] Mismatch detected for "${project.title}"! Computed: ${project.computed_status_color}, Calculated: ${calculatedColor}`,
      );

      // Automatically fix the discrepancy by updating the computed status color
      // This is done asynchronously to not block the UI
      import("@/lib/services/project").then(
        ({ updateProjectComputedStatusColor }) => {
          updateProjectComputedStatusColor(project.id).then((success) => {
            if (success) {
              console.log(
                `[STATUS_HEALTH_DEBUG] Fixed computed status color for "${project.title}"`,
              );
            } else {
              console.error(
                `[STATUS_HEALTH_DEBUG] Failed to fix computed status color for "${project.title}"`,
              );
            }
          });
        },
      );
    }

    return calculatedColor;
  };

  useEffect(() => {
    const loadProjects = async () => {
      setLoading(true);
      console.log("Loading projects with filters:", {
        filterManager,
        filterManagerArray,
        filterStatus,
        filterDepartment,
        filterStatusHealth,
      });

      try {
        // First, get the current user's department and email
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

        console.log("User info:", { userDepartment, userEmail, userName });

        // Simplified project loading - get all projects in one go
        const allProjectsData = await projectService.getAllProjects();
        console.log("All projects count:", allProjectsData.length);

        // Load full project details
        const projectPromises = allProjectsData.map((p) =>
          projectService.getProject(p.id),
        );
        const projects = (await Promise.all(projectPromises)).filter(
          (p): p is ProjectWithRelations => p !== null,
        );

        console.log("Loaded projects count:", projects.length);
        setAllProjects(projects);

        // Apply filters
        let filtered = [...projects];
        console.log("Starting filter with", filtered.length, "projects");

        // TEMPORARILY DISABLE USER DEPARTMENT FILTERING FOR DEBUGGING
        // This filter might be too restrictive and causing no projects to show
        /*
        if (userDepartment && userDepartment !== "Technology") {
          const beforeCount = filtered.length;
          filtered = filtered.filter((project) => {
            // Always show projects where user is the project manager
            if (userEmail && project.project_manager === userEmail) return true;
            if (userName && project.project_manager === userName) return true;

            // Show projects from user's department
            return project.department === userDepartment;
          });
          console.log('After user department filter:', filtered.length, 'projects (from', beforeCount, ')');
        }
        */

        // Then apply department filter dropdown if selected
        if (filterDepartment && filterDepartment !== "all") {
          const beforeCount = filtered.length;
          filtered = filtered.filter((project) => {
            return project.department === filterDepartment;
          });
          console.log(
            "After department filter:",
            filtered.length,
            "projects (from",
            beforeCount,
            ")",
          );
        }

        // Apply project manager filter only if specific managers are selected
        if (shouldFilterByManager) {
          const beforeCount = filtered.length;
          filtered = filtered.filter((project) => {
            // Check if the project's manager is in the selected managers array
            const isIncluded = filterManagerArray.includes(
              project.project_manager,
            );
            console.log(
              `Project ${project.id} manager: ${project.project_manager}, included: ${isIncluded}`,
            );
            return isIncluded;
          });
          console.log(
            "After manager filter:",
            filtered.length,
            "projects (from",
            beforeCount,
            ")",
          );
        }

        // Apply status filter
        if (filterStatus && filterStatus !== "all") {
          const beforeCount = filtered.length;
          filtered = filtered.filter((p) => p.status === filterStatus);
          console.log(
            "After status filter:",
            filtered.length,
            "projects (from",
            beforeCount,
            ")",
          );
        }

        // Apply status health filter
        if (filterStatusHealth && filterStatusHealth !== "all") {
          const beforeCount = filtered.length;
          console.log(
            `[STATUS_HEALTH_FILTER] Filtering by status health: ${filterStatusHealth}`,
          );
          filtered = filtered.filter((project) => {
            const statusHealthColor = getProjectStatusHealthColor(project);

            // Special handling: Exclude cancelled projects from "Red (Critical)" filter
            // Cancelled projects should only appear when "All Health Status" is selected
            if (
              filterStatusHealth === "red" &&
              project.status === "cancelled"
            ) {
              console.log(
                `[STATUS_HEALTH_FILTER] Excluding cancelled project "${project.title}" from Red (Critical) filter`,
              );
              return false;
            }

            const matches = statusHealthColor === filterStatusHealth;
            console.log(
              `[STATUS_HEALTH_FILTER] Project "${project.title}" - Status: ${project.status}, Color: ${statusHealthColor}, Filter: ${filterStatusHealth}, Matches: ${matches}`,
            );
            return matches;
          });
          console.log(
            "After status health filter:",
            filtered.length,
            "projects (from",
            beforeCount,
            ")",
          );
        }

        console.log("Final filtered projects:", filtered.length);
        setFilteredProjects(filtered);

        // Report the filtered count back to parent component
        if (onFilteredCountChange) {
          onFilteredCountChange(filtered.length);
        }
      } catch (error) {
        console.error("Error loading projects:", error);
      } finally {
        setLoading(false);
      }
    };

    loadProjects();
  }, [
    // Remove shouldFilterByManager from dependencies to prevent re-render loops
    // It's derived from filterManagerArray, so we don't need both
    filterManagerArray,
    filterStatus,
    filterDepartment,
    filterStatusHealth,
    user?.id,
  ]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-semibold text-white">Projects</h2>
        </div>
        <ProjectListSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-semibold text-white">Projects</h2>
          <span className="inline-flex items-center rounded-full bg-white/20 px-3 py-1 text-sm font-medium text-white border border-white/30">
            {filteredProjects.length}{" "}
            {filteredProjects.length === 1 ? "project" : "projects"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProjects.map((project) => (
          <Card
            key={project.id}
            onClick={() => onSelectProject(project)}
            className="group p-6 pb-6 cursor-pointer bg-white border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 relative overflow-hidden"
            style={{
              borderRadius: "1rem",
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-semibold">
                  {project.title.replace(/<[^>]*>/g, "")}
                </h3>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium shadow-sm ${
                    {
                      active:
                        "bg-green-100 text-green-800 border border-green-200",
                      on_hold:
                        "bg-yellow-100 text-yellow-800 border border-yellow-200",
                      completed:
                        "bg-blue-100 text-blue-800 border border-blue-200",
                      cancelled:
                        "bg-gray-100 text-gray-800 border border-gray-200",
                      draft:
                        "bg-yellow-100 text-yellow-800 border border-yellow-200",
                    }[project.status || "active"]
                  }`}
                >
                  {project.status?.replace("_", " ").charAt(0).toUpperCase() +
                    project.status?.slice(1).replace("_", " ") || "Active"}
                </span>
              </div>
              {project.description && (
                <p className="text-sm text-blue-800 mb-3 line-clamp-2">
                  {project.description.replace(/<[^>]*>/g, "")}
                </p>
              )}

              {/* Total Budget */}
              {project.budget_total !== null &&
                project.budget_total !== undefined && (
                  <p className="text-sm text-blue-800 mb-3 font-medium">
                    Total Budget:{" "}
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: "USD",
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    }).format(project.budget_total)}
                  </p>
                )}

              <p className="text-sm text-blue-800 mb-4">
                Project Manager: {project.project_manager}
              </p>
              {(project.department || project.project_id) && (
                <div className="space-y-2">
                  {project.department && (
                    <p className="text-xs text-blue-600">
                      Department: {project.department}
                    </p>
                  )}
                  {project.project_id && (
                    <div className="flex items-center gap-2 mb-1">
                      <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-sm font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                        ID: {project.project_id}
                      </span>
                    </div>
                  )}
                  <div className="border-t border-gray-200 pt-2 w-3/4">
                    <p className="text-[11px] text-gray-500">
                      Updated{" "}
                      {project.updated_at
                        ? (() => {
                            const updatedDate = new Date(project.updated_at);
                            const now = new Date();

                            // Set both dates to midnight for accurate day comparison
                            const updatedDay = new Date(
                              updatedDate.getFullYear(),
                              updatedDate.getMonth(),
                              updatedDate.getDate(),
                            );
                            const today = new Date(
                              now.getFullYear(),
                              now.getMonth(),
                              now.getDate(),
                            );

                            return updatedDay.getTime() === today.getTime()
                              ? "today"
                              : formatDistanceToNow(updatedDate, {
                                  addSuffix: true,
                                });
                          })()
                        : "recently"}
                    </p>
                  </div>
                </div>
              )}

              {/* Health Indicator */}
              {(() => {
                // Calculate overall health percentage
                const overallCompletion =
                  project.health_calculation_type === "manual"
                    ? project.manual_health_percentage
                    : calculateWeightedCompletion(project.milestones);

                // Get the standardized health status color
                const healthStatusColor = getProjectStatusHealthColor(project);

                // Determine background color based on health status color and project status
                let bgColor = "bg-green-500";
                if (project.status === "completed") {
                  bgColor = "bg-blue-500"; // Blue for completed projects
                } else if (project.status === "cancelled") {
                  bgColor = "bg-gray-500"; // Gray for cancelled projects
                } else if (
                  project.health_calculation_type === "manual" &&
                  project.manual_status_color
                ) {
                  // Use the manual color if specified
                  bgColor = `bg-${project.manual_status_color}-500`;
                } else {
                  // Use the computed health status color
                  switch (healthStatusColor) {
                    case "green":
                      bgColor = "bg-green-500";
                      break;
                    case "yellow":
                      bgColor = "bg-yellow-500";
                      break;
                    case "red":
                      bgColor = "bg-red-500";
                      break;
                    default:
                      bgColor = "bg-green-500";
                  }
                }

                // Determine status text
                let statusText = "In Progress";
                if (project.status === "completed")
                  statusText = "Project Complete";
                else if (project.status === "on_hold")
                  statusText = "Project on Hold";
                else if (project.status === "cancelled")
                  statusText = "Project Cancelled";
                else if (project.status === "draft")
                  statusText = "Project Draft";

                return (
                  <div className="absolute bottom-0 right-0 flex items-center">
                    <div className="flex items-start">
                      <div
                        className={`w-16 h-10 flex items-center justify-center text-white text-lg font-bold ${bgColor} rounded-full shadow-md border border-gray-700`}
                      >
                        {overallCompletion}%
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </Card>
        ))}

        {filteredProjects.length === 0 && (
          <div className="col-span-full text-center py-8 text-blue-800">
            {loading
              ? "Loading projects..."
              : allProjects.length === 0
                ? "No projects yet. Use the Options menu to create one."
                : "No projects match the current filters. Try changing your filter criteria."}
          </div>
        )}
      </div>
      <Toaster />
    </div>
  );
};

export default ProjectList;
