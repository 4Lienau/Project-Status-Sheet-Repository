import React from "react";
import { Button } from "@/components/ui/button";
import { Wand2, Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { MilestoneList } from "@/components/MilestoneList";
import { ProgressPill } from "@/components/ui/progress-pill";
import { SectionHeader } from "./SectionHeader";

interface MilestonesSectionProps {
  formData: any;
  setFormData: (updater: (prev: any) => any) => void;
  handleGenerateContent: (
    type: "description" | "value" | "milestones" | "analysis",
  ) => void;
}

// Wrapper component to maintain compatibility with MilestoneList
const MilestoneProgressPill: React.FC<{
  completion: number;
  status: string;
  onChange: (value: number) => void;
}> = ({ completion, status, onChange }) => {
  return (
    <ProgressPill completion={completion} status={status} onChange={onChange} />
  );
};

const MilestonesSection: React.FC<MilestonesSectionProps> = ({
  formData,
  setFormData,
  handleGenerateContent,
}) => {
  // Helper function to calculate the date for a new milestone
  const getNewMilestoneDate = () => {
    if (!formData.milestones || formData.milestones.length === 0) {
      // If no milestones exist, use today's date
      return new Date().toISOString().split("T")[0];
    }

    // Find the latest date among existing milestones
    const latestDate = formData.milestones
      .map((milestone) => milestone.date)
      .filter((date) => date && date.trim() !== "") // Filter out empty dates
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];

    if (!latestDate) {
      // If no valid dates found, use today's date
      return new Date().toISOString().split("T")[0];
    }

    // Add 7 days (1 week) to the latest date
    const newDate = new Date(latestDate);
    newDate.setDate(newDate.getDate() + 7);

    return newDate.toISOString().split("T")[0];
  };

  return (
    <TooltipProvider>
      <SectionHeader
        title="Milestones"
        tooltip="Add key project milestones with dates, owners, and completion status. Drag to reorder, click Add Milestone to create new ones, or use AI to generate suggested milestones based on your project title and description."
        className="flex items-center justify-between mb-4"
      >
        <Button
          type="button"
          variant="outline"
          onClick={() => handleGenerateContent("milestones")}
          className="bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-200"
        >
          <Wand2 className="h-4 w-4 mr-2" />
          Use AI to Generate
        </Button>
      </SectionHeader>

      <div className="space-y-4 bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-gray-100 shadow-sm">
        {/* Column Headers */}
        <div className="grid grid-cols-[30px_1fr] gap-2 mb-3 pb-2 border-b border-gray-200">
          <div></div>
          <div className="grid grid-cols-[140px_1fr_150px_auto] gap-2">
            <div className="font-semibold text-sm text-gray-800">Date</div>
            <div className="font-semibold text-sm text-gray-800">Milestone</div>
            <div className="font-semibold text-sm text-gray-800">Owner</div>
            <div className="grid grid-cols-[80px_70px_120px_40px] gap-2">
              <div className="font-semibold text-sm text-gray-800">
                % Complete
              </div>
              <div className="font-semibold text-sm text-gray-800 flex items-center gap-1">
                Weight
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">
                      Milestone weight (1-5) determines the relative importance
                      of each milestone in calculating overall project
                      completion. Higher weights (4-5) have greater impact on
                      the project's weighted completion percentage. Weight 3 is
                      the default standard importance.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="font-semibold text-sm text-gray-800">Status</div>
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
          ProgressPillComponent={MilestoneProgressPill}
          projectId={formData.id}
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
                  date: getNewMilestoneDate(),
                  milestone: "",
                  owner: "",
                  completion: 0,
                  status: "green",
                  tasks: [], // Initialize with empty tasks array
                },
              ],
            }))
          }
          className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200 font-medium mt-4"
        >
          Add Milestone
        </Button>
      </div>
    </TooltipProvider>
  );
};

export default MilestonesSection;
