import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useToast, toastStyles } from "@/components/ui/use-toast";
import { aiService } from "@/lib/services/aiService";
import { projectService } from "@/lib/services/project";
import { ensureConsiderationsAreStrings } from "./FormUtils";
import {
  detectNewlyCompletedItems,
  detectUncompletedItems,
  generateAccomplishmentDescription,
  normalizeAccomplishments,
  type AccomplishmentItem,
  type CompletedItem,
} from "@/lib/services/accomplishmentAutoService";

const defaultFormData = {
  projectId: "",
  title: "",
  description: "",
  valueStatement: "",
  projectAnalysis: "",
  summaryCreatedAt: null,
  summaryIsStale: false,
  isAnalysisExpanded: false,
  status: "draft" as const,
  health_calculation_type: "automatic" as const,
  manual_health_percentage: 0,
  manual_status_color: "green" as "green" | "yellow" | "red",
  // truncateActivities removed - now using localStorage
  budget: {
    total: "",
    actuals: "",
    forecast: "",
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
  onBack?: () => void,
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
      // Ensure summary metadata is included
      summaryCreatedAt: initialData?.summaryCreatedAt || null,
      summaryIsStale: initialData?.summaryIsStale || false,
      // Preserve projectId as-is, don't normalize to empty string
      projectId: initialData?.projectId || "",
    };

    // Normalize considerations to ensure they are always strings
    if (Array.isArray(mergedData.considerations)) {
      mergedData.considerations = ensureConsiderationsAreStrings(
        mergedData.considerations,
      );
    } else {
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
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Auto-copy accomplishments state
  const [showAutoCopyDialog, setShowAutoCopyDialog] = useState(false);
  const [pendingCompletedItems, setPendingCompletedItems] = useState<CompletedItem[]>([]);
  // Flag to trigger a save after accomplishments have been added via auto-copy
  const [autoCopySaveNeeded, setAutoCopySaveNeeded] = useState(false);
  // Flag to trigger a save after accomplishments have been auto-removed (un-completion)
  const [autoRemoveSaveNeeded, setAutoRemoveSaveNeeded] = useState(false);
  // Track the "last saved" milestones to detect deliberate changes to 100%
  const lastSavedMilestonesRef = useRef<any[]>(initialData?.milestones || []);

  // Project completion prompt state
  const [showProjectCompleteDialog, setShowProjectCompleteDialog] = useState(false);
  // Flag to trigger save after user responds to the project complete dialog
  const [projectCompleteSaveNeeded, setProjectCompleteSaveNeeded] = useState(false);

  const [pendingGenerationType, setPendingGenerationType] = useState<
    "description" | "value" | null
  >(null);
  const [isGeneratingAnalysis, setIsGeneratingAnalysis] = useState(false);
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [isGeneratingValue, setIsGeneratingValue] = useState(false);
  const [isGeneratingMilestones, setIsGeneratingMilestones] = useState(false);
  const [isAnalysisExpanded, setIsAnalysisExpanded] = useState(false);

  const [isAnalysisLoading, setIsAnalysisLoading] = useState(false);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);

  const navigate = useNavigate();
  const { toast } = useToast();

  // Track changes by comparing current form data with initial data
  useEffect(() => {
    if (!initialData) return;

    // Deep comparison function for nested objects
    const isEqual = (obj1: any, obj2: any, path: string = ""): boolean => {
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

      // Define auto-calculated fields once at the top
      const autoCalculatedFields = [
        "start_date",
        "end_date",
        "total_days",
        "working_days",
        "total_days_remaining",
        "working_days_remaining",
        "calculated_start_date",
        "calculated_end_date",
        "computed_status_color",
        "summaryCreatedAt",
        "summaryIsStale",
        "projectAnalysis",
        "isAnalysisExpanded",
        "datesOverridden"
      ];

      if (keys1.length !== keys2.length) {
        const missingInObj2 = keys1.filter(k => !keys2.includes(k));
        const missingInObj1 = keys2.filter(k => !keys1.includes(k));
        // If the only missing keys are auto-calculated fields, ignore the mismatch
        const nonAutoCalculatedMissing = missingInObj2.filter(
          key => !autoCalculatedFields.includes(key)
        );
        
        if (nonAutoCalculatedMissing.length === 0) {
          // All missing keys are auto-calculated, so we can continue comparison
          // by only comparing keys that exist in both objects
          const commonKeys = keys1.filter(k => keys2.includes(k));
          for (const key of commonKeys) {
            const currentPath = path ? `${path}.${key}` : key;
            
            if (autoCalculatedFields.includes(key)) {
              continue;
            }

            // Special handling for projectId field to normalize null/undefined/empty string
            if (key === "projectId") {
              const val1 = obj1[key] || "";
              const val2 = obj2[key] || "";
              if (val1 !== val2) {
                return false;
              }
              continue;
            }

            // Handle arrays specially
            if (Array.isArray(obj1[key]) && Array.isArray(obj2[key])) {
              if (obj1[key].length !== obj2[key].length) {
                return false;
              }

              // For simple arrays of primitives
              if (typeof obj1[key][0] !== "object") {
                const mismatch = !obj1[key].every(
                  (item: any, index: number) => item === obj2[key][index]
                );
                if (mismatch) {
                  return false;
                }
              } else {
                // For arrays of objects, we need to compare each object
                for (let i = 0; i < obj1[key].length; i++) {
                  if (!isEqual(obj1[key][i], obj2[key][i], `${currentPath}[${i}]`)) {
                    return false;
                  }
                }
              }
            } else if (typeof obj1[key] === "object" && obj1[key] !== null) {
              if (!isEqual(obj1[key], obj2[key], currentPath)) return false;
            } else if (obj1[key] !== obj2[key]) {
              return false;
            }
          }
          return true; // If we get here, only auto-calculated fields differ
        }
        
        return false;
      }

      for (const key of keys1) {
        if (!keys2.includes(key)) return false;

        const currentPath = path ? `${path}.${key}` : key;

        if (autoCalculatedFields.includes(key)) {
          continue;
        }

        // Special handling for projectId field to normalize null/undefined/empty string
        if (key === "projectId") {
          const val1 = obj1[key] || "";
          const val2 = obj2[key] || "";
          if (val1 !== val2) {
            return false;
          }
          continue;
        }

        // Handle arrays specially
        if (Array.isArray(obj1[key]) && Array.isArray(obj2[key])) {
          if (obj1[key].length !== obj2[key].length) {
            return false;
          }

          // For simple arrays of primitives
          if (typeof obj1[key][0] !== "object") {
            const mismatch = !obj1[key].every(
              (item: any, index: number) => item === obj2[key][index]
            );
            if (mismatch) {
              return false;
            }
          } else {
            // For arrays of objects, we need to compare each object
            for (let i = 0; i < obj1[key].length; i++) {
              if (!isEqual(obj1[key][i], obj2[key][i], `${currentPath}[${i}]`)) {
                return false;
              }
            }
          }
        } else if (typeof obj1[key] === "object" && obj1[key] !== null) {
          if (!isEqual(obj1[key], obj2[key], currentPath)) return false;
        } else if (obj1[key] !== obj2[key]) {
          return false;
        }
      }

      return true;
    };

    // Compare current form data with initial data
    const formHasChanges = !isEqual(formData, initialData);

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
  }, [formData, initialData, hasUserInteracted]);

  // Reset hasChanges and hasUserInteracted when initialData changes (after a successful save)
  useEffect(() => {
    // Only reset form data if we're not in the middle of adding milestones or auto-saving
    // This prevents the form from resetting while we're trying to add AI-generated milestones
    if (initialData && !isAddingMilestones && !isAutoSaving) {
      setHasChanges(false);
      setHasUserInteracted(false);

      // Also reset the form data to match initialData
      const updatedFormData = {
        ...defaultFormData,
        ...initialData,
        manual_status_color: initialData?.manual_status_color || "green",
        // Ensure summary metadata is included
        summaryCreatedAt: initialData?.summaryCreatedAt || null,
        summaryIsStale: initialData?.summaryIsStale || false,
        projectAnalysis: initialData?.projectAnalysis || "",
        // Preserve projectId as-is, don't normalize to empty string
        projectId: initialData?.projectId || "",
      };

      // Normalize considerations to ensure they are always strings
      if (Array.isArray(updatedFormData.considerations)) {
        updatedFormData.considerations = ensureConsiderationsAreStrings(
          updatedFormData.considerations,
        );
      } else {
        updatedFormData.considerations = [];
      }

      setFormData(updatedFormData);

      // Update the last saved milestones ref to the persisted database state.
      // This is critical: it ensures we only detect transitions TO 100% relative
      // to what was actually saved, not intermediate in-memory edits.
      // Items that are already at 100% in the DB will NOT trigger the auto-copy dialog.
      lastSavedMilestonesRef.current = JSON.parse(
        JSON.stringify(initialData?.milestones || []),
      );

      // Reset form attributes
      const formElement = document.querySelector("form");
      if (formElement) {
        formElement.setAttribute("data-has-changes", "false");
        formElement.setAttribute("data-user-interaction", "false");
        formElement.setAttribute("data-just-saved", "false");
      }
    }
  }, [initialData, isAddingMilestones, isAutoSaving]);

  // Effect to trigger save after auto-copy accomplishments have been added to formData.
  // This avoids the stale closure issue: we set autoCopySaveNeeded=true after setFormData,
  // and this effect runs after the re-render with the updated formData.
  useEffect(() => {
    if (autoCopySaveNeeded) {
      setAutoCopySaveNeeded(false);
      checkAndPromptProjectComplete();
    }
  }, [autoCopySaveNeeded]);

  // Effect to trigger save after auto-removal of accomplishments for un-completed items.
  // Same deferred save pattern: setFormData marks items as deleted, then this effect
  // fires after re-render with the updated formData.
  useEffect(() => {
    if (autoRemoveSaveNeeded) {
      setAutoRemoveSaveNeeded(false);
      checkAndPromptProjectComplete();
    }
  }, [autoRemoveSaveNeeded]);

  // Effect to trigger save after user responds to the project complete dialog.
  // If user confirmed, the status was already set to "completed" in formData.
  useEffect(() => {
    if (projectCompleteSaveNeeded) {
      setProjectCompleteSaveNeeded(false);
      handleSubmitInternal(null);
    }
  }, [projectCompleteSaveNeeded]);

  const handleSubmitInternal = async (e: React.FormEvent | null) => {
    // If the form is being submitted manually (not automatically), prevent the default behavior
    // to avoid page refresh, but still process the submission
    if (e) {
      e.preventDefault();
      if (e.stopPropagation) {
        e.stopPropagation();
      }
      if (window.event) {
        window.event.returnValue = false;
      }
    }

    // Ensure the form has the data-adding-milestones attribute set if we're adding milestones
    const formElement = document.querySelector("form");
    if (formElement && isAddingMilestones) {
      formElement.setAttribute("data-adding-milestones", "true");
    }

    // Ensure considerations are simple strings before submitting
    // Also ensure milestones have all required fields
    const submissionData = {
      ...formData,
      // Explicitly convert all considerations to simple strings
      considerations: ensureConsiderationsAreStrings(formData.considerations),
      // Ensure milestones are properly formatted and ALL milestones are included
      // This is critical - we need to preserve all milestones including newly added ones
      milestones: formData.milestones.map((milestone) => {
        const formattedMilestone = {
          // Preserve the ID if it exists (for existing milestones)
          id: milestone.id,
          project_id: milestone.project_id,
          date: milestone.date || new Date().toISOString().split("T")[0],
          end_date: milestone.end_date, // Include end date
          milestone: milestone.milestone || "",
          owner: milestone.owner || "",
          completion: milestone.completion || 0,
          status: milestone.status || "green",
          weight: milestone.weight || 3, // Ensure weight is included
          tasks: milestone.tasks || [],
          // Preserve other fields that might be present
          created_at: milestone.created_at,
          updated_at: milestone.updated_at,
        };
        
        return formattedMilestone;
      }),
    };
    // Set the form as just saved before submitting to prevent navigation warnings
    if (formElement) {
      formElement.setAttribute("data-just-saved", "true");
    }

    try {
      // Set data-auto-saving attribute to prevent data reloading during save
      if (formElement) {
        formElement.setAttribute("data-auto-saving", "true");
      }

      const success = await onSubmit(submissionData);

      if (success) {
        // Update the form element attributes to reflect saved state
        const formEl = document.querySelector("form");
        if (formEl) {
          formEl.setAttribute("data-has-changes", "false");
          formEl.setAttribute("data-user-interaction", "false");
          formEl.setAttribute("data-just-saved", "true");
        }

        // Show success toast only for manual saves (not for automatic milestone saves)
        if (e) {
          toast({
            title: "Project Saved",
            description: "Your project has been saved successfully.",
            className: toastStyles.success,
          });
        }

        // Update last saved milestones ref to current milestones after successful save.
        // This ensures subsequent saves only detect NEW transitions to 100%.
        lastSavedMilestonesRef.current = JSON.parse(
          JSON.stringify(formData.milestones || []),
        );

        // Reset state flags AFTER everything else is done
        setHasChanges(false);
        setHasUserInteracted(false);
        setIsAddingMilestones(false);
        setIsAutoSaving(false);

        // Reset all form attributes
        const formElement2 = document.querySelector("form");
        if (formElement2) {
          formElement2.setAttribute("data-auto-saving", "false");
          formElement2.setAttribute("data-adding-milestones", "false");
          formElement2.removeAttribute("data-milestones-added-at");
        }
      } else {
        console.error("[PROJECT_ID] Form save returned false - save failure");
        const formEl = document.querySelector("form");
        if (formEl) {
          formEl.setAttribute("data-auto-saving", "false");
        }
        setIsAutoSaving(false);
        toast({
          title: "Save Failed",
          description:
            "The project could not be saved. Please check the console for details and try again.",
          variant: "destructive",
          duration: 10000,
        });
      }
    } catch (error) {
      console.error("[PROJECT_ID] Exception during form save:", error);

      // Reset auto-saving attribute in case of error
      const formEl = document.querySelector("form");
      if (formEl) {
        formEl.setAttribute("data-auto-saving", "false");
      }

      toast({
        title: "Save Error",
        description: `Failed to save project: ${error.message || "Unknown error"}`,
        variant: "destructive",
        duration: 15000,
      });

      setIsAutoSaving(false);
      if (!isAddingMilestones) {
        setIsAddingMilestones(false);
      }
    }

    // Return false to ensure the form doesn't submit normally
    return false;
  };

  /**
   * Wrapper around handleSubmit that checks for newly completed milestones/tasks.
   * 
   * KEY DESIGN: We compare current milestones against lastSavedMilestonesRef
   * (the persisted database state), NOT against transient in-memory state.
   * This means:
   * - If a milestone was already 100% in the DB → it will NOT trigger the dialog
   * - Only milestones that transition from <100% (in DB) to 100% (in form) trigger it
   * - This prevents false positives when editing existing projects
   */
  const handleSubmitWithAutoCopy = async (e: React.FormEvent | null) => {
    // Prevent default early so we don't lose the event
    if (e) {
      e.preventDefault();
      if (e.stopPropagation) {
        e.stopPropagation();
      }
    }

    const currentMilestones = formData.milestones || [];
    const previousMilestones = lastSavedMilestonesRef.current || [];
    const currentAccomplishments = normalizeAccomplishments(formData.accomplishments || []);

    // 1. Detect items that newly reached 100% (relative to last saved DB state)
    const newlyCompleted = detectNewlyCompletedItems(
      previousMilestones,
      currentMilestones,
      currentAccomplishments,
    );

    // 2. Detect items that went from 100% back to <100% (un-completions)
    const uncompletedItems = detectUncompletedItems(
      previousMilestones,
      currentMilestones,
    );

    // 3. Auto-remove accomplishments for un-completed items (silent, no dialog)
    // We use multiple matching strategies because task/milestone IDs can change
    // across saves (delete + re-insert pattern), so source_id alone may not match.
    let hasAutoRemovals = false;
    if (uncompletedItems.length > 0) {
      // Build sets for fast lookup across multiple matching strategies
      const sourceIdSet = new Set(uncompletedItems.map(u => u.sourceId));
      const compositeKeySet = new Set(uncompletedItems.map(u => u.compositeKey));
      // Build description-based matchers for fallback matching
      const descriptionMatchers = uncompletedItems.map(u => ({
        description: u.description,
        parentMilestoneName: u.parentMilestoneName,
        type: u.type,
      }));

      const updatedAccomplishments = currentAccomplishments.map((a) => {
        if (!a.auto_generated || a.is_deleted) return a;

        let matched = false;
        let matchReason = "";

        // Strategy 1: Match by source_id (direct ID match)
        if (a.source_id && sourceIdSet.has(a.source_id)) {
          matched = true;
          matchReason = "source_id match";
        }

        // Strategy 2: Match by source_id against composite keys
        // (handles case where accomplishment was created with a composite key as source_id)
        if (!matched && a.source_id && compositeKeySet.has(a.source_id)) {
          matched = true;
          matchReason = "composite key match";
        }

        // Strategy 3: Match by description content
        // (handles case where IDs changed due to delete+re-insert during save)
        if (!matched) {
          for (const dm of descriptionMatchers) {
            if (dm.type === "task" && a.source_type === "task") {
              // For tasks, check if the accomplishment description contains the task description
              if (a.description === dm.description ||
                  (dm.parentMilestoneName && a.description === `${dm.description} (${dm.parentMilestoneName})`) ||
                  a.description.startsWith(dm.description)) {
                matched = true;
                matchReason = "description match (task)";
                break;
              }
            } else if (dm.type === "milestone" && a.source_type === "milestone") {
              if (a.description === dm.description) {
                matched = true;
                matchReason = "description match (milestone)";
                break;
              }
            }
          }
        }

        if (matched) {
          hasAutoRemovals = true;
          return { ...a, is_deleted: true };
        }
        return a;
      });
      
      if (hasAutoRemovals) {
        setFormData((prev: any) => ({
          ...prev,
          accomplishments: updatedAccomplishments,
        }));
      }
    }

    // 4. If there are newly completed items, show the confirmation dialog
    if (newlyCompleted.length > 0) {
      setPendingCompletedItems(newlyCompleted);
      setShowAutoCopyDialog(true);
      return false;
    }

    // 5. If we had auto-removals but no newly completed items, use deferred save
    // to ensure the formData state update (marking items as deleted) is applied
    // before the save runs. This avoids the stale closure issue.
    if (hasAutoRemovals) {
      setAutoRemoveSaveNeeded(true);
      return false;
    }

    // 6. No changes needed - check if all milestones are complete before saving
    return checkAndPromptProjectComplete();
  };

  /**
   * Check if all milestones are at 100% and the project status is not already "completed".
   * Only prompts when milestones transition to all-100% during this editing session
   * (i.e., they weren't all at 100% in the last saved state).
   */
  const checkAndPromptProjectComplete = () => {
    const milestones = formData.milestones || [];
    const currentStatus = formData.status;
    const previousMilestones = lastSavedMilestonesRef.current || [];

    // Check if all current milestones are at 100%
    const allCurrentAt100 = milestones.length > 0 &&
      milestones.every((m: any) => (m.completion || 0) === 100);

    // Check if all previous (saved) milestones were already at 100%
    const allPreviousAt100 = previousMilestones.length > 0 &&
      previousMilestones.length === milestones.length &&
      previousMilestones.every((m: any) => (m.completion || 0) === 100);

    // Only prompt if:
    // 1. ALL milestones are now at 100%
    // 2. They weren't ALL at 100% before (i.e., something changed)
    // 3. The project status is NOT already "completed"
    if (
      allCurrentAt100 &&
      !allPreviousAt100 &&
      currentStatus !== "completed"
    ) {
      setShowProjectCompleteDialog(true);
      return false;
    }

    // Otherwise, proceed with normal save
    return handleSubmitInternal(null);
  };

  /**
   * Called when the user confirms the auto-copy dialog selection.
   * Adds selected items as accomplishments, then proceeds with the save.
   */
  const handleAutoCopyConfirm = async (selectedItems: CompletedItem[]) => {
    setShowAutoCopyDialog(false);

    if (selectedItems.length > 0) {
      const currentAccomplishments = normalizeAccomplishments(formData.accomplishments || []);

      // Create new accomplishment entries for selected items
      const newAccomplishments: AccomplishmentItem[] = selectedItems.map((item) => ({
        description: generateAccomplishmentDescription(item),
        source_type: item.type,
        source_id: item.id,
        is_hidden: false,
        is_deleted: false,
        auto_generated: true,
      }));

      const updatedAccomplishments = [...currentAccomplishments, ...newAccomplishments];

      // Update formData with new accomplishments
      setFormData((prev: any) => ({
        ...prev,
        accomplishments: updatedAccomplishments,
      }));

      toast({
        title: "Accomplishments Added",
        description: `${selectedItems.length} item${selectedItems.length > 1 ? "s" : ""} added to accomplishments.`,
        className: toastStyles.success,
      });

      // Use the deferred save flag — the useEffect will trigger handleSubmitInternal
      // after the next render when formData includes the new accomplishments.
      setAutoCopySaveNeeded(true);
    } else {
      // No items selected, just proceed with save (check for project completion first)
      checkAndPromptProjectComplete();
    }
  };

  /**
   * Called when the user cancels the auto-copy dialog.
   * Proceeds with save without adding accomplishments.
   */
  const handleAutoCopyCancel = () => {
    setShowAutoCopyDialog(false);
    setPendingCompletedItems([]);
    // Still proceed with save (check for project completion first)
    checkAndPromptProjectComplete();
  };

  /**
   * Called when the user confirms they want to mark the project as completed.
   * Updates the status to "completed" and triggers a deferred save.
   */
  const handleProjectCompleteConfirm = () => {
    setShowProjectCompleteDialog(false);
    setFormData((prev: any) => ({
      ...prev,
      status: "completed",
    }));
    // Use deferred save to ensure formData state update is applied before saving
    setProjectCompleteSaveNeeded(true);
  };

  /**
   * Called when the user declines to mark the project as completed.
   * Proceeds with save using the current status.
   */
  const handleProjectCompleteCancel = () => {
    setShowProjectCompleteDialog(false);
    handleSubmitInternal(null);
  };

  const handleGenerateContent = async (
    type: "description" | "value" | "milestones" | "analysis",
    additionalContext?: string,
  ) => {
    // If generating milestones, set the flag to prevent initialData from resetting the form
    if (type === "milestones") {
      setIsAddingMilestones(true);
      const formElement = document.querySelector("form");
      if (formElement) {
        formElement.setAttribute("data-adding-milestones", "true");
      }
    }

    // Check if we need to show the overwrite dialog
    // REMOVED: We now check after generation
    /*
    if (type === "description" && formData.description?.trim() && !additionalContext) {
      setPendingGenerationType("description");
      setShowOverwriteDialog(true);
      return;
    }
    if (type === "value" && formData.valueStatement?.trim() && !additionalContext) {
      setPendingGenerationType("value");
      setShowOverwriteDialog(true);
      return;
    }
    */

    // For analysis, set loading state immediately
    if (type === "analysis") {
      setIsAnalysisLoading(true);
      setIsAnalysisExpanded(true);
      setIsAddingMilestones(true); // Reuse this flag to prevent data reset
      const formElement = document.querySelector("form");
      if (formElement) {
        formElement.setAttribute("data-adding-milestones", "true");
      }
      setFormData((prev) => ({
        ...prev,
        projectAnalysis: "",
      }));
    }

    // If no existing content or it's milestones or analysis, proceed with generation
    await generateContent(type, additionalContext);
  };

  const generateContent = async (
    type: "description" | "value" | "milestones" | "analysis",
    additionalContext?: string,
  ) => {
    // Set loading states
    if (type === "description") setIsGeneratingDescription(true);
    if (type === "value") setIsGeneratingValue(true);
    if (type === "milestones") setIsGeneratingMilestones(true);

    try {
      if (!formData.title) {
        // Clear loading states if returning early
        if (type === "description") setIsGeneratingDescription(false);
        if (type === "value") setIsGeneratingValue(false);
        if (type === "milestones") setIsGeneratingMilestones(false);

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
          duration: 30000, // 30 seconds or until dismissed - increased from 10s
        });
      } else if (type === "milestones") {
        toast({
          title: "Generating Milestones",
          description:
            "Creating milestone suggestions based on your project...",
          duration: 15000, // Increased from 5s to 15s
        });
      }

      // Add retry logic for content generation
      let retryCount = 0;
      const maxRetries = 2;
      let content = null;
      let lastError = null;

      while (retryCount <= maxRetries && !content) {
        try {
          if (retryCount > 0) {
            toast({
              title: "Retrying",
              description: `Retrying ${type} generation (attempt ${retryCount} of ${maxRetries})`,
              duration: 3000,
            });
          }

          // For analysis, we need to pass the entire form data to get a comprehensive analysis
          content = await aiService.generateContent(
            type,
            formData.title,
            formData.description,
            type === "analysis" ? formData : undefined,
            additionalContext,
          );

          // If we got here, we have content
          break;
        } catch (error) {
          lastError = error;
          retryCount++;
          if (retryCount > maxRetries) {
            throw error; // Re-throw if we've exhausted retries
          }
          // Wait before retrying (exponential backoff)
          await new Promise((resolve) =>
            setTimeout(resolve, 1000 * retryCount),
          );
        }
      }

      if (type === "milestones") {
        try {
          // The content should already be a JSON string from aiService.processMilestones
          const parsedMilestones = JSON.parse(content);
          if (Array.isArray(parsedMilestones) && parsedMilestones.length > 0) {
            // Validate that mandatory milestones are present
            const hasKickoff = parsedMilestones.some(
              (m) =>
                m.milestone && m.milestone.toLowerCase().includes("kickoff"),
            );
            const hasCloseout = parsedMilestones.some(
              (m) =>
                m.milestone &&
                (m.milestone.toLowerCase().includes("closeout") ||
                  m.milestone.toLowerCase().includes("closure")),
            );

            setSuggestedMilestones(parsedMilestones);
            setTimeout(() => {
              setShowSuggestedMilestones(true);
            }, 100);

            // Show enhanced success message
            toast({
              title: "Milestones Generated Successfully",
              description: `Generated ${parsedMilestones.length} milestones including Project Kickoff and Closeout. Review and select the ones you want to add.`,
              className: toastStyles.success,
              duration: 5000,
            });
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
        } finally {
          setIsGeneratingMilestones(false);
        }
      } else if (type === "analysis") {
        const analysisContent = content;

        try {
          // Save the analysis to the database immediately
          if (safeProjectId) {
            await projectService.updateProjectAnalysis(
              safeProjectId,
              analysisContent,
            );
          }

          const currentTimestamp = new Date().toISOString();
          setFormData((prev) => ({
            ...prev,
            projectAnalysis: analysisContent,
            summaryCreatedAt: currentTimestamp,
            summaryIsStale: false,
          }));

          setTimeout(() => {
            setIsGeneratingAnalysis(false);
            setIsAnalysisLoading(false);
            setIsAddingMilestones(false);
            const formElement = document.querySelector("form");
            if (formElement) {
              formElement.setAttribute("data-adding-milestones", "false");
            }

            toast({
              title: "Analysis Complete",
              description: "Executive summary has been generated and saved",
              className: toastStyles.success,
            });
          }, 100);
        } catch (error) {
          console.error("Error saving analysis to database:", error);
          setFormData((prev) => ({
            ...prev,
            projectAnalysis: analysisContent,
          }));

          setIsGeneratingAnalysis(false);
          setIsAnalysisLoading(false);
          setIsAddingMilestones(false);
          const formElement = document.querySelector("form");
          if (formElement) {
            formElement.setAttribute("data-adding-milestones", "false");
          }

          toast({
            title: "Analysis Generated",
            description:
              "Executive summary has been generated but could not be saved to the database",
            variant: "default",
          });
        }
      } else {
        const targetField = type === "value" ? "valueStatement" : "description";
        const hasExistingContent = formData[targetField]?.trim().length > 0;

        if (hasExistingContent) {
          setGeneratedContent(content);
          setPendingGenerationType(type as "description" | "value");
          setShowPreviewDialog(true);
        } else {
          setFormData((prev) => ({
            ...prev,
            [targetField]: content,
          }));
        }
        
        if (type === "description") setIsGeneratingDescription(false);
        if (type === "value") setIsGeneratingValue(false);
      }
    } catch (error) {
      console.error(`Error generating ${type}:`, error);
      
      // Clear loading states
      if (type === "description") setIsGeneratingDescription(false);
      if (type === "value") setIsGeneratingValue(false);
      if (type === "milestones") setIsGeneratingMilestones(false);

      if (type === "analysis") {
        setIsGeneratingAnalysis(false);
        setIsAnalysisLoading(false);
        // Reset the flag that prevents form data reset
        setIsAddingMilestones(false);
        const formElement = document.querySelector("form");
        if (formElement) {
          formElement.setAttribute("data-adding-milestones", "false");
        }
      }
      toast({
        title: "Error",
        description: `Failed to generate ${type}: ${error.message || "Unknown error"}`,
        variant: "destructive",
        duration: 5000, // Show error for longer
      });

      // For analysis, provide a fallback message in the analysis section
      if (type === "analysis") {
        setFormData((prev) => ({
          ...prev,
          projectAnalysis: `<p>Unable to generate analysis at this time. Please try again later.</p><p>Error: ${error.message || "Unknown error"}</p>`,
          summaryCreatedAt: new Date().toISOString(),
          summaryIsStale: false,
        }));
      }
    }
  };

  const handleShowDeleteDialog = () => {
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    try {
      if (!safeProjectId || safeProjectId.trim() === "") {
        toast({
          title: "Error",
          description: "No project ID found. Cannot delete project.",
          variant: "destructive",
        });
        setShowDeleteDialog(false);
        return;
      }

      // Clear all state flags that might prevent navigation
      setHasChanges(false);
      setHasUserInteracted(false);
      setIsAddingMilestones(false);
      setIsAutoSaving(false);

      // Clear form attributes that might block navigation
      const formElement = document.querySelector("form");
      if (formElement) {
        formElement.setAttribute("data-has-changes", "false");
        formElement.setAttribute("data-user-interaction", "false");
        formElement.setAttribute("data-just-saved", "true");
        formElement.setAttribute("data-auto-saving", "false");
        formElement.setAttribute("data-adding-milestones", "false");
        formElement.removeAttribute("data-milestones-added-at");
      }

      const success = await projectService.deleteProject(safeProjectId);

      if (success) {
        // Close the dialog immediately
        setShowDeleteDialog(false);

        // Clear any pending navigation actions
        setPendingNavigationAction(null);
        setShowUnsavedChangesDialog(false);

        // Show success toast
        toast({
          title: "Project Deleted",
          description: "The project has been successfully deleted.",
          className: toastStyles.success,
          duration: 3000,
        });

        // CRITICAL FIX: Use the onBack callback to properly navigate back to the list
        // This will reset the mode state in the parent component (home.tsx)
        if (onBack) {
          // Small delay to ensure the toast is shown and dialog is closed
          setTimeout(() => {
            onBack();
          }, 100);
        } else {
          // Fallback to React Router navigation if onBack is not available
          setTimeout(() => {
            navigate("/", { replace: true });
          }, 100);
        }
      } else {
        console.error("[DELETE_PROJECT] Delete operation returned false");
        toast({
          title: "Error",
          description: "Failed to delete the project.",
          variant: "destructive",
        });
        setShowDeleteDialog(false);
      }
    } catch (error) {
      console.error("[DELETE_PROJECT] Error deleting project:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while deleting the project.",
        variant: "destructive",
      });
      setShowDeleteDialog(false);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteDialog(false);
  };

  const handleApplyMilestones = async (selectedMilestones: any[]) => {
    // Set flags BEFORE modifying form data to prevent premature resets
    setIsAddingMilestones(true);

    // Also update the form attribute to prevent data reloading
    const formElement = document.querySelector("form");
    if (formElement) {
      formElement.setAttribute("data-adding-milestones", "true");
      formElement.setAttribute("data-has-changes", "true");
      formElement.setAttribute("data-user-interaction", "true");
      formElement.setAttribute(
        "data-milestones-added-at",
        Date.now().toString(),
      );
    }

    // Format the milestones properly to ensure they have all required fields
    // and space them one week apart starting from one week from today
    const today = new Date();
    const oneWeekFromToday = new Date(today);
    oneWeekFromToday.setDate(today.getDate() + 7); // Start first milestone one week from today

    const formattedMilestones = selectedMilestones.map((milestone, index) => {
      // Create a new date for each milestone, starting with one week from today
      // and adding 7 days for each subsequent milestone
      const milestoneDate = new Date(oneWeekFromToday);
      milestoneDate.setDate(oneWeekFromToday.getDate() + index * 7); // Add 0, 7, 14, 21, etc. days from one week from today

      return {
        date: milestoneDate.toISOString().split("T")[0], // Format as YYYY-MM-DD
        milestone: milestone.milestone || "",
        owner: milestone.owner || "",
        completion: milestone.completion || 0,
        status: "green", // ALWAYS set status to "green" (On Track) for all applied milestones
        tasks: milestone.tasks || [],
      };
    });

    // Add the selected milestones to the form data
    setFormData((prev) => ({
      ...prev,
      milestones: [...prev.milestones, ...formattedMilestones],
    }));

    // Set hasChanges and hasUserInteracted to true to indicate unsaved changes
    setHasChanges(true);
    setHasUserInteracted(true);

    // Show success toast to inform the user that milestones were added (but not saved)
    toast({
      title: "Milestones Added",
      description: `${formattedMilestones.length} milestones have been added to your project. Don't forget to save your changes!`,
      className: toastStyles.info,
      duration: 5000,
    });

    // IMPORTANT: Don't reset the isAddingMilestones flag automatically
    // It will be reset when the user explicitly saves the project
    // This prevents any data reloading until the user saves

    // Close the suggested milestones dialog
    setShowSuggestedMilestones(false);
  };

  const handleCancelMilestones = () => {
    // Reset flags and close dialog
    setIsAddingMilestones(false);
    setShowSuggestedMilestones(false);
  };

  const handleConfirmOverwrite = async () => {
    setShowOverwriteDialog(false);
    if (pendingGenerationType) {
      await generateContent(pendingGenerationType);
      setPendingGenerationType(null);
    }
  };

  const handleCancelOverwrite = () => {
    setShowOverwriteDialog(false);
    setPendingGenerationType(null);
  };

  const handleConfirmPreview = () => {
    if (generatedContent && pendingGenerationType) {
      setFormData((prev) => ({
        ...prev,
        [pendingGenerationType === "value" ? "valueStatement" : "description"]: generatedContent,
      }));
      setShowPreviewDialog(false);
      setGeneratedContent(null);
      setPendingGenerationType(null);
    }
  };

  const handleCancelPreview = () => {
    setShowPreviewDialog(false);
    setGeneratedContent(null);
    setPendingGenerationType(null);
  };

  const handleToggleAnalysis = () => {
    setIsAnalysisExpanded(!isAnalysisExpanded);
  };

  const handleUserInteraction = useCallback(() => {
    if (!hasUserInteracted) {
      setHasUserInteracted(true);
      const formElement = document.querySelector("form");
      if (formElement) {
        formElement.setAttribute("data-user-interaction", "true");
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
    showPreviewDialog,
    setShowPreviewDialog,
    generatedContent,
    showDeleteDialog,
    setShowDeleteDialog,

    pendingGenerationType,
    setPendingGenerationType,
    isGeneratingAnalysis,
    isGeneratingDescription,
    isGeneratingValue,
    isGeneratingMilestones,
    isAnalysisExpanded,
    isAnalysisLoading,
    hasUserInteracted,
    handleSubmit: handleSubmitWithAutoCopy,
    handleGenerateContent,
    handleShowDeleteDialog,
    handleConfirmDelete,
    handleCancelDelete,
    handleApplyMilestones,
    handleCancelMilestones,
    handleConfirmOverwrite,
    handleCancelOverwrite,
    handleConfirmPreview,
    handleCancelPreview,

    // Auto-copy accomplishments
    showAutoCopyDialog,
    setShowAutoCopyDialog,
    pendingCompletedItems,
    handleAutoCopyConfirm,
    handleAutoCopyCancel,

    // Project completion prompt
    showProjectCompleteDialog,
    setShowProjectCompleteDialog,
    handleProjectCompleteConfirm,
    handleProjectCompleteCancel,

    handleToggleAnalysis,
    handleUserInteraction,
    generateContent,
  };
};