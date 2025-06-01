import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Wand2, Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { MilestoneList } from "@/components/MilestoneList";

interface MilestonesSectionProps {
  formData: any;
  setFormData: (updater: (prev: any) => any) => void;
  handleGenerateContent: (
    type: "description" | "value" | "milestones" | "analysis",
  ) => void;
}

interface ProgressPillProps {
  completion: number;
  status: string;
  onChange: (value: number) => void;
}

const ProgressPill: React.FC<ProgressPillProps> = ({
  completion,
  status,
  onChange,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(completion.toString());
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus the input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Determine color based on completion percentage and status
  const getBackgroundColor = () => {
    // If task is complete, use blue
    if (completion === 100) return "bg-blue-100 text-blue-800";

    // Otherwise use status color
    switch (status) {
      case "green":
        return "bg-green-100 text-green-800";
      case "yellow":
        return "bg-yellow-100 text-yellow-800";
      case "red":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Handle saving the new value
  const handleSave = () => {
    let newValue = parseInt(inputValue, 10);

    // Validate the input value
    if (isNaN(newValue)) {
      newValue = completion; // Revert to original value if invalid
    } else {
      // Ensure value is between 0 and 100
      newValue = Math.max(0, Math.min(100, newValue));
    }

    // Update the input value to the validated value
    setInputValue(newValue.toString());

    // Call the onChange callback with the new value
    if (newValue !== completion) {
      onChange(newValue);
    }

    // Exit edit mode
    setIsEditing(false);
  };

  // Handle key press events
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      setInputValue(completion.toString()); // Revert to original value
      setIsEditing(false);
    }
  };

  // Get the background and text color classes
  const colorClasses = getBackgroundColor();
  const bgColorClass = colorClasses.split(" ")[0];
  const textColorClass = colorClasses.split(" ")[1] || "";

  if (isEditing) {
    return (
      <div className="w-full relative h-7">
        <input
          ref={inputRef}
          type="number"
          min="0"
          max="100"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className="w-full h-7 px-2 py-0 text-xs text-center border border-blue-400 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
          style={{ appearance: "textfield" }}
        />
      </div>
    );
  }

  return (
    <div
      className="w-full h-7 bg-gray-200 rounded-full overflow-hidden relative cursor-pointer hover:ring-2 hover:ring-blue-300 transition-all"
      onClick={() => setIsEditing(true)}
      title="Click to edit completion percentage"
    >
      <div
        className={`h-full ${bgColorClass}`}
        style={{ width: `${completion}%` }}
      ></div>
      <div
        className={`absolute inset-0 flex items-center justify-center text-xs font-medium ${textColorClass}`}
      >
        {completion}%
      </div>
    </div>
  );
};

const MilestonesSection: React.FC<MilestonesSectionProps> = ({
  formData,
  setFormData,
  handleGenerateContent,
}) => {
  return (
    <TooltipProvider>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1">
          <h3 className="text-2xl font-bold text-white">Milestones</h3>
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
          ProgressPillComponent={ProgressPill}
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
          className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200 font-medium mt-4"
        >
          Add Milestone
        </Button>
      </div>
    </TooltipProvider>
  );
};

export default MilestonesSection;
