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

// Import refactored form components
import ProjectDetailsSection from "@/components/form/ProjectDetailsSection";
import ProjectStatusSection from "@/components/form/ProjectStatusSection";
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
} from "@/components/form/DialogComponents";
import { SuggestedMilestones } from "@/components/SuggestedMilestones";
import GanttChartDialog from "@/components/dashboard/GanttChartDialog";

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
    showGanttChart,
    setShowGanttChart,
    pendingGenerationType,
    setPendingGenerationType,
    isGeneratingAnalysis,
    isAnalysisExpanded,
    setIsAnalysisExpanded,
    isAnalysisLoading,
    handleSubmit,
    handleGenerateContent,
    handleDeleteProject,
    handleApplyMilestones,
    handleConfirmOverwrite,
    handleCancelOverwrite,
    generateContent,
  } = useProjectForm(initialData, onSubmit, projectId);

  return (
    <TooltipProvider>
      <form
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
          setIsAnalysisExpanded={setIsAnalysisExpanded}
          isAnalysisLoading={isAnalysisLoading}
          showGanttChart={showGanttChart}
          setShowGanttChart={setShowGanttChart}
          handleDeleteProject={handleDeleteProject}
          setPendingNavigationAction={setPendingNavigationAction}
          setShowUnsavedChangesDialog={setShowUnsavedChangesDialog}
        />

        {/* Project Status Section */}
        <ProjectStatusSection formData={formData} setFormData={setFormData} />

        {/* Health Calculation Section */}
        <HealthCalculationSection
          formData={formData}
          setFormData={setFormData}
        />

        {/* Budget & Links Section */}
        <BudgetLinksSection formData={formData} setFormData={setFormData} />

        {/* Milestones Section */}
        <MilestonesSection
          formData={formData}
          setFormData={setFormData}
          handleGenerateContent={handleGenerateContent}
        />

        {/* Accomplishments Section */}
        <AccomplishmentsSection formData={formData} setFormData={setFormData} />

        {/* Next Period Activities Section */}
        <NextPeriodActivitiesSection
          formData={formData}
          setFormData={setFormData}
        />

        {/* Risks Section */}
        <RisksSection formData={formData} setFormData={setFormData} />

        {/* Considerations Section */}
        <ConsiderationsSection formData={formData} setFormData={setFormData} />

        {/* Changes Section */}
        <ChangesSection formData={formData} setFormData={setFormData} />

        {/* Form Actions - Now floating */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 z-10 flex justify-between items-center">
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
          <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
            Save Project
          </Button>
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

        <GanttChartDialog
          open={showGanttChart}
          onOpenChange={setShowGanttChart}
          milestones={formData.milestones}
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
    </TooltipProvider>
  );
};

export default ProjectForm;
