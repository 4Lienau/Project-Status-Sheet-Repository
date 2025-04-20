import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface RisksSectionProps {
  formData: any;
  setFormData: (updater: (prev: any) => any) => void;
}

const RisksSection: React.FC<RisksSectionProps> = ({
  formData,
  setFormData,
}) => {
  return (
    <>
      <div className="flex items-center gap-1 mb-4">
        <h3 className="text-2xl font-bold text-blue-800">Risks</h3>
        <Tooltip>
          <TooltipTrigger asChild>
            <Info className="h-4 w-4 text-muted-foreground cursor-help" />
          </TooltipTrigger>
          <TooltipContent>
            <p className="max-w-xs">
              List any risks or challenges that could impact the project's
              success.
            </p>
          </TooltipContent>
        </Tooltip>
      </div>
      <div className="space-y-4 bg-white/80 backdrop-blur-sm rounded-md p-4 border border-gray-100 shadow-sm">
        {/* Column Headers */}
        <div className="grid grid-cols-[1fr_1fr_auto] gap-2 items-start">
          <div className="font-medium text-sm text-blue-800">
            Risk Description
          </div>
          <div className="font-medium text-sm text-blue-800">Impact</div>
          <div></div>
        </div>
        {formData.risks.map((item, index) => (
          <div
            key={index}
            className="grid grid-cols-[1fr_1fr_auto] gap-2 items-start"
          >
            <Input
              value={typeof item === "string" ? item : item.description || ""}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  risks: prev.risks.map((r, i) =>
                    i === index
                      ? {
                          description: e.target.value,
                          impact: typeof r === "object" ? r.impact : "",
                        }
                      : r,
                  ),
                }))
              }
              placeholder="Enter risk description"
              className="bg-white/50 backdrop-blur-sm border-gray-200/50"
            />
            <Input
              value={typeof item === "object" ? item.impact || "" : ""}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  risks: prev.risks.map((r, i) =>
                    i === index
                      ? {
                          description:
                            typeof r === "object"
                              ? r.description
                              : typeof r === "string"
                                ? r
                                : "",
                          impact: e.target.value,
                        }
                      : r,
                  ),
                }))
              }
              placeholder="Enter impact"
              className="bg-white/50 backdrop-blur-sm border-gray-200/50"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setFormData((prev) => ({
                  ...prev,
                  risks: prev.risks.filter((_, i) => i !== index),
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
              risks: [...prev.risks, { description: "", impact: "" }],
            }))
          }
          className="bg-white/50 backdrop-blur-sm border-gray-200/50"
        >
          Add Risk
        </Button>
      </div>
    </>
  );
};

export default RisksSection;
