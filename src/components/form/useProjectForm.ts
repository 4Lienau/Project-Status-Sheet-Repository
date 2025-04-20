import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { aiService } from "@/lib/services/aiService";
import { projectService } from "@/lib/services/project";
import { ensureConsiderationsAreStrings } from "./FormUtils";

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

export const useProjectForm = (
  initialData: any,
  onSubmit: (data: any) => Promise<boolean>,
  projectId: string,
) => {
  // Track if we're in the middle of adding milestones to prevent initialData from resetting the form
  const [isAddingMilestones, setIsAddingMilestones] = useState(false);
  // Track if we're in the middle of auto-saving after adding milestones
  const [isAutoSaving, setIsAutoSaving] = useState(false);

  const safeProjectId = projectId || "";
  const [formData, setFormData] = useState(() => {
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

    // Normalize considerations to ensure they are always strings
    if (Array.isArray(mergedData.considerations)) {
      mergedData.considerations = ensureConsiderationsAreStrings(
        mergedData.considerations,
      );
      console.log("Normalized considerations:", mergedData.considerations);
    } else {
      console.log("No considerations array found, initializing empty array");
      mergedData.considerations = [];
    }

    return mergedData;
  });

  const [hasChanges, setHasChanges] = useState(false);
  const [showUnsavedChangesDialog, setShowUnsavedChangesDialog] =
    useState(false);
  const [pendingNavigationAction, setPendingNavigationAction] = useState<
    (() => void) | null
  >(null);
  const [showSuggestedMilestones, setShowSuggestedMilestones] = useState(false);
  const [suggestedMilestones, setSuggestedMilestones] = useState<Array<any>>(
    [],
  );
  const [showOverwriteDialog, setShowOverwriteDialog] = useState(false);
  const [showGanttChart, setShowGanttChart] = useState(false);
  const [pendingGenerationType, setPendingGenerationType] = useState<
    "description" | "value" | null
  >(null);
  const [isGeneratingAnalysis, setIsGeneratingAnalysis] = useState(false);
  const [isAnalysisExpanded, setIsAnalysisExpanded] = useState(false);
  const [isAnalysisLoading, setIsAnalysisLoading] = useState(false);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);

  const navigate = useNavigate();
  const { toast } = useToast();

  // Debug log for tracking milestones
  useEffect(() => {
    console.log(
      "Current milestones in formData:",
      formData.milestones.length,
      formData.milestones,
    );
  }, [formData.milestones]);

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
    console.log("Checking if form data should be reset with initialData", {
      hasInitialData: !!initialData,
      isAddingMilestones,
      isAutoSaving,
      initialDataMilestones: initialData?.milestones?.length || 0,
      formDataMilestones: formData.milestones.length,
    });

    // Only reset form data if we're not in the middle of adding milestones or auto-saving
    // This prevents the form from resetting while we're trying to add AI-generated milestones
    if (initialData && !isAddingMilestones && !isAutoSaving) {
      console.log("Resetting form data with new initialData");
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

      // Log considerations before normalization
      console.log(
        "Raw considerations from initialData:",
        initialData.considerations,
      );

      // Normalize considerations to ensure they are always strings
      if (Array.isArray(updatedFormData.considerations)) {
        updatedFormData.considerations = ensureConsiderationsAreStrings(
          updatedFormData.considerations,
        );
        console.log(
          "Normalized considerations after update:",
          updatedFormData.considerations,
        );
      } else {
        console.log(
          "No considerations array found in update, initializing empty array",
        );
        updatedFormData.considerations = [];
      }

      setFormData(updatedFormData);

      // Reset form attributes
      const formElement = document.querySelector("form");
      if (formElement) {
        formElement.setAttribute("data-has-changes", "false");
        formElement.setAttribute("data-user-interaction", "false");
        formElement.setAttribute("data-just-saved", "false");
        console.log("Form attributes reset after initialData change");
      }
    } else {
      console.log("Skipping form data reset due to flags:", {
        isAddingMilestones,
        isAutoSaving,
      });
    }
  }, [initialData, isAddingMilestones, isAutoSaving]);

  const handleSubmit = async (e: React.FormEvent | null) => {
    // If the form is being submitted manually (not automatically), prevent the default behavior
    // to avoid page refresh, but still process the submission
    if (e) {
      e.preventDefault();
      console.log("Default form submission prevented");

      // Extra safety to ensure the event is fully prevented
      if (e.stopPropagation) {
        e.stopPropagation();
      }

      // Additional safety to prevent any form of navigation
      if (window.event) {
        window.event.returnValue = false;
      }
    }

    // Log the current milestone count to help with debugging
    console.log(
      `Current milestone count in form data: ${formData.milestones.length}`,
    );

    console.log("Form submission triggered", e ? "manually" : "automatically");
    console.log("Current state flags:", { isAddingMilestones, isAutoSaving });
    console.log(
      "[DEBUG] Submitting form data with manual_status_color:",
      formData.manual_status_color,
    );
    console.log("Submitting form data:", formData);

    // Log the milestones specifically to debug
    console.log(
      "Milestones being submitted:",
      JSON.stringify(formData.milestones),
    );

    console.log(
      "Raw considerations before normalization:",
      formData.considerations,
    );

    // Ensure considerations are simple strings before submitting
    // Also ensure milestones have all required fields
    const submissionData = {
      ...formData,
      // Explicitly convert all considerations to simple strings
      considerations: ensureConsiderationsAreStrings(formData.considerations),
      // Ensure milestones are properly formatted and ALL milestones are included
      // This is critical - we need to preserve all milestones including newly added ones
      milestones: formData.milestones.map((milestone) => ({
        // Preserve the ID if it exists (for existing milestones)
        id: milestone.id,
        project_id: milestone.project_id,
        date: milestone.date || new Date().toISOString().split("T")[0],
        milestone: milestone.milestone || "",
        owner: milestone.owner || "",
        completion: milestone.completion || 0,
        status: milestone.status || "green",
        weight: milestone.weight || 3, // Ensure weight is included
        tasks: milestone.tasks || [],
        // Preserve other fields that might be present
        created_at: milestone.created_at,
        updated_at: milestone.updated_at,
      })),
    };

    // Log the total number of milestones being submitted
    console.log(
      `Submitting ${submissionData.milestones.length} milestones in total`,
    );

    console.log(
      "Final submission data with formatted milestones:",
      submissionData.milestones,
    );

    console.log(
      "Submitting with normalized considerations:",
      submissionData.considerations,
    );

    // Set the form as just saved before submitting to prevent navigation warnings
    const formElement = document.querySelector("form");
    if (formElement) {
      formElement.setAttribute("data-just-saved", "true");
    }

    try {
      console.log("Calling onSubmit with submission data");
      const success = await onSubmit(submissionData);
      if (success) {
        console.log("Form saved successfully, resetting state flags");
        // Don't try to modify the initialData prop directly as it's read-only
        // Instead, we'll rely on the parent component to pass updated initialData

        // Update the form element attributes to reflect saved state
        if (formElement) {
          formElement.setAttribute("data-has-changes", "false");
          formElement.setAttribute("data-user-interaction", "false");
          formElement.setAttribute("data-just-saved", "true");
        }

        // Show success toast only for automatic saves
        if (!e) {
          toast({
            title: "Milestones Saved",
            description:
              "The selected milestones have been added to your project and saved.",
            className: "bg-green-50 border-green-200",
          });
        }

        // Reset state flags AFTER everything else is done
        setHasChanges(false);
        setHasUserInteracted(false);
        // Reset the isAddingMilestones flag after successful save
        setIsAddingMilestones(false);
        setIsAutoSaving(false);
      } else {
        console.error("Form save returned false");
        setIsAutoSaving(false);
        toast({
          title: "Error Saving",
          description: "Failed to save changes. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error saving form:", error);
      toast({
        title: "Error Saving",
        description:
          "There was a problem saving your changes. Please try again.",
        variant: "destructive",
      });
      setIsAutoSaving(false);
      setIsAddingMilestones(false);
    }

    // Return false to ensure the form doesn't submit normally
    return false;
  };

  const handleGenerateContent = async (
    type: "description" | "value" | "milestones" | "analysis",
  ) => {
    // If generating milestones, set the flag to prevent initialData from resetting the form
    if (type === "milestones") {
      setIsAddingMilestones(true);
      console.log(
        "Setting isAddingMilestones to true for milestone generation",
      );

      // Also update the form attribute
      const formElement = document.querySelector("form");
      if (formElement) {
        formElement.setAttribute("data-adding-milestones", "true");
        console.log("Updated form attribute data-adding-milestones to true");
      }
    }

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

      // Show loading toast for appropriate content types
      if (type === "analysis") {
        setIsGeneratingAnalysis(true);
        setIsAnalysisLoading(true);
        toast({
          title: "Analyzing Project",
          description: "Generating executive summary based on project data...",
          duration: 10000, // 10 seconds or until dismissed
        });
      } else if (type === "milestones") {
        toast({
          title: "Generating Milestones",
          description:
            "Creating milestone suggestions based on your project...",
          duration: 5000,
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
          // The content should already be a JSON string from aiService.processMilestones
          const parsedMilestones = JSON.parse(content);
          if (Array.isArray(parsedMilestones) && parsedMilestones.length > 0) {
            console.log("Setting suggested milestones:", parsedMilestones);
            setSuggestedMilestones(parsedMilestones);
            // Ensure state is updated before showing dialog
            setTimeout(() => {
              setShowSuggestedMilestones(true);
            }, 100);
          } else {
            throw new Error("Invalid milestone data format");
          }
        } catch (error) {
          console.error("Failed to parse milestones:", error, content);
          toast({
            title: "Error",
            description: "Failed to generate milestones. Please try again.",
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
        navigate("/");
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

  const handleApplyMilestones = async (selectedMilestones: any[]) => {
    console.log("Applying selected milestones to project:", selectedMilestones);
    // Set flags BEFORE modifying form data to prevent premature resets
    setIsAddingMilestones(true);
    setIsAutoSaving(true);
    console.log("Setting isAddingMilestones and isAutoSaving to true");

    // Format the milestones properly to ensure they have all required fields
    const formattedMilestones = selectedMilestones.map((milestone) => ({
      date: milestone.date || new Date().toISOString().split("T")[0],
      milestone: milestone.milestone || "",
      owner: milestone.owner || "",
      completion: milestone.completion || 0,
      status: milestone.status || "green",
      tasks: milestone.tasks || [],
    }));

    console.log("Formatted milestones for database:", formattedMilestones);

    // Add the selected milestones to the form data
    setFormData((prev) => ({
      ...prev,
      milestones: [...prev.milestones, ...formattedMilestones],
    }));

    // Auto-save the form with the new milestones
    await handleSubmit(null);

    // Reset flags after saving
    setIsAddingMilestones(false);
    setIsAutoSaving(false);

    // Close the suggested milestones dialog
    setShowSuggestedMilestones(false);
  };

  const handleCancelMilestones = () => {
    // Reset flags and close dialog
    setIsAddingMilestones(false);
    setShowSuggestedMilestones(false);
  };

  const handleConfirmOverwrite = async () => {
    console.log("Confirm overwrite handler called");
    // Close the dialog
    setShowOverwriteDialog(false);
    // Generate the content with the pending type
    if (pendingGenerationType) {
      await generateContent(pendingGenerationType);
      // Reset the pending type
      setPendingGenerationType(null);
    }
  };

  const handleCancelOverwrite = () => {
    console.log("Cancel overwrite handler called");
    // Close the dialog and reset the pending type
    setShowOverwriteDialog(false);
    setPendingGenerationType(null);
  };

  const handleToggleGanttChart = () => {
    setShowGanttChart(!showGanttChart);
  };

  const handleToggleAnalysis = () => {
    setIsAnalysisExpanded(!isAnalysisExpanded);
  };

  const handleUserInteraction = useCallback(() => {
    if (!hasUserInteracted) {
      console.log("User interaction detected, updating state");
      setHasUserInteracted(true);

      // Update the form element attribute
      const formElement = document.querySelector("form");
      if (formElement) {
        formElement.setAttribute("data-user-interaction", "true");
        console.log("Updated form attribute data-user-interaction to true");
      }
    }
  }, [hasUserInteracted]);

  return {
    formData,
    setFormData,
    hasChanges,
    showUnsavedChangesDialog,
    setShowUnsavedChangesDialog,
    pendingNavigationAction,
    setPendingNavigationAction,
    showSuggestedMilestones,
    setShowSuggestedMilestones,
    suggestedMilestones,
    showOverwriteDialog,
    setShowOverwriteDialog,
    showGanttChart,
    setShowGanttChart,
    pendingGenerationType,
    setPendingGenerationType,
    isGeneratingAnalysis,
    isAnalysisExpanded,
    isAnalysisLoading,
    hasUserInteracted,
    handleSubmit,
    handleGenerateContent,
    handleDeleteProject,
    handleApplyMilestones,
    handleCancelMilestones,
    handleConfirmOverwrite,
    handleCancelOverwrite,
    handleToggleGanttChart,
    handleToggleAnalysis,
    handleUserInteraction,
    generateContent,
  };
};
