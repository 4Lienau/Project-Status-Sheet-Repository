/**
 * File: home.tsx
 * Purpose: Main home page component that serves as the application dashboard
 * Description: This component is the primary landing page after login, providing access to all
 * project management functionality. It includes project listing with filtering options, project
 * creation form, project details view, and projects overview. It also handles user profile setup
 * and manages navigation between different views.
 *
 * Imports from:
 * - React core libraries
 * - Layout and various project-related components
 * - Authentication hooks and services
 * - UI components from shadcn/ui
 * - Supabase client
 *
 * Called by: src/App.tsx
 */

import React, { useState, useEffect } from "react";
import Layout from "./layout/Layout";
import { useAuth } from "@/lib/hooks/useAuth";
import { useNavigate, useLocation } from "react-router-dom";
import WelcomePage from "./welcome/WelcomePage";
import ProjectList from "./projects/ProjectList";
import ProjectsOverview from "./projects/ProjectsOverview";
import ProjectForm from "./ProjectForm";
import ProjectDashboard from "@/pages/ProjectDashboard";
import { projectService, type Project } from "@/lib/services/project";
import { useToast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, X, Check, BarChart3, Download } from "lucide-react";
import ProfileSetupDialog from "./auth/ProfileSetupDialog";
import { supabase } from "@/lib/supabase";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Plus, Calendar } from "lucide-react";
import { exportProjectsToExcel } from "@/lib/services/excelExport";

// Helper functions for localStorage persistence
const getStorageKey = (userId: string, filterType: string) =>
  `projectFilters_${userId}_${filterType}`;

const saveFilterToStorage = (
  userId: string,
  filterType: string,
  value: any,
) => {
  try {
    localStorage.setItem(
      getStorageKey(userId, filterType),
      JSON.stringify(value),
    );
  } catch (error) {
    console.warn("Failed to save filter to localStorage:", error);
  }
};

const loadFilterFromStorage = (
  userId: string,
  filterType: string,
  defaultValue: any,
) => {
  try {
    const stored = localStorage.getItem(getStorageKey(userId, filterType));
    return stored ? JSON.parse(stored) : defaultValue;
  } catch (error) {
    console.warn("Failed to load filter from localStorage:", error);
    return defaultValue;
  }
};

