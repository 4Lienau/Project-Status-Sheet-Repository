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

interface RisksSectionProps {
  formData: any;
  setFormData: (updater: (prev: any) => any) => void;
}

const RisksSection: React.FC<RisksSectionProps> = ({ formData, setFormData }) => {
  const handleRiskUpdate = (index: number, field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      risks: prev.risks.map((r, i) =>
        i === index
          ? {
              ...r,
              [field]: value,
            }
          : r,
      ),
    }));
  };

  const handleRiskDelete = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      risks: prev.risks.filter((_, i) => i !== index),
    }));
  };

  const handleAddRisk = () => {
    setFormData((prev) => ({
      ...prev,
      risks: [...prev.risks, { description: "", impact: "" }],
    }));
  };

  return (
    <TooltipProvider>
      <SectionHeader
        title="Risks"
        tooltip="Identify and track potential risks to the project, including their impact level and mitigation strategies."
      />
      <div className="space-y-4 bg-card/80 backdrop-blur-sm rounded-xl p-4 border-4 border-border shadow-lg">
        {/* Column Headers */}
        <div className="grid grid-cols-[2fr_1fr_auto] gap-2 items-start">
          <div className="font-medium text-sm text-primary">Risk</div>
          <div className="font-medium text-sm text-primary">Impact</div>
          <div></div>
        </div>

        {/* Risk Rows */}
        {formData.risks.map((item, index) => (
          <ListItemRow
            key={index}
            item={item}
            index={index}
            onUpdate={(field, value) => handleRiskUpdate(index, field, value)}
            onDelete={() => handleRiskDelete(index)}
            showImpact={true}
          />
        ))}

        <Button
          type="button"
          variant="outline"
          onClick={handleAddRisk}
          className="bg-card/50 backdrop-blur-sm border-border"
        >
          Add Risk
        </Button>
      </div>
    </TooltipProvider>
  );
};

export default RisksSection;