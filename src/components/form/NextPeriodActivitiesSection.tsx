import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface NextPeriodActivitiesSectionProps {
  formData: any;
  setFormData: (updater: (prev: any) => any) => void;
}

const NextPeriodActivitiesSection: React.FC<
  NextPeriodActivitiesSectionProps
> = ({ formData, setFormData }) => {
  return (
    <>
      <div className="flex items-center gap-1 mb-2 -mt-2">
        <h3 className="text-2xl font-bold text-blue-800">
          Next Period Activities
        </h3>
        <Tooltip>
          <TooltipTrigger asChild>
            <Info className="h-4 w-4 text-muted-foreground cursor-help" />
          </TooltipTrigger>
          <TooltipContent>
            <p className="max-w-xs">
              List activities planned for the next reporting period, including
              dates, completion percentages, and assignees.
            </p>
          </TooltipContent>
        </Tooltip>
      </div>
      <div className="space-y-2 bg-white/80 backdrop-blur-sm rounded-md p-4 border border-gray-100 shadow-sm mt-0">
        {/* Column Headers */}
        <div className="grid grid-cols-[1fr_140px_100px_150px_auto] gap-2 items-start">
          <div className="font-medium text-sm text-blue-800">Activity</div>
          <div className="font-medium text-sm text-blue-800">Date</div>
          <div className="font-medium text-sm text-blue-800">Completion %</div>
          <div className="font-medium text-sm text-blue-800">Assignee</div>
          <div></div>
        </div>
        {/* Sort activities by date before mapping */}
        {formData.nextPeriodActivities
          .slice() // Create a copy to avoid mutating the original array
          .sort((a, b) => a.date.localeCompare(b.date)) // Sort by date (ascending)
          .map((item, index) => (
            <div
              key={index}
              className="grid grid-cols-[1fr_140px_100px_150px_auto] gap-2 items-start"
            >
              <Input
                value={item.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    nextPeriodActivities: prev.nextPeriodActivities.map(
                      (a, i) =>
                        i === index ? { ...a, description: e.target.value } : a,
                    ),
                  }))
                }
                placeholder="Enter activity"
                className="bg-white/50 backdrop-blur-sm border-gray-200/50"
              />
              <Input
                type="date"
                value={item.date}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    nextPeriodActivities: prev.nextPeriodActivities.map(
                      (a, i) =>
                        i === index ? { ...a, date: e.target.value } : a,
                    ),
                  }))
                }
                className="bg-white/50 backdrop-blur-sm border-gray-200/50"
              />
              <Input
                type="number"
                min="0"
                max="100"
                value={item.completion}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    nextPeriodActivities: prev.nextPeriodActivities.map(
                      (a, i) =>
                        i === index
                          ? { ...a, completion: Number(e.target.value) }
                          : a,
                    ),
                  }))
                }
                className="bg-white/50 backdrop-blur-sm border-gray-200/50"
              />
              <Input
                value={item.assignee}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    nextPeriodActivities: prev.nextPeriodActivities.map(
                      (a, i) =>
                        i === index ? { ...a, assignee: e.target.value } : a,
                    ),
                  }))
                }
                placeholder="Enter assignee"
                className="bg-white/50 backdrop-blur-sm border-gray-200/50"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setFormData((prev) => ({
                    ...prev,
                    nextPeriodActivities: prev.nextPeriodActivities.filter(
                      (_, i) => i !== index,
                    ),
                  }))
                }
                className="bg-white/50 backdrop-blur-sm border-gray-200/50"
              >
                Remove
              </Button>
            </div>
          ))}
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            setFormData((prev) => ({
              ...prev,
              nextPeriodActivities: [
                ...prev.nextPeriodActivities,
                {
                  description: "",
                  date: new Date().toISOString().split("T")[0],
                  completion: 0,
                  assignee: "",
                },
              ],
            }))
          }
          className="bg-white/50 backdrop-blur-sm border-gray-200/50"
        >
          Add Activity
        </Button>
      </div>
    </>
  );
};

export default NextPeriodActivitiesSection;