const Home = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<"list" | "form" | "preview" | "overview">(
    "list",
  );
  const [projectData, setProjectData] = useState(null);
  const [selectedManagers, setSelectedManagers] = useState<string[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [selectedStatusHealth, setSelectedStatusHealth] =
    useState<string>("all");
  const [managerPopoverOpen, setManagerPopoverOpen] = useState(false);
  const [projectManagers, setProjectManagers] = useState<string[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [profileChecked, setProfileChecked] = useState(false);
  const [filtersLoaded, setFiltersLoaded] = useState(false);
  const [filteredProjectCount, setFilteredProjectCount] = useState(0);
  const [totalProjectCount, setTotalProjectCount] = useState(0);

  // Clear all filters function
  const clearAllFilters = () => {
    setSelectedManagers([]);
    setSelectedStatus("all");
    setSelectedDepartment("all");
    setSelectedStatusHealth("all");

    // Save cleared filters to localStorage
    if (user?.id) {
      saveFilterToStorage(user.id, "managers", []);
      saveFilterToStorage(user.id, "status", "all");
      saveFilterToStorage(user.id, "department", "all");
      saveFilterToStorage(user.id, "statusHealth", "all");
    }
  };

  // Load persistent filters from localStorage when user is available
  useEffect(() => {
    if (user?.id && !filtersLoaded) {
      const savedManagers = loadFilterFromStorage(user.id, "managers", []);
      const savedStatus = loadFilterFromStorage(user.id, "status", "all");
      const savedDepartment = loadFilterFromStorage(
        user.id,
        "department",
        "all",
      );
      const savedStatusHealth = loadFilterFromStorage(
        user.id,
        "statusHealth",
        "all",
      );

      setSelectedManagers(savedManagers);
      setSelectedStatus(savedStatus);
      setSelectedDepartment(savedDepartment);
      setSelectedStatusHealth(savedStatusHealth);
      setFiltersLoaded(true);

      console.log("Loaded persistent filters:", {
        managers: savedManagers,
        status: savedStatus,
        department: savedDepartment,
        statusHealth: savedStatusHealth,
      });
    }
  }, [user?.id, filtersLoaded]);

  // Check if user profile is complete
  useEffect(() => {
    const checkUserProfile = async () => {
      if (!user || !user.id) return;

      const { data } = await supabase
        .from("profiles")
        .select("full_name, department")
        .eq("id", user.id)
        .single();

      // Show profile setup dialog if name or department is missing
      if (!data?.full_name || !data?.department) {
        setShowProfileSetup(true);
      }

      setProfileChecked(true);
    };

    if (user && !profileChecked) {
      checkUserProfile();
    }
  }, [user, profileChecked]);

  // Handle navigation from ProjectsOverview
  useEffect(() => {
    if (location.state) {
      const { projectId, mode: newMode } = location.state as {
        projectId?: string;
        mode?: "list" | "form" | "preview" | "overview";
      };

      if (projectId) {
        // Load the project data and set the mode
        const loadProject = async () => {
          const project = await projectService.getProject(projectId);
          if (project) {
            setProjectData(project);
            setMode(newMode || "preview");

            // Clear the location state to prevent reloading on refresh
            navigate("/", { replace: true, state: {} });
          }
        };

        loadProject();
      }
    }
  }, [location, navigate]);

  // Load unique project managers and departments
  useEffect(() => {
    const loadProjectFilters = async () => {
      if (!user) return;
      const projects = await projectService.getAllProjects();

      // Get unique managers
      const uniqueManagers = [
        ...new Set(projects.map((p) => p.project_manager)),
      ]
        .filter((manager) => manager) // Remove empty values
        .sort();
      setProjectManagers(uniqueManagers);

      // Get unique departments from projects
      const projectDepartments = [
        ...new Set(projects.map((p) => p.department)),
      ].filter(Boolean);

      // Also get departments from profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("department")
        .not("department", "is", null);

      const profileDepartments = profiles
        ? [...new Set(profiles.map((p) => p.department))].filter(Boolean)
        : [];

      // Combine both sources of departments
      const allDepartments = [
        ...new Set([...projectDepartments, ...profileDepartments]),
      ].sort();
      setDepartments(allDepartments);
    };

    loadProjectFilters();
  }, [user]);

  const handleSelectProject = async (project: Project) => {
    const fullProject = await projectService.getProject(project.id);
    if (fullProject) {
      setProjectData(fullProject);
      setMode("preview");
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-lg text-muted-foreground">Loading...</div>
        </div>
      </Layout>
    );
  }

  // This check is now redundant since we have route protection in App.tsx,
  // but we'll keep it as an additional security measure with enhanced logging
  if (!user) {
    console.log(
      "Home component: No authenticated user detected, redirecting to login",
    );
    // Redirect to login page
    navigate("/login");
    return null;
  }

  // Additional check to ensure we have a valid user with an ID
  if (!user.id) {
    console.log(
      "Home component: User object exists but has no ID, redirecting to login",
    );
    navigate("/login");
    return null;
  }

  console.log(
    "Home component: Authenticated user confirmed, rendering home page",
  );
  console.log("[DEBUG] User email:", user?.email);
  console.log("[DEBUG] User object:", user);

  return (
    <Layout>
      <div className="p-6 relative">
        {/* Subtle background logo */}
        <div className="absolute top-8 right-8 opacity-5 pointer-events-none">
          <img
            src="/images/rewa-logo-color.png"
            alt="ReWa Logo"
            className="h-24 w-auto"
          />
        </div>

        <div className="max-w-7xl mx-auto space-y-6 relative z-10">
          {mode === "list" && (
            <div className="space-y-6">
              {/* Header with logo */}
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h1 className="text-3xl font-bold text-white">
                    Project Dashboard
                  </h1>
                  <p className="text-white/70">
                    Track and report your projects status
                  </p>
                </div>
                <img
                  src="/images/rewa-logo-color.png"
                  alt="ReWa Logo"
                  className="h-10 w-auto"
                />
              </div>

              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-4">
                  <div className="flex flex-col">
                    <label className="text-sm font-medium text-white/80 mb-2">
                      Filter by Department
                    </label>
                    <Select
                      value={selectedDepartment}
                      onValueChange={(value) => {
                        setSelectedDepartment(value);
                        if (user?.id) {
                          saveFilterToStorage(user.id, "department", value);
                        }
                      }}
                    >
                      <SelectTrigger className="w-[280px] text-white border-white/30 bg-white/10 hover:bg-white/20">
                        <SelectValue
                          placeholder="All Departments"
                          className="text-white"
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Departments</SelectItem>
                        {departments.map((dept) => (
                          <SelectItem key={dept} value={dept}>
                            {dept}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="w-[280px] flex flex-col">
                    <label className="text-sm font-medium text-white/80 mb-2">
                      Filter by Project Manager
                    </label>
                    <Popover
                      open={managerPopoverOpen}
                      onOpenChange={setManagerPopoverOpen}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={managerPopoverOpen}
                          className="w-full justify-between text-white border-white/30 bg-white/10 hover:bg-white/20 hover:text-white h-10"
                        >
                          {selectedManagers.length > 0
                            ? `${selectedManagers.length} manager${selectedManagers.length > 1 ? "s" : ""} selected`
                            : "All Project Managers"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[280px] p-0" align="start">
                        <Command>
                          <CommandInput
                            placeholder="Search project managers..."
                            className="h-9"
                          />
                          <CommandList>
                            <CommandEmpty>
                              No project manager found.
                            </CommandEmpty>
                            <CommandGroup>
                              <CommandItem
                                onSelect={() => {
                                  setSelectedManagers([]);
                                  setManagerPopoverOpen(false);
                                  if (user?.id) {
                                    saveFilterToStorage(
                                      user.id,
                                      "managers",
                                      [],
                                    );
                                  }
                                }}
                                className="flex items-center justify-between"
                              >
                                <span>All Project Managers</span>
                                {selectedManagers.length === 0 && (
                                  <Check className="h-4 w-4" />
                                )}
                              </CommandItem>
                              {projectManagers.map((manager) => (
                                <CommandItem
                                  key={manager}
                                  onSelect={() => {
                                    setSelectedManagers((prev) => {
                                      const newManagers = prev.includes(manager)
                                        ? prev.filter((m) => m !== manager)
                                        : [...prev, manager];
                                      if (user?.id) {
                                        saveFilterToStorage(
                                          user.id,
                                          "managers",
                                          newManagers,
                                        );
                                      }
                                      return newManagers;
                                    });
                                  }}
                                  className="flex items-center justify-between"
                                >
                                  <span>{manager}</span>
                                  {selectedManagers.includes(manager) && (
                                    <Check className="h-4 w-4" />
                                  )}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    {selectedManagers.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {selectedManagers.map((manager) => (
                          <Badge
                            key={manager}
                            variant="secondary"
                            className="flex items-center gap-1 bg-white/20 text-white border-white/30 hover:bg-white/30"
                          >
                            {manager}
                            <X
                              className="h-3 w-3 cursor-pointer text-white hover:text-gray-200"
                              onClick={(e) => {
                                e.stopPropagation(); // Prevent triggering popover
                                setSelectedManagers((prev) => {
                                  const newManagers = prev.filter(
                                    (m) => m !== manager,
                                  );
                                  if (user?.id) {
                                    saveFilterToStorage(
                                      user.id,
                                      "managers",
                                      newManagers,
                                    );
                                  }
                                  return newManagers;
                                });
                              }}
                            />
                          </Badge>
                        ))}
                        {selectedManagers.length > 1 && (
                          <Badge
                            variant="outline"
                            className="cursor-pointer bg-white/10 text-white border-white/30 hover:bg-white/20"
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent triggering popover
                              setSelectedManagers([]);
                              if (user?.id) {
                                saveFilterToStorage(user.id, "managers", []);
                              }
                            }}
                          >
                            Clear all
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col">
                    <label className="text-sm font-medium text-white/80 mb-2">
                      Filter by Status
                    </label>
                    <Select
                      value={selectedStatus}
                      onValueChange={(value) => {
                        setSelectedStatus(value);
                        if (user?.id) {
                          saveFilterToStorage(user.id, "status", value);
                        }
                      }}
                    >
                      <SelectTrigger className="w-[200px] text-white border-white/30 bg-white/10 hover:bg-white/20">
                        <SelectValue
                          placeholder="All Statuses"
                          className="text-white"
                        />
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
                  </div>

                  <div className="flex flex-col">
                    <label className="text-sm font-medium text-white/80 mb-2">
                      Filter by Status Health
                    </label>
                    <Select
                      value={selectedStatusHealth}
                      onValueChange={(value) => {
                        setSelectedStatusHealth(value);
                        if (user?.id) {
                          saveFilterToStorage(user.id, "statusHealth", value);
                        }
                      }}
                    >
                      <SelectTrigger className="w-[200px] text-white border-white/30 bg-white/10 hover:bg-white/20">
                        <SelectValue
                          placeholder="All Health Status"
                          className="text-white"
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Health Status</SelectItem>
                        <SelectItem value="green">Green (On Track)</SelectItem>
                        <SelectItem value="yellow">Yellow (At Risk)</SelectItem>
                        <SelectItem value="red">Red (Critical)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex flex-col">
                  {/* Invisible label to match the spacing of filter dropdowns */}
                  <div className="text-sm font-medium text-transparent mb-2">
                    Actions
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={clearAllFilters}
                      variant="outline"
                      className="text-white border-white/30 bg-white/10 hover:bg-white/20 hover:text-white font-semibold flex items-center gap-2"
                    >
                      <X className="h-4 w-4" />
                      Clear Filters
                    </Button>

                    {/* Options Menu */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="default"
                          className="bg-blue-600 hover:bg-blue-700 text-white border-0 font-semibold flex items-center gap-2 shadow-lg hover:shadow-xl transition-all duration-200"
                        >
                          <MoreVertical className="h-4 w-4" />
                          Options
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuItem
                          onClick={() => setMode("form")}
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          <Plus className="h-4 w-4" />
                          New Project
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={async () => {
                            try {
                              const projects =
                                await projectService.getAllProjects();
                              let filteredProjects = projects;

                              // Apply filters
                              if (selectedDepartment !== "all") {
                                filteredProjects = filteredProjects.filter(
                                  (p) => p.department === selectedDepartment,
                                );
                              }
                              if (selectedManagers.length > 0) {
                                filteredProjects = filteredProjects.filter(
                                  (p) =>
                                    selectedManagers.includes(
                                      p.project_manager,
                                    ),
                                );
                              }
                              if (selectedStatus !== "all") {
                                filteredProjects = filteredProjects.filter(
                                  (p) => p.status === selectedStatus,
                                );
                              }
                              if (selectedStatusHealth !== "all") {
                                filteredProjects = filteredProjects.filter(
                                  (p) => {
                                    // Use computed status color if available, otherwise use standardized calculation
                                    let statusHealthColor =
                                      p.computed_status_color;

                                    if (!statusHealthColor) {
                                      // Import and use the standardized calculation function
                                      const {
                                        calculateProjectHealthStatusColor,
                                      } = require("@/lib/services/project");
                                      statusHealthColor =
                                        calculateProjectHealthStatusColor(p);
                                    }

                                    return (
                                      statusHealthColor === selectedStatusHealth
                                    );
                                  },
                                );
                              }

                              await exportProjectsToExcel(filteredProjects);
                              toast({
                                title: "Export Successful",
                                description:
                                  "Projects exported to Excel successfully",
                                className: "bg-green-50 border-green-200",
                              });
                            } catch (error) {
                              console.error("Export failed:", error);
                              toast({
                                title: "Export Failed",
                                description:
                                  "Failed to export projects to Excel",
                                variant: "destructive",
                              });
                            }
                          }}
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          <Download className="h-4 w-4" />
                          Export to Excel
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setMode("overview")}
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          <FileSpreadsheet className="h-4 w-4" />
                          Projects Overview
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => navigate("/kpis")}
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          <BarChart3 className="h-4 w-4" />
                          KPIs Dashboard
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
              <ProjectList
                onSelectProject={handleSelectProject}
                onCreateNew={() => setMode("form")}
                filterManager={selectedManagers}
                filterStatus={selectedStatus}
                filterDepartment={selectedDepartment}
                filterStatusHealth={selectedStatusHealth}
                onFilteredCountChange={setFilteredProjectCount}
                onTotalCountChange={setTotalProjectCount}
                totalProjectCount={totalProjectCount}
              />
            </div>
          )}

          {mode === "form" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-semibold text-white">
                  Create New Project
                </h2>
                <Button
                  variant="outline"
                  onClick={() => setMode("list")}
                  className="text-white border-white/30 hover:bg-white/10 hover:text-white"
                >
                  Cancel
                </Button>
              </div>
              <ProjectForm
                onBack={() => setMode("list")}
                onSubmit={async (data) => {
                  if (!data.title.trim()) {
                    toast({
                      title: "Error",
                      description: "Project title is required",
                      variant: "destructive",
                    });
                    return;
                  }

                  try {
                    // Get current user's department
                    const { data: profile } = await supabase
                      .from("profiles")
                      .select("department, full_name")
                      .eq("id", user?.id)
                      .single();

                    const projectData = {
                      title: data.title,
                      description: data.description || "",
                      valueStatement: data.valueStatement || "",
                      status: data.status || "active",
                      health_calculation_type:
                        data.health_calculation_type || "automatic",
                      manual_health_percentage:
                        data.health_calculation_type === "manual"
                          ? data.manual_health_percentage
                          : null,
                      budget_total: parseFloat(
                        data.budget.total.replace(/,/g, "") || "0",
                      ),
                      budget_actuals: parseFloat(
                        data.budget.actuals.replace(/,/g, "") || "0",
                      ),
                      budget_forecast: parseFloat(
                        data.budget.forecast.replace(/,/g, "") || "0",
                      ),
                      charter_link: data.charterLink || "",
                      sponsors: data.sponsors || "",
                      business_leads: data.businessLeads || "",
                      project_manager:
                        data.projectManager || profile?.full_name || "",
                      department: data.department || profile?.department, // Use selected department or user's department
                      milestones: data.milestones.filter(
                        (m) => m.milestone.trim() !== "",
                      ),
                      accomplishments: data.accomplishments.filter(
                        (a) => a.trim() !== "",
                      ),
                      next_period_activities: data.nextPeriodActivities
                        .filter((a) => a.description.trim() !== "")
                        .map((a) => ({
                          description: a.description,
                          date: a.date,
                          completion: a.completion,
                          assignee: a.assignee,
                        })),
                      risks: data.risks
                        .filter((r) =>
                          typeof r === "string"
                            ? r.trim() !== ""
                            : r.description && r.description.trim() !== "",
                        )
                        .map((r) =>
                          typeof r === "string"
                            ? { description: r, impact: "" }
                            : {
                                description: r.description || "",
                                impact: r.impact || "",
                              },
                        ),
                      considerations: data.considerations.filter(
                        (c) => c.trim() !== "",
                      ),
                      changes: data.changes
                        .filter((c) => c.change.trim() !== "")
                        .map((c) => ({
                          change: c.change,
                          impact: c.impact,
                          disposition: c.disposition,
                        })),
                    };

                    console.log(
                      "Creating project with data:",
                      JSON.stringify(projectData, null, 2),
                    );
                    console.log("Calling projectService.createProject");
                    const project =
                      await projectService.createProject(projectData);
                    console.log(
                      "Project creation result:",
                      project ? "success" : "failed",
                    );
                    if (project) {
                      toast({
                        title: "Success",
                        description: "Project created successfully",
                        className: "bg-green-50 border-green-200",
                      });
                      setProjectData(project);
                      setMode("preview");
                    }
                  } catch (error) {
                    console.error("Error creating project:", error);
                    toast({
                      title: "Error",
                      description:
                        "Failed to create project. Please try again.",
                      variant: "destructive",
                    });
                  }
                }}
              />
            </div>
          )}

          {mode === "preview" && projectData && (
            <ProjectDashboard
              project={projectData}
              onBack={() => setMode("list")}
              initialEditMode={true}
              id={projectData.id}
            />
          )}

          {mode === "overview" && (
            <ProjectsOverview
              onBack={() => setMode("list")}
              filterManager={selectedManagers}
              filterStatus={selectedStatus}
              filterDepartment={selectedDepartment}
              filterStatusHealth={selectedStatusHealth}
            />
          )}
        </div>
      </div>
      <Toaster />

      {/* Profile Setup Dialog */}
      {showProfileSetup && (
        <ProfileSetupDialog
          open={showProfileSetup}
          onComplete={() => setShowProfileSetup(false)}
        />
      )}
    </Layout>
  );
};

export default Home;
