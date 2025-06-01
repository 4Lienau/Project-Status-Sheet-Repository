import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Info, Trash2 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface AccomplishmentsSectionProps {
  formData: any;
  setFormData: (updater: (prev: any) => any) => void;
}

const AccomplishmentsSection: React.FC<AccomplishmentsSectionProps> = ({
  formData,
  setFormData,
}) => {
  return (
    <>
      <div className="flex items-center gap-1 mb-4">
        <h3 className="text-2xl font-bold text-white">Accomplishments</h3>
        <Tooltip>
          <TooltipTrigger asChild>
            <Info className="h-4 w-4 text-muted-foreground cursor-help" />
          </TooltipTrigger>
          <TooltipContent>
            <p className="max-w-xs">
              List key accomplishments or completed deliverables for the project
              to date.
            </p>
          </TooltipContent>
        </Tooltip>
      </div>
      <div className="space-y-2 bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-gray-100 shadow-sm mb-0">
        {formData.accomplishments.map((item, index) => (
          <div key={index} className="flex gap-2">
            <Input
              value={item}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  accomplishments: prev.accomplishments.map((a, i) =>
                    i === index ? e.target.value : a,
                  ),
                }))
              }
              placeholder="Enter accomplishment"
              className="bg-white/50 backdrop-blur-sm border-gray-200/50"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() =>
                setFormData((prev) => ({
                  ...prev,
                  accomplishments: prev.accomplishments.filter(
                    (_, i) => i !== index,
                  ),
                }))
              }
              className="h-9 w-9 p-0"
            >
              <Trash2 className="h-4 w-4 text-gray-500 hover:text-red-500" />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            setFormData((prev) => ({
              ...prev,
              accomplishments: [...prev.accomplishments, ""],
            }))
          }
          className="bg-white/50 backdrop-blur-sm border-gray-200/50"
        >
          Add Accomplishment
        </Button>
      </div>
    </>
  );
};

export default AccomplishmentsSection;
