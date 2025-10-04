/**
 * File: ProjectForm.tsx
 * Purpose: Form component for creating and editing projects
 * Description: This component provides a form interface for creating and editing projects. It uses
 * refactored components from the form directory to render different sections of the form, and the
 * useProjectForm hook for state management. The component handles form submission, validation, and
 * AI-powered content generation.
 */

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import ProjectPilot from "@/components/chat/ProjectPilot";
import { Badge } from "@/components/ui/badge";
import { calculateProjectHealthStatusColor, calculateWeightedCompletion } from "@/lib/services/project";

// Import refactored form components
import ProjectDetailsSection from "@/components/form/ProjectDetailsSection";
import ProjectStatusSection from "@/components/form/ProjectStatusSection";
import ProjectDurationSection from "@/components/form/ProjectDurationSection";
import BudgetLinksSection from "@/components/form/BudgetLinksSection";
import MilestonesSection from "@/components/form/MilestonesSection";
import AccomplishmentsSection from "@/components/form/AccomplishmentsSection";
import NextPeriodActivitiesSection from "@/components/form/NextPeriodActivitiesSection";
import RisksSection from "@/components/form/RisksSection";
import ConsiderationsSection from "@/components/form/ConsiderationsSection";
import ChangesSection from "@/components/form/ChangesSection";
import HealthCalculationSection from "@/components/form/HealthCalculationSection";

// Import dialog components
import {
  UnsavedChangesDialog,
  OverwriteDialog,
  DeleteConfirmationDialog,
} from "@/components/form/DialogComponents";
import { SuggestedMilestones } from "@/components/SuggestedMilestones";

// Import custom hook for form state management
import { useProjectForm } from "@/components/form/useProjectForm";

interface ProjectFormProps {
  initialData: any;
  projectId: string;
  onBack: () => void;
  onSubmit: (data: any) => Promise<boolean>;
  setIsDragging?: (dragging: boolean) => void;
}

