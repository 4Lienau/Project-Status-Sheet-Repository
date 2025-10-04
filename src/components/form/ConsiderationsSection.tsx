import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Info, Trash2 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SectionHeader } from "@/components/form/SectionHeader";
import { ListItemRow } from "@/components/form/ListItemRow";

// Force re-parse

interface ConsiderationsSectionProps {
  formData: any;
  setFormData: (updater: (prev: any) => any) => void;
}

const ConsiderationsSection: React.FC<ConsiderationsSectionProps> = ({
  formData,
  setFormData,
}) => {
  const handleConsiderationUpdate = (index: number, field: string, value: string) => {
    setFormData((prev) => {
      const newConsiderations = [...prev.considerations];
      newConsiderations[index] = value;
      console.log(
        `Updating consideration at index ${index} to: '${value}'`,
      );
      console.log("New considerations array:", newConsiderations);
      return {
        ...prev,
        considerations: newConsiderations,
      };
    });
  };

  const handleConsiderationDelete = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      considerations: prev.considerations.filter(
        (_, i) => i !== index,
      ),
    }));
  };

  const handleAddConsideration = () => {
    // Always add a simple string, never an object
    setFormData((prev) => {
      return {
        ...prev,
        considerations: [...prev.considerations, ""],
      };
    });
  };

  return (
    <TooltipProvider>
      <SectionHeader
        title="Considerations"
        tooltip="List important considerations, dependencies, or factors that may affect the project."
      />
      <div className="space-y-4 bg-card/80 backdrop-blur-sm rounded-xl p-4 border-4 border-border shadow-lg">
        {/* Column Headers */}
        <div className="grid grid-cols-[1fr_auto] gap-2 items-start">
          <div className="font-medium text-sm text-primary">Consideration</div>
          <div></div>
        </div>

        {/* Consideration Rows */}
        {formData.considerations.map((item, index) => (
          <ListItemRow
            key={index}
            item={item}
            index={index}
            onUpdate={(field, value) =>
              handleConsiderationUpdate(index, field, value)
            }
            onDelete={() => handleConsiderationDelete(index)}
          />
        ))}

        <Button
          type="button"
          variant="outline"
          onClick={handleAddConsideration}
          className="bg-card/50 backdrop-blur-sm border-border"
        >
          Add Consideration
        </Button>
      </div>
    </TooltipProvider>
  );
};

export default ConsiderationsSection;