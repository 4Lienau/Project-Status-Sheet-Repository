import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ChangesSectionProps {
  formData: any;
  setFormData: (updater: (prev: any) => any) => void;
}

const ChangesSection: React.FC<ChangesSectionProps> = ({
  formData,
  setFormData,
}) => {
  return (
    <>
      <div className="flex items-center gap-1 mb-4">
        <h3 className="text-2xl font-bold text-blue-800">Changes</h3>
        <Tooltip>
          <TooltipTrigger asChild>
            <Info className="h-4 w-4 text-muted-foreground cursor-help" />
          </TooltipTrigger>
          <TooltipContent>
            <p className="max-w-xs">
              Document any changes to the project scope, timeline, or
              requirements, along with their impact and disposition.
            </p>
          </TooltipContent>
        </Tooltip>
      </div>
      <div className="space-y-4 bg-white/80 backdrop-blur-sm rounded-md p-4 border border-gray-100 shadow-sm">
        {/* Column Headers */}
        <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-start">
          <div className="font-medium text-sm text-blue-800">Change</div>
          <div className="font-medium text-sm text-blue-800">Impact</div>
          <div className="font-medium text-sm text-blue-800">Disposition</div>
          <div></div>
        </div>
        {formData.changes.map((item, index) => (
          <div
            key={index}
            className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-start"
          >
            <Input
              value={item.change}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  changes: prev.changes.map((c, i) =>
                    i === index ? { ...c, change: e.target.value } : c,
                  ),
                }))
              }
              placeholder="Enter change"
              className="bg-white/50 backdrop-blur-sm border-gray-200/50"
            />
            <Input
              value={item.impact}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  changes: prev.changes.map((c, i) =>
                    i === index ? { ...c, impact: e.target.value } : c,
                  ),
                }))
              }
              placeholder="Enter impact"
              className="bg-white/50 backdrop-blur-sm border-gray-200/50"
            />
            <Input
              value={item.disposition}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  changes: prev.changes.map((c, i) =>
                    i === index ? { ...c, disposition: e.target.value } : c,
                  ),
                }))
              }
              placeholder="Enter disposition"
              className="bg-white/50 backdrop-blur-sm border-gray-200/50"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setFormData((prev) => ({
                  ...prev,
                  changes: prev.changes.filter((_, i) => i !== index),
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
              changes: [
                ...prev.changes,
                { change: "", impact: "", disposition: "" },
              ],
            }))
          }
          className="bg-white/50 backdrop-blur-sm border-gray-200/50"
        >
          Add Change
        </Button>
      </div>
    </>
  );
};

export default ChangesSection;
