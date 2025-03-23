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
import { FileSpreadsheet } from "lucide-react";
import ProfileSetupDialog from "./auth/ProfileSetupDialog";
import { supabase } from "@/lib/supabase";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const Home = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<"list" | "form" | "preview" | "overview">(
    "list",
  );
  const [projectData, setProjectData] = useState(null);
  const [selectedManager, setSelectedManager] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [projectManagers, setProjectManagers] = useState<string[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [profileChecked, setProfileChecked] = useState(false);

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

  return (
    <Layout>
      <div className="p-6 bg-background">
        <div className="max-w-7xl mx-auto space-y-6">
          {mode === "list" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <Select
                    value={selectedDepartment}
                    onValueChange={setSelectedDepartment}
                  >
                    <SelectTrigger className="w-[280px]">
                      <SelectValue placeholder="Filter by Department" />
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

                  <Select
                    value={selectedManager}
                    onValueChange={setSelectedManager}
                  >
                    <SelectTrigger className="w-[280px]">
                      <SelectValue placeholder="Filter by Project Manager" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Project Managers</SelectItem>
                      {projectManagers.map((manager) => (
                        <SelectItem key={manager} value={manager}>
                          {manager}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={selectedStatus}
                    onValueChange={setSelectedStatus}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Filter by Status" />
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
                <Button
                  onClick={() => setMode("overview")}
                  className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Projects Overview
                </Button>
              </div>
              <ProjectList
                onSelectProject={handleSelectProject}
                onCreateNew={() => setMode("form")}
                filterManager={selectedManager}
                filterStatus={selectedStatus}
                filterDepartment={selectedDepartment}
              />
            </div>
          )}

          {mode === "form" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-semibold">Create New Project</h2>
                <Button variant="outline" onClick={() => setMode("list")}>
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
            />
          )}

          {mode === "overview" && (
            <ProjectsOverview
              onBack={() => setMode("list")}
              filterManager={selectedManager}
              filterStatus={selectedStatus}
              filterDepartment={selectedDepartment}
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
