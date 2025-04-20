import React from "react";
import { Button } from "@/components/ui/button";
import { Wand2, Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { MilestoneList } from "@/components/MilestoneList";

interface MilestonesSectionProps {
  formData: any;
  setFormData: (updater: (prev: any) => any) => void;
  handleGenerateContent: (
    type: "description" | "value" | "milestones" | "analysis",
  ) => void;
}

const MilestonesSection: React.FC<MilestonesSectionProps> = ({
  formData,
  setFormData,
  handleGenerateContent,
}) => {
  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1">
          <h3 className="text-2xl font-bold text-blue-800">Milestones</h3>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-4 w-4 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs">
                Add key project milestones with dates, owners, and completion
                status. Drag to reorder, click Add Milestone to create new ones,
                or use AI to generate suggested milestones based on your project
                title and description.
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

      <div className="space-y-4 bg-white/80 backdrop-blur-sm rounded-md p-4 border border-gray-100 shadow-sm">
        {/* Column Headers */}
        <div className="grid grid-cols-[30px_1fr] gap-2">
          <div></div>
          <div className="grid grid-cols-[140px_1fr_150px_auto] gap-2">
            <div className="font-medium text-sm text-blue-800">Date</div>
            <div className="font-medium text-sm text-blue-800">Milestone</div>
            <div className="font-medium text-sm text-blue-800">Owner</div>
            <div className="grid grid-cols-[80px_70px_120px_40px] gap-2">
              <div className="font-medium text-sm text-blue-800">
                Completion %
              </div>
              <div className="font-medium text-sm text-blue-800">Weight</div>
              <div className="font-medium text-sm text-blue-800">Status</div>
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
    </>
  );
};

export default MilestonesSection;
