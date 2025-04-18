/**
 * File: ProjectForm.tsx
 * Purpose: Component for creating and editing projects with comprehensive form fields
 * Description: This complex component provides a complete form for creating and editing projects.
 * It includes sections for project details, status, department, health calculation, budget, milestones,
 * accomplishments, activities, risks, considerations, and changes. The component features AI-assisted
 * content generation, milestone management with drag-and-drop reordering, Gantt chart visualization,
 * and unsaved changes protection. It also handles form validation and submission.
 *
 * Imports from:
 * - React core libraries
 * - UI components from shadcn/ui
 * - ProjectPilot AI assistant
 * - GanttChart visualization
 * - MilestoneList and related components
 * - AI service for content generation
 * - Authentication and navigation hooks
 * - Supabase client
 * - Project service
 *
 * Called by:
 * - src/components/home.tsx
 * - src/pages/ProjectDashboard.tsx
 */

import React, { useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import ProjectPilot from "@/components/chat/ProjectPilot";
import GanttChartDialog from "@/components/dashboard/GanttChartDialog";
import { ChevronDown, ChevronRight, Loader2, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Wand2, Info, BarChart2, ArrowLeft } from "lucide-react";
import { MilestoneList } from "./MilestoneList";
import { aiService } from "@/lib/services/aiService";
import { SuggestedMilestones } from "./SuggestedMilestones";
import { useToast } from "./ui/use-toast";
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
import { useAuth } from "@/lib/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import DepartmentSelect from "@/components/DepartmentSelect";
import { useNavigate } from "react-router-dom";
import { useUnsavedChangesWarning } from "@/lib/hooks/useUnsavedChangesWarning";
import {
  projectService,
  calculateWeightedCompletion,
} from "@/lib/services/project";

interface ProjectFormProps {
  onBack?: () => void;
  projectId?: string;
  setIsDragging?: (dragging: boolean) => void;
  initialData?: {
    title: string;
    description?: string;
    valueStatement?: string;
    status?: "active" | "on_hold" | "completed" | "cancelled" | "draft";
    health_calculation_type?: "automatic" | "manual";
    manual_health_percentage?: number;
    manual_status_color?: "green" | "yellow" | "red";
    budget: {
      total: string;
      actuals: string;
      forecast: string;
    };
    charterLink: string;
    sponsors: string;
    businessLeads: string;
    projectManager: string;
    department?: string;
    milestones: Array<{
      date: string;
      milestone: string;
      owner: string;
      completion: number;
      status: "green" | "yellow" | "red";
      tasks?: Array<{
        id?: string;
        description: string;
        assignee: string;
        date: string;
        completion: number;
      }>;
    }>;
    accomplishments: string[];
    nextPeriodActivities: Array<{
      description: string;
      date: string;
      completion: number;
      assignee: string;
    }>;
    risks: string[];
    considerations: string[];
    changes: Array<{
      change: string;
      impact: string;
      disposition: string;
    }>;
  };
  onSubmit: (data: any) => void;
}

const defaultFormData = {
  title: "",
  description: "",
  valueStatement: "",
  projectAnalysis: "",
  status: "active" as const,
  health_calculation_type: "automatic" as const,
  manual_health_percentage: 0,
  manual_status_color: "green" as "green" | "yellow" | "red",
  budget: {
    total: "0",
    actuals: "0",
    forecast: "0",
  },
  charterLink: "",
  sponsors: "",
  businessLeads: "",
  projectManager: "",
  department: "",
  milestones: [],
  accomplishments: [],
  nextPeriodActivities: [],
  risks: [],
  considerations: [],
  changes: [],
};

const ProjectForm: React.FC<ProjectFormProps> = ({
  initialData,
  onSubmit,
  onBack,
  projectId,
  setIsDragging,
}) => {
  // Log the projectId for debugging
  console.log("ProjectForm received projectId:", projectId);
  console.log("ProjectForm received initialData:", initialData);
  // Ensure projectId is a string and has a default value
  const safeProjectId = projectId || "";
  const [formData, setFormData] = React.useState(() => {
    // Ensure manual_status_color has a default value if not provided
    const mergedData = {
      ...defaultFormData,
      ...initialData,
      manual_status_color: initialData?.manual_status_color || "green",
    };
    console.log(
      "Initial formData with manual_status_color:",
      mergedData.manual_status_color,
    );
    return mergedData;
  });
  const [hasChanges, setHasChanges] = React.useState(false);
  const [showUnsavedChangesDialog, setShowUnsavedChangesDialog] =
    React.useState(false);
  const [pendingNavigationAction, setPendingNavigationAction] =
    React.useState<() => void | null>(null);
  const navigate = useNavigate();

  // For debugging
  React.useEffect(() => {
    console.log("Form data department:", formData.department);
    console.log("Current manual_status_color:", formData.manual_status_color);
  }, [formData.department, formData.manual_status_color]);

  // Track user interaction with the form
  const [hasUserInteracted, setHasUserInteracted] = React.useState(false);

  // Track changes by comparing current form data with initial data
  useEffect(() => {
    if (!initialData) return;

    // Deep comparison function for nested objects
    const isEqual = (obj1: any, obj2: any): boolean => {
      if (obj1 === obj2) return true;
      if (
        typeof obj1 !== "object" ||
        typeof obj2 !== "object" ||
        obj1 === null ||
        obj2 === null
      )
        return false;

      const keys1 = Object.keys(obj1);
      const keys2 = Object.keys(obj2);

      if (keys1.length !== keys2.length) return false;

      for (const key of keys1) {
        if (!keys2.includes(key)) return false;

        // Handle arrays specially
        if (Array.isArray(obj1[key]) && Array.isArray(obj2[key])) {
          if (obj1[key].length !== obj2[key].length) return false;

          // For simple arrays of primitives
          if (typeof obj1[key][0] !== "object") {
            if (
              !obj1[key].every(
                (item: any, index: number) => item === obj2[key][index],
              )
            )
              return false;
          } else {
            // For arrays of objects, we need to compare each object
            if (
              !obj1[key].every((item: any, index: number) =>
                isEqual(item, obj2[key][index]),
              )
            )
              return false;
          }
        } else if (typeof obj1[key] === "object" && obj1[key] !== null) {
          if (!isEqual(obj1[key], obj2[key])) return false;
        } else if (obj1[key] !== obj2[key]) {
          return false;
        }
      }

      return true;
    };

    // Compare current form data with initial data
    const formHasChanges = !isEqual(formData, initialData);
    console.log("Form has changes:", formHasChanges);
    setHasChanges(formHasChanges);

    // Set the data-has-changes attribute on the form element
    const formElement = document.querySelector("form");
    if (formElement) {
      formElement.setAttribute("data-has-changes", formHasChanges.toString());
      formElement.setAttribute(
        "data-user-interaction",
        hasUserInteracted.toString(),
      );
      // Log the current state for debugging
      console.log("Form attributes updated:", {
        "data-has-changes": formElement.getAttribute("data-has-changes"),
        "data-user-interaction": formElement.getAttribute(
          "data-user-interaction",
        ),
        "data-just-saved": formElement.getAttribute("data-just-saved"),
      });
    }
  }, [formData, initialData, hasUserInteracted]);

  // Reset hasChanges and hasUserInteracted when initialData changes (after a successful save)
  useEffect(() => {
    if (initialData) {
      setHasChanges(false);
      setHasUserInteracted(false);

      // Also reset the form data to match initialData
      const updatedFormData = {
        ...defaultFormData,
        ...initialData,
        manual_status_color: initialData?.manual_status_color || "green",
      };
      console.log(
        "Updating formData with new initialData, manual_status_color:",
        updatedFormData.manual_status_color,
      );
      setFormData(updatedFormData);

      // Reset form attributes
      const formElement = document.querySelector("form");
      if (formElement) {
        formElement.setAttribute("data-has-changes", "false");
        formElement.setAttribute("data-user-interaction", "false");
        formElement.setAttribute("data-just-saved", "false");
        console.log("Form attributes reset after initialData change");
      }
    }
  }, [initialData]);

  // Handler for showing the unsaved changes dialog
  const handleShowUnsavedChangesDialog = useCallback(
    (continueCallback: () => void) => {
      setPendingNavigationAction(() => continueCallback);
      setShowUnsavedChangesDialog(true);
    },
    [],
  );

  // Use our custom hook to handle navigation with unsaved changes
  const { navigateSafely } = useUnsavedChangesWarning(
    hasChanges,
    handleShowUnsavedChangesDialog,
  );

  // Custom navigation handler to show dialog when needed
  const handleNavigation = useCallback(
    (action: () => void) => {
      if (hasChanges) {
        setPendingNavigationAction(() => action);
        setShowUnsavedChangesDialog(true);
      } else {
        action();
      }
    },
    [hasChanges],
  );

  const [showSuggestedMilestones, setShowSuggestedMilestones] =
    React.useState(false);
  const [suggestedMilestones, setSuggestedMilestones] = React.useState([]);
  const [showOverwriteDialog, setShowOverwriteDialog] = React.useState(false);
  const [showGanttChart, setShowGanttChart] = React.useState(false);
  const [pendingGenerationType, setPendingGenerationType] = React.useState<
    "description" | "value" | null
  >(null);
  const [isGeneratingAnalysis, setIsGeneratingAnalysis] = React.useState(false);
  const [isAnalysisExpanded, setIsAnalysisExpanded] = React.useState(false);
  const [isAnalysisLoading, setIsAnalysisLoading] = React.useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    console.log(
      "[DEBUG] Submitting form data with manual_status_color:",
      formData.manual_status_color,
    );
    e.preventDefault();
    console.log("Submitting form data:", formData);

    // Set the form as just saved before submitting to prevent navigation warnings
    const formElement = document.querySelector("form");
    if (formElement) {
      formElement.setAttribute("data-just-saved", "true");
    }

    const success = await onSubmit(formData);
    if (success) {
      // Don't try to modify the initialData prop directly as it's read-only
      // Instead, we'll rely on the parent component to pass updated initialData

      setHasChanges(false);
      setHasUserInteracted(false);

      // Update the form element attributes to reflect saved state
      if (formElement) {
        formElement.setAttribute("data-has-changes", "false");
        formElement.setAttribute("data-user-interaction", "false");
        formElement.setAttribute("data-just-saved", "true");
      }
    }
  };

  const handleGenerateContent = async (
    type: "description" | "value" | "milestones" | "analysis",
  ) => {
    // Check if we need to show the overwrite dialog
    if (type === "description" && formData.description?.trim()) {
      setPendingGenerationType("description");
      setShowOverwriteDialog(true);
      return;
    }
    if (type === "value" && formData.valueStatement?.trim()) {
      setPendingGenerationType("value");
      setShowOverwriteDialog(true);
      return;
    }

    // For analysis, set loading state immediately
    if (type === "analysis") {
      console.log("Setting analysis loading state and expanding section");
      setIsAnalysisLoading(true);
      setIsAnalysisExpanded(true);

      // Clear any existing analysis to ensure we don't show stale content
      setFormData((prev) => ({
        ...prev,
        projectAnalysis: "",
      }));
    }

    // If no existing content or it's milestones or analysis, proceed with generation
    await generateContent(type);
  };

  const generateContent = async (
    type: "description" | "value" | "milestones" | "analysis",
  ) => {
    try {
      if (!formData.title) {
        toast({
          title: "Error",
          description: "Please enter a project title first",
          variant: "destructive",
        });
        return;
      }

      // Show loading toast and set loading state for analysis
      if (type === "analysis") {
        setIsGeneratingAnalysis(true);
        setIsAnalysisLoading(true);
        toast({
          title: "Analyzing Project",
          description: "Generating executive summary based on project data...",
          duration: 10000, // 10 seconds or until dismissed
        });
      }

      // For analysis, we need to pass the entire form data to get a comprehensive analysis
      const content = await aiService.generateContent(
        type,
        formData.title,
        formData.description,
        type === "analysis" ? formData : undefined,
      );

      if (type === "milestones") {
        try {
          const parsedMilestones = JSON.parse(content);
          setSuggestedMilestones(parsedMilestones);
          setShowSuggestedMilestones(true);
        } catch (error) {
          console.error("Failed to parse milestones:", error);
          toast({
            title: "Error",
            description: "Failed to generate milestones",
            variant: "destructive",
          });
        }
      } else if (type === "analysis") {
        console.log("AI generated analysis content:", content);

        // Store the analysis content in a variable
        const analysisContent = content;

        // Save the analysis to the database immediately
        if (safeProjectId) {
          console.log(
            "Saving analysis to database for project:",
            safeProjectId,
          );
          await projectService.updateProjectAnalysis(
            safeProjectId,
            analysisContent,
          );
        }

        // Update the form data with the analysis content
        setFormData((prev) => ({
          ...prev,
          projectAnalysis: analysisContent,
        }));

        // Update UI states after a short delay to ensure state is updated
        setTimeout(() => {
          setIsGeneratingAnalysis(false);
          setIsAnalysisLoading(false);

          toast({
            title: "Analysis Complete",
            description: "Executive summary has been generated and saved",
            className: "bg-green-50 border-green-200",
          });
        }, 100);
      } else {
        setFormData((prev) => ({
          ...prev,
          [type === "value" ? "valueStatement" : "description"]: content,
        }));
      }
    } catch (error) {
      if (type === "analysis") {
        setIsGeneratingAnalysis(false);
        setIsAnalysisLoading(false);
      }
      toast({
        title: "Error",
        description: `Failed to generate ${type}`,
        variant: "destructive",
      });
    }
  };

  const cardClasses =
    "p-4 bg-white rounded-2xl border border-gray-200 shadow-sm";

  const handleDeleteProject = async () => {
    try {
      console.log("Attempting to delete project with ID:", safeProjectId);
      if (!safeProjectId || safeProjectId.trim() === "") {
        toast({
          title: "Error",
          description: "No project ID found. Cannot delete project.",
          variant: "destructive",
        });
        return;
      }
      const success = await projectService.deleteProject(safeProjectId);
      if (success) {
        toast({
          title: "Project Deleted",
          description: "The project has been successfully deleted.",
          className: "bg-green-50 border-green-200",
        });
        if (onBack) onBack();
        else navigate("/");
      } else {
        toast({
          title: "Error",
          description: "Failed to delete the project.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error deleting project:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while deleting the project.",
        variant: "destructive",
      });
    }
  };

  return (
    <TooltipProvider>
      <form
        onSubmit={handleSubmit}
        className="max-w-[1200px] mx-auto space-y-3"
        data-has-changes={hasChanges ? "true" : "false"}
        data-user-interaction={hasUserInteracted ? "true" : "false"}
        data-just-saved="false"
        onClick={() => !hasUserInteracted && setHasUserInteracted(true)}
        onChange={() => !hasUserInteracted && setHasUserInteracted(true)}
        onKeyDown={(e) => {
          // Prevent form submission on Enter key press
          if (e.key === "Enter" && e.target.tagName !== "TEXTAREA") {
            e.preventDefault();
            // Find the next focusable element
            const focusableElements =
              'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
            const form = e.currentTarget;
            const elements = Array.from(
              form.querySelectorAll(focusableElements),
            );
            const index = elements.indexOf(e.target as HTMLElement);
            if (index > -1 && index < elements.length - 1) {
              const nextElement = elements[index + 1] as HTMLElement;
              nextElement.focus();
            }
          }
        }}
      >
        {/* Project Pilot Chat Assistant */}
        <ProjectPilot projectId={safeProjectId} projectTitle={formData.title} />
        {/* Project Title, Description and Value Statement */}
        <div className={cardClasses}>
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-blue-800">
                Project Details
              </h3>
              <div className="flex items-center gap-4">
                <div className="text-sm text-gray-600">Overall Completion:</div>
                <div
                  className={`w-16 h-16 flex items-center justify-center text-white text-2xl font-bold rounded-full shadow-md border border-gray-700 ${formData.health_calculation_type === "manual" ? `bg-${formData.manual_status_color}-500` : "bg-green-500"}`}
                >
                  {formData.health_calculation_type === "manual"
                    ? formData.manual_health_percentage
                    : calculateWeightedCompletion(formData.milestones)}
                  %
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <Label htmlFor="title">Project Title</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">
                          Enter a clear, descriptive title for your project.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* Delete Project Button */}
                  <Button
                    type="button"
                    onClick={() => {
                      setPendingNavigationAction(() => handleDeleteProject);
                      setShowUnsavedChangesDialog(true);
                    }}
                    variant="outline"
                    className="flex items-center gap-2 bg-red-50 text-red-600 hover:bg-red-100 border-red-200"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete Project
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setShowGanttChart(true)}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <BarChart2 className="h-4 w-4" />
                    View Gantt Chart
                  </Button>
                </div>
              </div>
              <RichTextEditor
                id="title"
                value={formData.title}
                onChange={(value) =>
                  setFormData((prev) => ({ ...prev, title: value }))
                }
                placeholder="Enter project title"
                className="bg-white/50 backdrop-blur-sm border-gray-200/50"
                minHeight="50px"
                onKeyDown={(e) => {
                  // Handle tab navigation in rich text editor
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    // Find the next focusable element
                    const focusableElements =
                      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
                    const form = document.querySelector("form");
                    if (form) {
                      const elements = Array.from(
                        form.querySelectorAll(focusableElements),
                      );
                      const index = elements.findIndex(
                        (el) =>
                          el.id === "title" ||
                          el.contains(document.activeElement),
                      );
                      if (index > -1 && index < elements.length - 1) {
                        const nextElement = elements[index + 1] as HTMLElement;
                        nextElement.focus();
                      }
                    }
                  }
                }}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <Label htmlFor="description">Project Description</Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">
                        Provide a comprehensive description of the project,
                        including its purpose, goals, and scope. You can use the
                        AI button to automatically generate a description based
                        on your project title.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleGenerateContent("description")}
                  className="bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-200"
                >
                  <Wand2 className="h-4 w-4 mr-2" />
                  Use AI to Generate
                </Button>
              </div>
              <RichTextEditor
                id="description"
                value={formData.description}
                onChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: value,
                  }))
                }
                placeholder="Enter project description"
                className="bg-white/50 backdrop-blur-sm border-gray-200/50"
                minHeight="120px"
                onKeyDown={(e) => {
                  // Handle tab navigation in rich text editor
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    // Find the next focusable element
                    const focusableElements =
                      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
                    const form = document.querySelector("form");
                    if (form) {
                      const elements = Array.from(
                        form.querySelectorAll(focusableElements),
                      );
                      const index = elements.findIndex(
                        (el) =>
                          el.id === "description" ||
                          el.contains(document.activeElement),
                      );
                      if (index > -1 && index < elements.length - 1) {
                        const nextElement = elements[index + 1] as HTMLElement;
                        nextElement.focus();
                      }
                    }
                  }
                }}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <Label htmlFor="valueStatement">Value Statement</Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">
                        Explain the business value and strategic importance of
                        this project to the organization. You can use the AI
                        button to automatically generate a value statement based
                        on your project title and description.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleGenerateContent("value")}
                  className="bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-200"
                >
                  <Wand2 className="h-4 w-4 mr-2" />
                  Use AI to Generate
                </Button>
              </div>
              <RichTextEditor
                id="valueStatement"
                value={formData.valueStatement}
                onChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    valueStatement: value,
                  }))
                }
                placeholder="Enter value statement"
                className="bg-white/50 backdrop-blur-sm border-gray-200/50"
                minHeight="120px"
                onKeyDown={(e) => {
                  // Handle tab navigation in rich text editor
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    // Find the next focusable element
                    const focusableElements =
                      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
                    const form = document.querySelector("form");
                    if (form) {
                      const elements = Array.from(
                        form.querySelectorAll(focusableElements),
                      );
                      const index = elements.findIndex(
                        (el) =>
                          el.id === "valueStatement" ||
                          el.contains(document.activeElement),
                      );
                      if (index > -1 && index < elements.length - 1) {
                        const nextElement = elements[index + 1] as HTMLElement;
                        nextElement.focus();
                      }
                    }
                  }
                }}
              />
            </div>

            {/* Project Analysis Section */}
            <div className="space-y-2 mt-4 border-t pt-4">
              <div
                className="flex items-center justify-between cursor-pointer"
                onClick={() => setIsAnalysisExpanded(!isAnalysisExpanded)}
              >
                <div className="flex items-center gap-1">
                  {isAnalysisExpanded ? (
                    <ChevronDown className="h-4 w-4 text-purple-600" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-purple-600" />
                  )}
                  <Label htmlFor="projectAnalysis" className="cursor-pointer">
                    Project Analysis
                  </Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">
                        Generate an executive summary of the current project
                        status based on all project data.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleGenerateContent("analysis");
                    setIsAnalysisExpanded(true);
                    console.log("Expanding analysis section");
                  }}
                  disabled={isGeneratingAnalysis}
                  className="bg-purple-50 text-purple-600 hover:bg-purple-100 border-purple-200"
                >
                  {isGeneratingAnalysis ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-4 w-4 mr-2" />
                      AI Executive Summary
                    </>
                  )}
                </Button>
              </div>
              {isAnalysisExpanded && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mt-2 transition-all duration-300">
                  {isAnalysisLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
                      <span className="ml-2 text-purple-600">
                        Loading analysis...
                      </span>
                    </div>
                  ) : (
                    <>
                      {formData.projectAnalysis ? (
                        <div
                          className="prose prose-sm max-w-none"
                          dangerouslySetInnerHTML={{
                            __html: formData.projectAnalysis,
                          }}
                        />
                      ) : (
                        <div className="text-center text-gray-500 py-4">
                          No analysis available. Click the "AI Executive
                          Summary" button to generate one.
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Project Status and Department */}
        <div className={cardClasses}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-1 mb-4">
                <h3 className="text-xl font-bold text-blue-800">
                  Project Status
                </h3>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">
                      Select the current status of your project. You may select
                      Active, On Hold, Completed, Cancelled, or Draft.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Select
                value={formData.status}
                onValueChange={(value: any) =>
                  setFormData((prev) => ({ ...prev, status: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-1 mb-4">
                <h3 className="text-xl font-bold text-blue-800">Department</h3>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">
                      Select the department this project belongs to. Only users
                      in this department will be able to see this project.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <DepartmentSelect
                value={formData.department || ""}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, department: value }))
                }
              />
            </div>
          </div>
        </div>

        {/* Health Calculation */}
        <div className={cardClasses}>
          <div className="space-y-2">
            <div className="flex items-center gap-1 mb-4">
              <h3 className="text-2xl font-bold text-blue-800">
                Health Calculation
              </h3>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">
                    Choose how project health is calculated. Automatic uses
                    milestone completion percentages, while Manual allows you to
                    set a specific percentage.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            <Select
              value={formData.health_calculation_type}
              onValueChange={(value: any) =>
                setFormData((prev) => ({
                  ...prev,
                  health_calculation_type: value,
                }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select calculation type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="automatic">Automatic</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Health Percentage */}
        {formData.health_calculation_type === "manual" && (
          <div className={cardClasses}>
            <div className="space-y-4">
              <div className="flex items-center gap-1 mb-4">
                <h3 className="text-2xl font-bold text-blue-800">
                  Health Status
                </h3>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">
                      Set the health percentage and status color for the
                      project.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-1">
                    <Label htmlFor="manual_health_percentage">
                      Health Percentage
                    </Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">
                          Enter a percentage (0-100) to manually set the project
                          health. This is only used when Health Calculation is
                          set to Manual.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Input
                    id="manual_health_percentage"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.manual_health_percentage}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        manual_health_percentage: Number(e.target.value),
                      }))
                    }
                    className="bg-white/50 backdrop-blur-sm border-gray-200/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="manual_status_color">Status Color</Label>
                  <Select
                    value={formData.manual_status_color}
                    onValueChange={(value: "red" | "yellow" | "green") => {
                      console.log("Setting manual_status_color to:", value);
                      setFormData((prev) => ({
                        ...prev,
                        manual_status_color: value,
                      }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select color" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="green">Green</SelectItem>
                      <SelectItem value="yellow">Yellow</SelectItem>
                      <SelectItem value="red">Red</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Budget & Links */}
        <div className={cardClasses}>
          <div className="flex items-center gap-1 mb-4">
            <h3 className="text-2xl font-bold text-blue-800">Budget & Links</h3>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">
                  Enter budget information and important links related to the
                  project.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-1">
                  <Label htmlFor="budget_total">Total Budget</Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">
                        Enter the total approved budget for this project as a
                        numerical value (without currency symbols).
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Input
                  id="budget_total"
                  value={formData.budget.total}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      budget: { ...prev.budget, total: e.target.value },
                    }))
                  }
                  placeholder="Enter total budget"
                  className="bg-white/50 backdrop-blur-sm border-gray-200/50"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-1">
                  <Label htmlFor="budget_actuals">Actuals</Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">
                        Enter the actual amount spent on the project to date as
                        a numerical value.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Input
                  id="budget_actuals"
                  value={formData.budget.actuals}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      budget: { ...prev.budget, actuals: e.target.value },
                    }))
                  }
                  placeholder="Enter actuals"
                  className="bg-white/50 backdrop-blur-sm border-gray-200/50"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-1">
                  <Label htmlFor="budget_forecast">Forecast</Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">
                        Enter the forecasted remaining spend for the project as
                        a numerical value.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Input
                  id="budget_forecast"
                  value={formData.budget.forecast}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      budget: { ...prev.budget, forecast: e.target.value },
                    }))
                  }
                  placeholder="Enter forecast"
                  className="bg-white/50 backdrop-blur-sm border-gray-200/50"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-1">
                  <Label htmlFor="charterLink">Charter Link</Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">
                        Enter the URL to the project charter document or
                        relevant project documentation.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Input
                  id="charterLink"
                  value={formData.charterLink}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      charterLink: e.target.value,
                    }))
                  }
                  placeholder="Enter charter link"
                  className="bg-white/50 backdrop-blur-sm border-gray-200/50"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-1">
                  <Label htmlFor="sponsors">Sponsors</Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">
                        Enter the names of the project sponsors or stakeholders
                        who have authorized the project.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Input
                  id="sponsors"
                  value={formData.sponsors}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      sponsors: e.target.value,
                    }))
                  }
                  placeholder="Enter sponsors"
                  className="bg-white/50 backdrop-blur-sm border-gray-200/50"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-1">
                  <Label htmlFor="businessLeads">Business Leads</Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">
                        Enter the names of the business leads or key
                        stakeholders responsible for business decisions.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Input
                  id="businessLeads"
                  value={formData.businessLeads}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      businessLeads: e.target.value,
                    }))
                  }
                  placeholder="Enter business leads"
                  className="bg-white/50 backdrop-blur-sm border-gray-200/50"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-1">
                  <Label htmlFor="projectManager">Project Manager</Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">
                        Enter the name of the project manager responsible for
                        day-to-day project execution.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Input
                  id="projectManager"
                  value={formData.projectManager}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      projectManager: e.target.value,
                    }))
                  }
                  placeholder="Enter project manager"
                  className="bg-white/50 backdrop-blur-sm border-gray-200/50"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Milestones */}
        <div className={cardClasses}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-1">
              <h3 className="text-2xl font-bold text-blue-800">Milestones</h3>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">
                    Add key project milestones with dates, owners, and
                    completion status. Drag to reorder, click Add Milestone to
                    create new ones, or use AI to generate suggested milestones
                    based on your project title and description.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleGenerateContent("milestones")}
              className="bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-200"
            >
              <Wand2 className="h-4 w-4 mr-2" />
              Use AI to Generate
            </Button>
          </div>

          <div className="space-y-4">
            {/* Column Headers */}
            <div className="grid grid-cols-[30px_1fr] gap-2">
              <div></div>
              <div className="grid grid-cols-[140px_1fr_150px_auto] gap-2">
                <div className="font-medium text-sm text-blue-800">Date</div>
                <div className="font-medium text-sm text-blue-800">
                  Milestone
                </div>
                <div className="font-medium text-sm text-blue-800">Owner</div>
                <div className="grid grid-cols-[80px_70px_120px_40px] gap-2">
                  <div className="font-medium text-sm text-blue-800">
                    Completion %
                  </div>
                  <div className="font-medium text-sm text-blue-800">
                    Weight
                  </div>
                  <div className="font-medium text-sm text-blue-800">
                    Status
                  </div>
                  <div></div>
                </div>
              </div>
            </div>
            <MilestoneList
              milestones={formData.milestones}
              onMilestonesChange={(newMilestones) =>
                setFormData((prev) => ({
                  ...prev,
                  milestones: newMilestones,
                }))
              }
              setIsDragging={setIsDragging}
              onUpdate={(index, values) =>
                setFormData((prev) => ({
                  ...prev,
                  milestones: prev.milestones.map((m, i) =>
                    i === index ? { ...m, ...values } : m,
                  ),
                }))
              }
              onDelete={(index) =>
                setFormData((prev) => ({
                  ...prev,
                  milestones: prev.milestones.filter((_, i) => i !== index),
                }))
              }
            />
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setFormData((prev) => ({
                  ...prev,
                  milestones: [
                    ...prev.milestones,
                    {
                      date: new Date().toISOString().split("T")[0],
                      milestone: "",
                      owner: "",
                      completion: 0,
                      status: "green",
                      tasks: [], // Initialize with empty tasks array
                    },
                  ],
                }))
              }
              className="bg-white/50 backdrop-blur-sm border-gray-200/50"
            >
              Add Milestone
            </Button>
          </div>
        </div>

        {/* Accomplishments */}
        <div className={cardClasses}>
          <div className="flex items-center gap-1 mb-4">
            <h3 className="text-2xl font-bold text-blue-800">
              Accomplishments
            </h3>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">
                  List key accomplishments or completed deliverables for the
                  project to date.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="space-y-4">
            {formData.accomplishments.map((item, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={item}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      accomplishments: prev.accomplishments.map((a, i) =>
                        i === index ? e.target.value : a,
                      ),
                    }))
                  }
                  placeholder="Enter accomplishment"
                  className="bg-white/50 backdrop-blur-sm border-gray-200/50"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      accomplishments: prev.accomplishments.filter(
                        (_, i) => i !== index,
                      ),
                    }))
                  }
                  className="bg-white/50 backdrop-blur-sm border-gray-200/50"
                >
                  Remove
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setFormData((prev) => ({
                  ...prev,
                  accomplishments: [...prev.accomplishments, ""],
                }))
              }
              className="bg-white/50 backdrop-blur-sm border-gray-200/50"
            >
              Add Accomplishment
            </Button>
          </div>
        </div>

        {/* Next Period Activities */}
        <div className={cardClasses}>
          <div className="flex items-center gap-1 mb-4">
            <h3 className="text-2xl font-bold text-blue-800">
              Next Period Activities
            </h3>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">
                  List activities planned for the next reporting period,
                  including dates, completion percentages, and assignees.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="space-y-4">
            {/* Column Headers */}
            <div className="grid grid-cols-[1fr_140px_100px_150px_auto] gap-2 items-start">
              <div className="font-medium text-sm text-blue-800">Activity</div>
              <div className="font-medium text-sm text-blue-800">Date</div>
              <div className="font-medium text-sm text-blue-800">
                Completion %
              </div>
              <div className="font-medium text-sm text-blue-800">Assignee</div>
              <div></div>
            </div>
            {formData.nextPeriodActivities.map((item, index) => (
              <div
                key={index}
                className="grid grid-cols-[1fr_140px_100px_150px_auto] gap-2 items-start"
              >
                <Input
                  value={item.description}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      nextPeriodActivities: prev.nextPeriodActivities.map(
                        (a, i) =>
                          i === index
                            ? { ...a, description: e.target.value }
                            : a,
                      ),
                    }))
                  }
                  placeholder="Enter activity"
                  className="bg-white/50 backdrop-blur-sm border-gray-200/50"
                />
                <Input
                  type="date"
                  value={item.date}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      nextPeriodActivities: prev.nextPeriodActivities.map(
                        (a, i) =>
                          i === index ? { ...a, date: e.target.value } : a,
                      ),
                    }))
                  }
                  className="bg-white/50 backdrop-blur-sm border-gray-200/50"
                />
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={item.completion}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      nextPeriodActivities: prev.nextPeriodActivities.map(
                        (a, i) =>
                          i === index
                            ? { ...a, completion: Number(e.target.value) }
                            : a,
                      ),
                    }))
                  }
                  className="bg-white/50 backdrop-blur-sm border-gray-200/50"
                />
                <Input
                  value={item.assignee}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      nextPeriodActivities: prev.nextPeriodActivities.map(
                        (a, i) =>
                          i === index ? { ...a, assignee: e.target.value } : a,
                      ),
                    }))
                  }
                  placeholder="Enter assignee"
                  className="bg-white/50 backdrop-blur-sm border-gray-200/50"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      nextPeriodActivities: prev.nextPeriodActivities.filter(
                        (_, i) => i !== index,
                      ),
                    }))
                  }
                  className="bg-white/50 backdrop-blur-sm border-gray-200/50"
                >
                  Remove
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setFormData((prev) => ({
                  ...prev,
                  nextPeriodActivities: [
                    ...prev.nextPeriodActivities,
                    {
                      description: "",
                      date: new Date().toISOString().split("T")[0],
                      completion: 0,
                      assignee: "",
                    },
                  ],
                }))
              }
              className="bg-white/50 backdrop-blur-sm border-gray-200/50"
            >
              Add Activity
            </Button>
          </div>
        </div>

        {/* Risks */}
        <div className={cardClasses}>
          <div className="flex items-center gap-1 mb-4">
            <h3 className="text-2xl font-bold text-blue-800">Risks</h3>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">
                  List any risks or challenges that could impact the project's
                  success.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="space-y-4">
            {formData.risks.map((item, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={
                    typeof item === "string" ? item : item.description || ""
                  }
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      risks: prev.risks.map((r, i) =>
                        i === index
                          ? {
                              description: e.target.value,
                              impact: typeof r === "object" ? r.impact : "",
                            }
                          : r,
                      ),
                    }))
                  }
                  placeholder="Enter risk"
                  className="bg-white/50 backdrop-blur-sm border-gray-200/50"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      risks: prev.risks.filter((_, i) => i !== index),
                    }))
                  }
                  className="bg-white/50 backdrop-blur-sm border-gray-200/50"
                >
                  Remove
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setFormData((prev) => ({
                  ...prev,
                  risks: [...prev.risks, { description: "", impact: "" }],
                }))
              }
              className="bg-white/50 backdrop-blur-sm border-gray-200/50"
            >
              Add Risk
            </Button>
          </div>
        </div>

        {/* Considerations */}
        <div className={cardClasses}>
          <div className="flex items-center gap-1 mb-4">
            <h3 className="text-2xl font-bold text-blue-800">Considerations</h3>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">
                  List any additional considerations, dependencies, or factors
                  that should be taken into account.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="space-y-4">
            {formData.considerations.map((item, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={
                    typeof item === "string" ? item : item.description || ""
                  }
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      considerations: prev.considerations.map((c, i) =>
                        i === index
                          ? { description: e.target.value }
                          : typeof c === "string"
                            ? { description: c }
                            : c,
                      ),
                    }))
                  }
                  placeholder="Enter consideration"
                  className="bg-white/50 backdrop-blur-sm border-gray-200/50"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      considerations: prev.considerations.filter(
                        (_, i) => i !== index,
                      ),
                    }))
                  }
                  className="bg-white/50 backdrop-blur-sm border-gray-200/50"
                >
                  Remove
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setFormData((prev) => ({
                  ...prev,
                  considerations: [
                    ...(prev.considerations || []).map((c) =>
                      typeof c === "string" ? { description: c } : c,
                    ),
                    { description: "" },
                  ],
                }))
              }
              className="bg-white/50 backdrop-blur-sm border-gray-200/50"
            >
              Add Consideration
            </Button>
          </div>
        </div>

        {/* Changes */}
        <div className={cardClasses}>
          <div className="flex items-center gap-1 mb-4">
            <h3 className="text-2xl font-bold text-blue-800">Changes</h3>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">
                  Document any changes to the project scope, timeline, or
                  requirements, along with their impact and disposition.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="space-y-4">
            {/* Column Headers */}
            <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-start">
              <div className="font-medium text-sm text-blue-800">Change</div>
              <div className="font-medium text-sm text-blue-800">Impact</div>
              <div className="font-medium text-sm text-blue-800">
                Disposition
              </div>
              <div></div>
            </div>
            {formData.changes.map((item, index) => (
              <div
                key={index}
                className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-start"
              >
                <Input
                  value={item.change}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      changes: prev.changes.map((c, i) =>
                        i === index ? { ...c, change: e.target.value } : c,
                      ),
                    }))
                  }
                  placeholder="Enter change"
                  className="bg-white/50 backdrop-blur-sm border-gray-200/50"
                />
                <Input
                  value={item.impact}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      changes: prev.changes.map((c, i) =>
                        i === index ? { ...c, impact: e.target.value } : c,
                      ),
                    }))
                  }
                  placeholder="Enter impact"
                  className="bg-white/50 backdrop-blur-sm border-gray-200/50"
                />
                <Input
                  value={item.disposition}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      changes: prev.changes.map((c, i) =>
                        i === index ? { ...c, disposition: e.target.value } : c,
                      ),
                    }))
                  }
                  placeholder="Enter disposition"
                  className="bg-white/50 backdrop-blur-sm border-gray-200/50"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      changes: prev.changes.filter((_, i) => i !== index),
                    }))
                  }
                  className="bg-white/50 backdrop-blur-sm border-gray-200/50"
                >
                  Remove
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setFormData((prev) => ({
                  ...prev,
                  changes: [
                    ...prev.changes,
                    { change: "", impact: "", disposition: "" },
                  ],
                }))
              }
              className="bg-white/50 backdrop-blur-sm border-gray-200/50"
            >
              Add Change
            </Button>
          </div>
        </div>

        {/* Floating Submit Button */}
        <div className="fixed bottom-6 left-[calc(50%+600px+20px)] z-50 flex items-center gap-2 bg-white/80 backdrop-blur-sm p-2 rounded-lg shadow-lg border border-gray-200">
          {hasChanges && (
            <span className="text-sm text-blue-600 font-medium">
              Unsaved changes
            </span>
          )}
          <Button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2"
          >
            Save Project
          </Button>
        </div>

        {/* Unsaved Changes Dialog */}
        <AlertDialog
          open={showUnsavedChangesDialog}
          onOpenChange={setShowUnsavedChangesDialog}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
              <AlertDialogDescription>
                You have unsaved changes. Are you sure you want to leave without
                saving?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                onClick={() => {
                  setPendingNavigationAction(null);
                  setShowUnsavedChangesDialog(false);
                }}
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (pendingNavigationAction) {
                    pendingNavigationAction();
                    setPendingNavigationAction(null);
                  }
                  setShowUnsavedChangesDialog(false);
                }}
              >
                Leave Without Saving
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Overwrite Dialog */}
        <AlertDialog
          open={showOverwriteDialog}
          onOpenChange={setShowOverwriteDialog}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Overwrite Existing Content</AlertDialogTitle>
              <AlertDialogDescription>
                This will overwrite your existing content. Are you sure you want
                to proceed?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                onClick={() => {
                  setPendingGenerationType(null);
                  setShowOverwriteDialog(false);
                }}
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (pendingGenerationType) {
                    generateContent(pendingGenerationType);
                    setPendingGenerationType(null);
                  }
                  setShowOverwriteDialog(false);
                }}
              >
                Overwrite
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Suggested Milestones Dialog */}
        {showSuggestedMilestones && (
          <SuggestedMilestones
            milestones={suggestedMilestones}
            onClose={() => setShowSuggestedMilestones(false)}
            onApply={(selectedMilestones) => {
              setFormData((prev) => ({
                ...prev,
                milestones: [
                  ...prev.milestones,
                  ...selectedMilestones.map((m) => ({
                    date: m.date,
                    milestone: m.milestone,
                    owner: m.owner || "",
                    completion: 0,
                    status: "green",
                    tasks: [],
                  })),
                ],
              }));
              setShowSuggestedMilestones(false);
            }}
          />
        )}

        {/* Gantt Chart Dialog */}
        {showGanttChart && (
          <GanttChartDialog
            open={showGanttChart}
            onOpenChange={(open) => setShowGanttChart(open)}
            milestones={formData.milestones}
            projectTitle={formData.title}
          />
        )}
      </form>
    </TooltipProvider>
  );
};

export default ProjectForm;
