import React, { useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import ProjectPilot from "@/components/chat/ProjectPilot";
import GanttChartDialog from "@/components/dashboard/GanttChartDialog";
import { ChevronDown, ChevronRight } from "lucide-react";
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

interface ProjectFormProps {
  onBack?: () => void;
  projectId?: string;
  initialData?: {
    title: string;
    description?: string;
    valueStatement?: string;
    status?: "active" | "on_hold" | "completed" | "cancelled" | "draft";
    health_calculation_type?: "automatic" | "manual";
    manual_health_percentage?: number;
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
  projectId = "",
}) => {
  const [formData, setFormData] = React.useState(() => ({
    ...defaultFormData,
    ...initialData,
  }));
  const [hasChanges, setHasChanges] = React.useState(false);
  const [showUnsavedChangesDialog, setShowUnsavedChangesDialog] =
    React.useState(false);
  const [pendingNavigationAction, setPendingNavigationAction] =
    React.useState<() => void | null>(null);
  const navigate = useNavigate();

  // For debugging
  React.useEffect(() => {
    console.log("Form data department:", formData.department);
  }, [formData.department]);

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
    }
  }, [formData, initialData]);

  // Reset hasChanges and hasUserInteracted when initialData changes (after a successful save)
  useEffect(() => {
    if (initialData) {
      setHasChanges(false);
      setHasUserInteracted(false);
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
  const [isAnalysisExpanded, setIsAnalysisExpanded] = React.useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Submitting form data:", formData);
    const success = await onSubmit(formData);
    if (success) {
      setHasChanges(false);
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
        setFormData((prev) => ({
          ...prev,
          projectAnalysis: content,
        }));
      } else {
        setFormData((prev) => ({
          ...prev,
          [type === "value" ? "valueStatement" : "description"]: content,
        }));
      }
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to generate ${type}`,
        variant: "destructive",
      });
    }
  };

  const cardClasses =
    "p-4 bg-white rounded-2xl border border-gray-200 shadow-sm";

  return (
    <TooltipProvider>
      <form
        onSubmit={handleSubmit}
        className="max-w-[1200px] mx-auto space-y-3"
        data-has-changes={hasChanges ? "true" : "false"}
        data-user-interaction={hasUserInteracted ? "true" : "false"}
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
        <ProjectPilot projectId={projectId} projectTitle={formData.title} />
        {/* Project Title, Description and Value Statement */}
        <div className={cardClasses}>
          <div className="space-y-4">
            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-blue-800 mb-4">
                Project Details
              </h3>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {onBack && (
                    <Button
                      type="button"
                      onClick={() => handleNavigation(onBack)}
                      variant="ghost"
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Back to Projects
                    </Button>
                  )}
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
                  }}
                  className="bg-purple-50 text-purple-600 hover:bg-purple-100 border-purple-200"
                >
                  <Wand2 className="h-4 w-4 mr-2" />
                  AI Executive Summary
                </Button>
              </div>
              {isAnalysisExpanded && formData.projectAnalysis && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mt-2 transition-all duration-300">
                  <div
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{
                      __html: formData.projectAnalysis,
                    }}
                  />
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
            <div className="space-y-2">
              <div className="flex items-center gap-1 mb-4">
                <h3 className="text-2xl font-bold text-blue-800">
                  Health Percentage
                </h3>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">
                      Enter a percentage (0-100) to manually set the project
                      health. This is only used when Health Calculation is set
                      to Manual.
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
              <div className="grid grid-cols-[140px_1fr_150px_200px] gap-2">
                <div className="font-medium text-sm text-blue-800">Date</div>
                <div className="font-medium text-sm text-blue-800">
                  Milestone
                </div>
                <div className="font-medium text-sm text-blue-800">Owner</div>
                <div className="flex gap-2">
                  <div className="w-24 font-medium text-sm text-blue-800">
                    Completion %
                  </div>
                  <div className="w-24 font-medium text-sm text-blue-800">
                    Status
                  </div>
                  <div className="w-8"></div>
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
            <h3 className="text-2xl font-bold text-blue-800">Risks & Issues</h3>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">
                  List any risks, issues, or challenges that may impact the
                  project's success.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="space-y-4">
            {/* Column Headers */}
            <div className="grid grid-cols-[1fr_1fr_auto] gap-2 items-start">
              <div className="font-medium text-sm text-blue-800">
                Risk/Issue
              </div>
              <div className="font-medium text-sm text-blue-800">Impact</div>
              <div></div>
            </div>
            {formData.risks.map((item, index) => (
              <div
                key={index}
                className="grid grid-cols-[1fr_1fr_auto] gap-2 items-start"
              >
                <Input
                  value={
                    typeof item === "string" ? item : item.description || ""
                  }
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      risks: prev.risks.map((r, i) =>
                        i === index
                          ? typeof r === "string"
                            ? { description: e.target.value, impact: "" }
                            : { ...r, description: e.target.value }
                          : r,
                      ),
                    }))
                  }
                  placeholder="Enter risk or issue"
                  className="bg-white/50 backdrop-blur-sm border-gray-200/50"
                />
                <Input
                  value={typeof item === "string" ? "" : item.impact || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      risks: prev.risks.map((r, i) =>
                        i === index
                          ? typeof r === "string"
                            ? { description: r, impact: e.target.value }
                            : { ...r, impact: e.target.value }
                          : r,
                      ),
                    }))
                  }
                  placeholder="Enter impact"
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

        {/* Considerations Section */}
        <div className={cardClasses}>
          <div className="flex items-center gap-1 mb-4">
            <h3 className="text-2xl font-bold text-blue-800">Considerations</h3>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">
                  List any items that need consideration or decisions from
                  stakeholders.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="space-y-4">
            {formData.considerations.map((item, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={item}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      considerations: prev.considerations.map((c, i) =>
                        i === index ? e.target.value : c,
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
                  considerations: [...prev.considerations, ""],
                }))
              }
              className="bg-white/50 backdrop-blur-sm border-gray-200/50"
            >
              Add Consideration
            </Button>
          </div>
        </div>

        {/* Changes Section */}
        <div className={cardClasses}>
          <div className="flex items-center gap-1 mb-4">
            <h3 className="text-2xl font-bold text-blue-800">Changes</h3>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">
                  List any changes to the project, their impact, and
                  disposition.
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

        {/* Daily Notes Section Removed */}

        {/* Floating Submit Button */}
        <div className="sticky bottom-6 float-right mr-6 z-50">
          <Button
            type="submit"
            className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 rounded-xl px-6 py-6"
          >
            Save Project
          </Button>
        </div>

        {/* Suggested Milestones Dialog */}
        <SuggestedMilestones
          isOpen={showSuggestedMilestones}
          onClose={() => setShowSuggestedMilestones(false)}
          suggestedMilestones={suggestedMilestones}
          onApply={(selectedMilestones) => {
            setFormData((prev) => ({
              ...prev,
              milestones: [...prev.milestones, ...selectedMilestones],
            }));
          }}
        />

        {/* Overwrite Dialog */}
        <AlertDialog
          open={showOverwriteDialog}
          onOpenChange={setShowOverwriteDialog}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Overwrite existing content?</AlertDialogTitle>
              <AlertDialogDescription>
                This will replace your existing{" "}
                {pendingGenerationType === "description"
                  ? "project description"
                  : "value statement"}
                . Are you sure you want to continue?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setPendingGenerationType(null)}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (pendingGenerationType) {
                    generateContent(pendingGenerationType);
                    setPendingGenerationType(null);
                  }
                }}
              >
                Continue
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Gantt Chart Dialog */}
        <GanttChartDialog
          open={showGanttChart}
          onOpenChange={setShowGanttChart}
          milestones={formData.milestones}
          projectTitle={formData.title}
        />

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
                  setShowUnsavedChangesDialog(false);
                  if (pendingNavigationAction) {
                    pendingNavigationAction();
                  }
                }}
              >
                Leave Without Saving
              </AlertDialogAction>
              <Button
                onClick={() => {
                  handleSubmit(
                    new Event("submit") as unknown as React.FormEvent,
                  );
                  setShowUnsavedChangesDialog(false);
                  if (pendingNavigationAction) {
                    pendingNavigationAction();
                  }
                }}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                Save and Leave
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </form>
    </TooltipProvider>
  );
};

export default ProjectForm;
