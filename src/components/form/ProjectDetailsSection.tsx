import React from "react";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Wand2,
  Info,
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
import {
  calculateWeightedCompletion,
  calculateProjectHealthStatusColor,
} from "@/lib/services/project";
import { SectionHeader } from "./SectionHeader";

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
  handleShowDeleteDialog: () => void;
}

const ProjectDetailsSection: React.FC<ProjectDetailsSectionProps> = ({
  formData,
  setFormData,
  handleGenerateContent,
}) => {
  return (
    <TooltipProvider>
      <SectionHeader
        title="Project Details"
        tooltip="Enter the basic information about your project including title, description, and identification."
      />
      <div className="space-y-4 bg-card/80 backdrop-blur-sm rounded-xl p-4 border-4 border-border shadow-lg">
        {/* Project Title */}
        <div className="space-y-2">
          <Label htmlFor="title" className="text-foreground">
            Project Title *
          </Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, title: e.target.value }))
            }
            placeholder="Enter project title..."
            className="bg-card border-border text-foreground"
          />
        </div>

        {/* Project ID */}
        <div className="space-y-2">
          <Label htmlFor="project_id" className="text-foreground">
            Project ID
          </Label>
          <Input
            id="project_id"
            value={formData.projectId || ""}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                projectId: e.target.value,
              }))
            }
            placeholder="e.g., PROJ-2024-001"
            className="bg-card border-border text-foreground"
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="description" className="text-foreground">
              Description
            </Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleGenerateContent("description")}
              className="bg-primary/10 text-primary hover:bg-primary/20 border-primary/20"
            >
              <Wand2 className="h-4 w-4 mr-2" />
              Generate with AI
            </Button>
          </div>
          <RichTextEditor
            value={formData.description}
            onChange={(value) =>
              setFormData((prev) => ({ ...prev, description: value }))
            }
            placeholder="Enter project description..."
            className="bg-card border-border"
          />
        </div>

        {/* Value Statement */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="valueStatement" className="text-foreground">
              Value Statement
            </Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleGenerateContent("value")}
              className="bg-primary/10 text-primary hover:bg-primary/20 border-primary/20"
            >
              <Wand2 className="h-4 w-4 mr-2" />
              Generate with AI
            </Button>
          </div>
          <RichTextEditor
            value={formData.valueStatement}
            onChange={(value) =>
              setFormData((prev) => ({ ...prev, valueStatement: value }))
            }
            placeholder="Enter the value this project brings to the organization..."
            className="bg-card border-border"
          />
        </div>
      </div>
    </TooltipProvider>
  );
};

export default ProjectDetailsSection;