import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ConsiderationsSectionProps {
  formData: any;
  setFormData: (updater: (prev: any) => any) => void;
}

const ConsiderationsSection: React.FC<ConsiderationsSectionProps> = ({
  formData,
  setFormData,
}) => {
  return (
    <>
      <div className="flex items-center gap-1 mb-4">
        <h3 className="text-2xl font-bold text-blue-800">
          Questions/Items for Consideration
        </h3>
        <Tooltip>
          <TooltipTrigger asChild>
            <Info className="h-4 w-4 text-muted-foreground cursor-help" />
          </TooltipTrigger>
          <TooltipContent>
            <p className="max-w-xs">
              List any additional considerations, dependencies, or factors that
              should be taken into account.
            </p>
          </TooltipContent>
        </Tooltip>
      </div>
      <div className="space-y-4 bg-white/80 backdrop-blur-sm rounded-md p-4 border border-gray-100 shadow-sm">
        {formData.considerations.map((item, index) => (
          <div key={index} className="flex gap-2">
            <Input
              value={typeof item === "string" ? item : item?.description || ""}
              onChange={(e) =>
                setFormData((prev) => {
                  const newConsiderations = [...prev.considerations];
                  newConsiderations[index] = e.target.value;
                  console.log(
                    `Updating consideration at index ${index} to: '${e.target.value}'`,
                  );
                  console.log("New considerations array:", newConsiderations);
                  return {
                    ...prev,
                    considerations: newConsiderations,
                  };
                })
              }
              placeholder="Enter consideration"
              className="bg-white/50 backdrop-blur-sm border-gray-200/50"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setFormData((prev) => ({
                  ...prev,
                  considerations: prev.considerations.filter(
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
            setFormData((prev) => {
              // Always add a simple string, never an object
              return {
                ...prev,
                considerations: [...prev.considerations, ""],
              };
            })
          }
          className="bg-white/50 backdrop-blur-sm border-gray-200/50"
        >
          Add Consideration
        </Button>
      </div>
    </>
  );
};

export default ConsiderationsSection;
