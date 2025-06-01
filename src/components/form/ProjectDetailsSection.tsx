import React from "react";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Button } from "@/components/ui/button";
import {
  Wand2,
  Info,
  BarChart2,
  Trash2,
  ChevronDown,
  ChevronRight,
  Loader2,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { calculateWeightedCompletion } from "@/lib/services/project";

interface ProjectDetailsSectionProps {
  formData: any;
  setFormData: (updater: (prev: any) => any) => void;
  handleGenerateContent: (
    type: "description" | "value" | "milestones" | "analysis",
  ) => void;
  isGeneratingAnalysis: boolean;
  isAnalysisExpanded: boolean;
  setIsAnalysisExpanded: (expanded: boolean) => void;
  isAnalysisLoading: boolean;
  showGanttChart: boolean;
  setShowGanttChart: (show: boolean) => void;
  handleDeleteProject: () => void;
  setPendingNavigationAction: (action: () => void) => void;
  setShowUnsavedChangesDialog: (show: boolean) => void;
}

const ProjectDetailsSection: React.FC<ProjectDetailsSectionProps> = ({
  formData,
  setFormData,
  handleGenerateContent,
  isGeneratingAnalysis,
  isAnalysisExpanded,
  setIsAnalysisExpanded,
  isAnalysisLoading,
  showGanttChart,
  setShowGanttChart,
  handleDeleteProject,
  setPendingNavigationAction,
  setShowUnsavedChangesDialog,
}) => {
  // Function to safely toggle the analysis section
  const toggleAnalysisSection = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log("Toggling analysis section to:", !isAnalysisExpanded);
    if (typeof setIsAnalysisExpanded === "function") {
      try {
        setIsAnalysisExpanded(!isAnalysisExpanded);
      } catch (error) {
        console.error("Error toggling analysis section:", error);
      }
    } else {
      console.error("setIsAnalysisExpanded is not a function");
    }
  };

  return (
    <div className="space-y-4 bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-gray-100 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-bold text-blue-800">Project Details</h3>
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
          className="bg-white border-gray-200 rounded-md"
          minHeight="50px"
          // Enter key handling is now managed at the form level
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
                  Provide a comprehensive description of the project, including
                  its purpose, goals, and scope. You can use the AI button to
                  automatically generate a description based on your project
                  title.
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
          className="bg-white border-gray-200 rounded-md"
          minHeight="120px"
          // Enter key handling is now managed at the form level
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
                  Explain the business value and strategic importance of this
                  project to the organization. You can use the AI button to
                  automatically generate a value statement based on your project
                  title and description.
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
          className="bg-white border-gray-200 rounded-md"
          minHeight="120px"
          // Enter key handling is now managed at the form level
        />
      </div>

      {/* Project Analysis Section */}
      <div className="space-y-2 mt-4 border-t pt-4">
        <div
          className="flex items-center justify-between cursor-pointer hover:bg-purple-50/50 p-2 rounded-md transition-colors"
          onClick={toggleAnalysisSection}
        >
          <div className="flex items-center gap-1">
            {isAnalysisExpanded ? (
              <ChevronDown className="h-4 w-4 text-purple-600" />
            ) : (
              <ChevronRight className="h-4 w-4 text-purple-600" />
            )}
            <Label
              htmlFor="projectAnalysis"
              className="cursor-pointer"
              onClick={toggleAnalysisSection}
            >
              Project Analysis{" "}
              {!isAnalysisExpanded && formData.projectAnalysis
                ? "(Click to expand)"
                : ""}
            </Label>
            <Tooltip>
              <TooltipTrigger
                asChild
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
              >
                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">
                  Generate an executive summary of the current project status
                  based on all project data. Summaries older than 1 week are
                  considered stale.
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
              // Always expand the section when generating analysis
              if (typeof setIsAnalysisExpanded === "function") {
                try {
                  setIsAnalysisExpanded(true);
                  console.log("Expanding analysis section");
                } catch (error) {
                  console.error("Error expanding analysis section:", error);
                }
              }
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
        <div
          className={`bg-purple-50 border border-purple-200 rounded-lg p-4 mt-2 transition-all duration-300 overflow-hidden ${isAnalysisExpanded ? "block" : "hidden"}`}
        >
          {isAnalysisLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
              <span className="ml-2 text-purple-600">Loading analysis...</span>
            </div>
          ) : (
            <>
              {formData.projectAnalysis ? (
                <div className="space-y-2">
                  {/* Summary metadata - timestamp and staleness indicator */}
                  {formData.summaryCreatedAt && (
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                      <div>
                        Generated on{" "}
                        {new Date(
                          formData.summaryCreatedAt,
                        ).toLocaleDateString()}{" "}
                        at{" "}
                        {new Date(
                          formData.summaryCreatedAt,
                        ).toLocaleTimeString()}
                      </div>
                      {formData.summaryIsStale && (
                        <div className="flex items-center gap-1 text-amber-600 font-medium">
                          <Info className="h-3 w-3" />
                          Summary is over 1 week old
                        </div>
                      )}
                    </div>
                  )}
                  {!formData.summaryCreatedAt && formData.projectAnalysis && (
                    <div className="flex items-center text-xs text-gray-500 mb-2">
                      <div className="italic">
                        No timestamp available for this summary
                      </div>
                    </div>
                  )}

                  {/* Summary content */}
                  <div
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{
                      __html: formData.projectAnalysis,
                    }}
                  />
                </div>
              ) : (
                <div className="text-center text-gray-500 py-4">
                  {isGeneratingAnalysis ? (
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="animate-spin h-6 w-6 border-2 border-purple-500 rounded-full border-t-transparent"></div>
                      <p>Generating analysis...</p>
                    </div>
                  ) : (
                    <>
                      No analysis available. Click the "AI Executive Summary"
                      button to generate one.
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectDetailsSection;
