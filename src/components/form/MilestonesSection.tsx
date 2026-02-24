import React from "react";
import { Button } from "@/components/ui/button";
import { Wand2, Info, Loader2 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { MilestoneList } from "@/components/MilestoneList";
import { ProgressPill } from "@/components/ui/progress-pill";
import { SectionHeader } from "./SectionHeader";
import { useToast } from "@/components/ui/use-toast";

import { AIContextDialog } from "./AIContextDialog";

interface MilestonesSectionProps {
  formData: any;
  setFormData: (updater: (prev: any) => any) => void;
  handleGenerateContent: (
    type: "description" | "value" | "milestones" | "analysis",
    additionalContext?: string,
  ) => void;
  isGeneratingMilestones?: boolean;
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
  isGeneratingMilestones = false,
}) => {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const { toast } = useToast();

  const handleDialogGenerate = (context: string) => {
    setDialogOpen(false);
    handleGenerateContent("milestones", context);
  };

  // Handle promoting a sub-task to a full milestone
  const handlePromoteTask = (task: { description: string; assignee: string; date: string; completion: number; duration_days?: number }, milestoneIndex: number) => {
    const durationDays = task.duration_days || 1;
    const startDate = task.date;

    // Calculate end date from start date + duration
    let endDate = startDate;
    if (startDate) {
      const start = new Date(startDate);
      const end = new Date(start);
      end.setDate(end.getDate() + durationDays);
      endDate = end.toISOString().split("T")[0];
    }

    const newMilestone = {
      date: startDate,
      end_date: endDate,
      milestone: task.description,
      owner: task.assignee,
      completion: task.completion,
      status: "green" as const,
      weight: 3,
      tasks: [],
    };

    setFormData((prev) => ({
      ...prev,
      milestones: [...prev.milestones, newMilestone],
    }));

    toast({
      title: "Task Promoted",
      description: `"${task.description || "Untitled task"}" has been promoted to a milestone.`,
    });
  };

  // Helper function to calculate the dates for a new milestone
  const getNewMilestoneDates = () => {
    let startDate: Date;
    
    if (!formData.milestones || formData.milestones.length === 0) {
      // If no milestones exist, use today's date
      startDate = new Date();
    } else {
      // Find the latest end_date or date among existing milestones
      const latestDate = formData.milestones
        .map((milestone) => milestone.end_date || milestone.date)
        .filter((date) => date && date.trim() !== "") // Filter out empty dates
        .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];

      if (!latestDate) {
        // If no valid dates found, use today's date
        startDate = new Date();
      } else {
        // Start after the latest end date
        startDate = new Date(latestDate);
        startDate.setDate(startDate.getDate() + 1);
      }
    }

    // End date is 1 week (7 days) after start date
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 7);

    return {
      date: startDate.toISOString().split("T")[0],
      end_date: endDate.toISOString().split("T")[0],
    };
  };

  return (
    <TooltipProvider>
      <AIContextDialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onGenerate={handleDialogGenerate}
        type="milestones"
        isGenerating={false}
      />
      <SectionHeader
        title="Milestones"
        tooltip="Add key project milestones with dates, owners, and completion status. Drag to reorder, click Add Milestone to create new ones, or use AI to generate suggested milestones based on your project title and description."
        className="flex items-center justify-between mb-4"
      >
        <Button
          type="button"
          variant="outline"
          onClick={() => setDialogOpen(true)}
          disabled={isGeneratingMilestones}
          className="bg-primary/10 text-primary hover:bg-primary/20 border-primary/20"
        >
          {isGeneratingMilestones ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Wand2 className="h-4 w-4 mr-2" />
              Help Me
            </>
          )}
        </Button>
      </SectionHeader>

      <div className="space-y-4 bg-card/80 backdrop-blur-sm rounded-xl p-4 border-4 border-border shadow-lg">
        {/* Column Headers */}
        <div className="mb-3 pb-2 border-b border-border">
          <div className="grid grid-cols-[120px_120px_1fr_130px_auto] gap-2">
            <div className="font-semibold text-sm text-foreground">Start Date</div>
            <div className="font-semibold text-sm text-foreground">End Date</div>
            <div className="font-semibold text-sm text-foreground">Milestone</div>
            <div className="font-semibold text-sm text-foreground">Owner</div>
            <div className="grid grid-cols-[80px_60px_100px_36px] gap-1">
              <div className="font-semibold text-sm text-foreground whitespace-nowrap">
                % Complete
              </div>
              <div className="font-semibold text-sm text-foreground flex items-center gap-1 whitespace-nowrap">
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
              <div className="font-semibold text-sm text-foreground whitespace-nowrap">Status</div>
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
                i === index ? { ...m, ...values } : m
              ),
            }))
          }
          onDelete={(index) =>
            setFormData((prev) => ({
              ...prev,
              milestones: prev.milestones.filter((_, i) => i !== index),
            }))
          }
          onPromoteTask={handlePromoteTask}
          ProgressPillComponent={MilestoneProgressPill}
          projectId={formData.id}
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            const { date, end_date } = getNewMilestoneDates();
            setFormData((prev) => ({
              ...prev,
              milestones: [
                ...prev.milestones,
                {
                  date,
                  end_date,
                  milestone: "",
                  owner: "",
                  completion: 0,
                  status: "green",
                  tasks: [],
                },
              ],
            }));
          }}
          className="bg-primary/10 text-primary hover:bg-primary/20 border-primary/20 font-medium mt-4"
        >
          Add Milestone
        </Button>
      </div>
    </TooltipProvider>
  );
};

export default MilestonesSection;