const ProjectForm: React.FC<ProjectFormProps> = ({
  initialData,
  projectId,
  onBack,
  onSubmit,
  setIsDragging,
}) => {
  const { toast } = useToast();
  const navigate = useNavigate();

  // Use the custom hook for form state management
  const {
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
    showDeleteDialog,
    setShowDeleteDialog,
    showGanttChart,
    setShowGanttChart,
    pendingGenerationType,
    setPendingGenerationType,
    isGeneratingAnalysis,
    isAnalysisExpanded,
    isAnalysisLoading,
    handleSubmit,
    handleGenerateContent,
    handleShowDeleteDialog,
    handleConfirmDelete,
    handleCancelDelete,
    handleApplyMilestones,
    handleConfirmOverwrite,
    handleCancelOverwrite,
    generateContent,
    handleToggleAnalysis,
  } = useProjectForm(initialData, onSubmit, projectId, onBack);

  // Calculate current health status color
  const healthStatusColor = calculateProjectHealthStatusColor(
    { ...formData, id: projectId },
    formData.milestones || []
  );

  // Calculate weighted completion percentage
  const completionPercentage = calculateWeightedCompletion(formData.milestones || []);

  // Get health status label
  const getHealthStatusLabel = (color: "red" | "yellow" | "green") => {
    switch (color) {
      case "green":
        return "Healthy";
      case "yellow":
        return "At Risk";
      case "red":
        return "Critical";
      default:
        return "Unknown";
    }
  };

  return (
    <TooltipProvider>
      <div className="relative">
        {/* Project Health Badge and Completion Percentage */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-muted-foreground">
              Project Health:
            </span>
            <Badge
              className={`text-sm font-semibold px-3 py-1 ${
                healthStatusColor === "green"
                  ? "bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/50"
                  : healthStatusColor === "yellow"
                  ? "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/50"
                  : "bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/50"
              }`}
            >
              {getHealthStatusLabel(healthStatusColor)}
            </Badge>
            {formData.health_calculation_type === "manual" && (
              <span className="text-xs text-muted-foreground italic">
                (Manual)
              </span>
            )}
          </div>

          {/* Completion Percentage Badge */}
          <div
            className={`w-48 h-48 rounded-lg border-2 flex flex-col items-center justify-center shadow-lg ${ 
              healthStatusColor === "green"
                ? "bg-green-500/10 border-green-500/50"
                : healthStatusColor === "yellow"
                ? "bg-yellow-500/10 border-yellow-500/50"
                : "bg-red-500/10 border-red-500/50"
            }`}
          >
            <div
              className={`text-6xl font-bold leading-none ${
                healthStatusColor === "green"
                  ? "text-green-600 dark:text-green-400"
                  : healthStatusColor === "yellow"
                  ? "text-yellow-600 dark:text-yellow-400"
                  : "text-red-600 dark:text-red-400"
              }`}
            >
              {completionPercentage}%
            </div>
            <div className="text-sm text-muted-foreground mt-2 font-medium">Complete</div>
          </div>
        </div>

        {/* Status Watermark - Show for all project statuses */}
        <div className="relative w-full h-24 mb-4 overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div 
              className={`text-8xl font-bold whitespace-nowrap select-none ${
                formData.status === 'completed' 
                  ? 'text-green-500/20' 
                  : formData.status === 'on_hold' 
                  ? 'text-yellow-500/20' 
                  : formData.status === 'cancelled' 
                  ? 'text-red-500/20' 
                  : formData.status === 'draft' 
                  ? 'text-yellow-500/20'
                  : 'text-blue-500/20'
              }`}
            >
              {formData.status === 'completed' 
                ? 'COMPLETED' 
                : formData.status === 'on_hold' 
                ? 'ON HOLD' 
                : formData.status === 'cancelled' 
                ? 'CANCELLED' 
                : formData.status === 'draft' 
                ? 'DRAFT'
                : 'ACTIVE'}
            </div>
          </div>
        </div>

        <ProjectPilot
          projectId={projectId}
          projectTitle={
            formData.title
              ? formData.title.replace(/<[^>]*>/g, "")
              : "Untitled Project"
          }
        />
        <form
          data-adding-milestones="false"
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit(e);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              // Find the next focusable element
              const focusableElements =
                'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
              const form = e.currentTarget;
              const elements = Array.from(
                form.querySelectorAll(focusableElements),
              );
              const index = elements.findIndex(
                (el) => el === document.activeElement,
              );
              if (index > -1 && index < elements.length - 1) {
                const nextElement = elements[index + 1] as HTMLElement;
                nextElement.focus();
              }
            }
          }}
          className="space-y-4 pb-24"
        >
          {/* Project Details Section */}
          <ProjectDetailsSection
            formData={formData}
            setFormData={setFormData}
            handleGenerateContent={handleGenerateContent}
            isGeneratingAnalysis={isGeneratingAnalysis}
            isAnalysisExpanded={isAnalysisExpanded}
            setIsAnalysisExpanded={handleToggleAnalysis}
            isAnalysisLoading={isAnalysisLoading}
            handleShowDeleteDialog={handleShowDeleteDialog}
          />

          {/* Project Status Section */}
          <ProjectStatusSection formData={formData} setFormData={setFormData} />

          {/* Health Calculation Section (includes Health Status when manual) */}
          <HealthCalculationSection
            formData={formData}
            setFormData={setFormData}
          />

          {/* Project Duration Section */}
          <ProjectDurationSection formData={formData} setFormData={setFormData} />

          {/* Budget & Links Section */}
          <BudgetLinksSection formData={formData} setFormData={setFormData} />

          {/* Milestones Section */}
          <MilestonesSection
            formData={formData}
            setFormData={setFormData}
            handleGenerateContent={handleGenerateContent}
          />

          {/* Accomplishments Section */}
          <AccomplishmentsSection
            formData={formData}
            setFormData={setFormData}
          />

          {/* Next Period Activities Section */}
          <NextPeriodActivitiesSection
            formData={formData}
            setFormData={setFormData}
          />

          {/* Risks Section */}
          <RisksSection formData={formData} setFormData={setFormData} />

          {/* Considerations Section */}
          <ConsiderationsSection
            formData={formData}
            setFormData={setFormData}
          />

          {/* Changes Section */}
          <ChangesSection formData={formData} setFormData={setFormData} />

          {/* Form Actions - Now floating */}
          <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border shadow-lg p-4 z-10 flex justify-center items-center">
            <div className="container mx-auto flex justify-between max-w-4xl">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (hasChanges) {
                    setPendingNavigationAction(() => onBack);
                    setShowUnsavedChangesDialog(true);
                  } else {
                    onBack();
                  }
                }}
              >
                Cancel
              </Button>

              <div className="flex items-center gap-2">
                {hasChanges && (
                  <div className="bg-orange-100 dark:bg-orange-900/30 border-l-4 border-orange-500 shadow-md rounded-l-lg p-2 animate-pulse">
                    <div className="flex items-center gap-2">
                      <span className="animate-pulse h-3 w-3 rounded-full bg-orange-500"></span>
                      <span className="text-orange-600 dark:text-orange-400 font-bold text-sm">
                        Unsaved changes
                      </span>
                    </div>
                  </div>
                )}
                <Button
                  type="submit"
                  className={`${hasChanges ? "bg-orange-500 hover:bg-orange-600 dark:bg-orange-600 dark:hover:bg-orange-700" : "bg-primary hover:bg-primary/90"}`}
                >
                  Save Project
                </Button>
              </div>
            </div>
          </div>

          {/* Dialogs */}
          <UnsavedChangesDialog
            open={showUnsavedChangesDialog}
            onOpenChange={setShowUnsavedChangesDialog}
            pendingNavigationAction={pendingNavigationAction}
            setPendingNavigationAction={setPendingNavigationAction}
          />

          <OverwriteDialog
            open={showOverwriteDialog}
            onOpenChange={setShowOverwriteDialog}
            pendingGenerationType={pendingGenerationType}
            setPendingGenerationType={setPendingGenerationType}
            generateContent={generateContent}
            onConfirm={handleConfirmOverwrite}
            onCancel={handleCancelOverwrite}
          />

          <DeleteConfirmationDialog
            open={showDeleteDialog}
            onOpenChange={setShowDeleteDialog}
            onConfirm={handleConfirmDelete}
            onCancel={handleCancelDelete}
          />

          <SuggestedMilestones
            isOpen={showSuggestedMilestones}
            onClose={() => setShowSuggestedMilestones(false)}
            suggestedMilestones={suggestedMilestones}
            onApply={async (selectedMilestones) => {
              // Apply the selected milestones to the form data
              await handleApplyMilestones(selectedMilestones);
            }}
          />
        </form>
      </div>
    </TooltipProvider>
  );
};

export default ProjectForm;