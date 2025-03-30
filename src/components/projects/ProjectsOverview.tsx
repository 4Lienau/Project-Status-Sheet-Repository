/**
 * File: ProjectsOverview.tsx
 * Purpose: Component for displaying a tabular overview of all projects with detailed metrics
 * Description: This component renders a comprehensive table view of all projects with columns for
 * key metrics like status, completion, budget, milestones, and risks. It includes filtering options,
 * Excel export functionality, and navigation to project details. The component also handles loading
 * states and user permissions based on department.
 *
 * Imports from:
 * - React core libraries
 * - UI components from shadcn/ui
 * - Project service
 * - Excel export service
 * - Authentication hooks
 * - Supabase client
 *
 * Called by: src/components/home.tsx
 */

import React, { useState, useEffect } from "react";
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
  filterManager?: string;
  filterStatus?: string;
  filterDepartment?: string;
}

const ProjectsOverview: React.FC<ProjectsOverviewProps> = ({
  onBack,
  filterManager = "all",
  filterStatus = "all",
  filterDepartment = "all",
}) => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
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

  useEffect(() => {
    const loadProjects = async () => {
      setLoading(true);
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
        const projectPromises = (await projectService.getAllProjects()).map(
          (p) => projectService.getProject(p.id),
        );
        const allProjects = (await Promise.all(projectPromises)).filter(
          (p) => p !== null,
        );

        // Apply filters
        let filtered = [...allProjects];

        // First filter by user's department (unless they're in Technology department)
        if (userDepartment && userDepartment !== "Technology") {
          filtered = filtered.filter((project) => {
            // Always show projects where user is the project manager
            if (userEmail && project.project_manager === userEmail) return true;
            if (userName && project.project_manager === userName) return true;

            // Show projects from user's department
            return project.department === userDepartment;
          });
        }

        // Then apply department filter dropdown if selected
        if (filterDepartment && filterDepartment !== "all") {
          filtered = filtered.filter((project) => {
            return project.department === filterDepartment;
          });
        }

        // Apply project manager filter
        if (filterManager && filterManager !== "all") {
          filtered = filtered.filter(
            (p) => p.project_manager === filterManager,
          );
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

  // Calculate overall completion for a project
  const calculateCompletion = (project) => {
    if (!project.milestones || project.milestones.length === 0) return 0;
    return Math.round(
      project.milestones.reduce((acc, m) => acc + m.completion, 0) /
        project.milestones.length,
    );
  };

  // Format currency
  const formatCurrency = (value) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Get budget status
  const getBudgetStatus = (total, actuals, forecast) => {
    if (actuals + forecast > total) return "At Risk";
    if (actuals > total) return "Over Budget";
    return "On Budget";
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
            Projects Overview
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
                    <TableHead className="font-bold">
                      Project{" "}
                      <ExternalLink className="inline h-3 w-3 text-muted-foreground ml-1" />
                    </TableHead>
                    <TableHead className="font-bold">Department</TableHead>
                    <TableHead className="font-bold">Status</TableHead>
                    <TableHead className="font-bold">Project Manager</TableHead>
                    <TableHead className="font-bold">Completion</TableHead>
                    <TableHead className="font-bold">Budget</TableHead>
                    <TableHead className="font-bold">Actuals</TableHead>
                    <TableHead className="font-bold">Forecast</TableHead>
                    <TableHead className="font-bold">Budget Status</TableHead>
                    <TableHead className="font-bold">Milestones</TableHead>
                    <TableHead className="font-bold">Risks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projects.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={11}
                        className="text-center py-8 text-gray-500"
                      >
                        No projects found matching the current filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    projects.map((project) => {
                      const completion = calculateCompletion(project);
                      const budgetStatus = getBudgetStatus(
                        project.budget_total,
                        project.budget_actuals,
                        project.budget_forecast,
                      );

                      return (
                        <TableRow
                          key={project.id}
                          className="cursor-pointer hover:bg-gray-50"
                          onClick={() => {
                            // Navigate to home with project data for editing
                            navigate("/", {
                              state: { projectId: project.id, mode: "preview" },
                            });
                          }}
                        >
                          <TableCell className="font-medium text-blue-600 hover:text-blue-800 hover:underline">
                            {project.title.replace(/<[^>]*>/g, "")}
                          </TableCell>
                          <TableCell>{project.department || "—"}</TableCell>
                          <TableCell>
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                {
                                  active:
                                    "bg-green-100 text-green-800 border border-green-200",
                                  on_hold:
                                    "bg-yellow-100 text-yellow-800 border border-yellow-200",
                                  completed:
                                    "bg-blue-100 text-blue-800 border border-blue-200",
                                  cancelled:
                                    "bg-red-100 text-red-800 border border-red-200",
                                  draft:
                                    "bg-gray-100 text-gray-800 border border-gray-200",
                                }[project.status || "active"]
                              }`}
                            >
                              {project.status
                                ?.replace("_", " ")
                                .charAt(0)
                                .toUpperCase() +
                                project.status?.slice(1).replace("_", " ") ||
                                "Active"}
                            </span>
                          </TableCell>
                          <TableCell>
                            {project.project_manager || "—"}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-12 text-center">
                                {completion}%
                              </div>
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
                          </TableCell>
                          <TableCell>
                            {formatCurrency(project.budget_total)}
                          </TableCell>
                          <TableCell>
                            {formatCurrency(project.budget_actuals)}
                          </TableCell>
                          <TableCell>
                            {formatCurrency(project.budget_forecast)}
                          </TableCell>
                          <TableCell>
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                {
                                  "On Budget":
                                    "bg-green-100 text-green-800 border border-green-200",
                                  "At Risk":
                                    "bg-yellow-100 text-yellow-800 border border-yellow-200",
                                  "Over Budget":
                                    "bg-red-100 text-red-800 border border-red-200",
                                }[budgetStatus]
                              }`}
                            >
                              {budgetStatus}
                            </span>
                          </TableCell>
                          <TableCell>
                            {project.milestones?.length || 0}
                          </TableCell>
                          <TableCell>{project.risks?.length || 0}</TableCell>
                        </TableRow>
                      );
                    })
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
