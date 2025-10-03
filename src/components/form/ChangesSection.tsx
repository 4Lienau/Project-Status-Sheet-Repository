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

interface ChangesSectionProps {
  formData: any;
  setFormData: (updater: (prev: any) => any) => void;
}

const ChangesSection: React.FC<ChangesSectionProps> = ({
  formData,
  setFormData,
}) => {
  const handleChangeUpdate = (index: number, field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      changes: prev.changes.map((c, i) =>
        i === index ? { ...c, [field]: value } : c,
      ),
    }));
  };

  const handleChangeDelete = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      changes: prev.changes.filter((_, i) => i !== index),
    }));
  };

  const handleAddChange = () => {
    setFormData((prev) => ({
      ...prev,
      changes: [
        ...prev.changes,
        { change: "", impact: "", disposition: "" },
      ],
    }));
  };

  return (
    <TooltipProvider>
      <SectionHeader
        title="Changes"
        tooltip="Document any significant changes to the project scope, timeline, or resources."
      />
      <div className="space-y-2 bg-card/80 backdrop-blur-sm rounded-xl p-4 border border-border shadow-sm">
        {/* Column Headers */}
        <div className="grid grid-cols-[2fr_1fr_1fr_auto] gap-2 items-start">
          <div className="font-medium text-sm text-primary">Change</div>
          <div className="font-medium text-sm text-primary">Impact</div>
          <div className="font-medium text-sm text-primary">Disposition</div>
          <div></div>
        </div>

        {/* Change Rows */}
        {formData.changes.map((item, index) => (
          <ListItemRow
            key={index}
            item={item}
            index={index}
            onUpdate={(field, value) => handleChangeUpdate(index, field, value)}
            onDelete={() => handleChangeDelete(index)}
            showImpact={true}
            showDisposition={true}
          />
        ))}

        <Button
          type="button"
          variant="outline"
          onClick={handleAddChange}
          className="bg-card/50 backdrop-blur-sm border-border"
        >
          Add Change
        </Button>
      </div>
    </TooltipProvider>
  );
};

export default ChangesSection;