import React from "react";
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SectionHeaderProps {
  title: string;
  tooltip: string;
  children?: React.ReactNode;
  className?: string;
}

/**
 * Reusable section header component with title, tooltip, and optional additional content
 * Used across all form sections for consistent styling and behavior
 */
export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  tooltip,
  children,
  className = "flex items-center gap-1 mb-4",
}) => {
  return (
    <div className={className}>
      <div className="flex items-center gap-1">
        <h3 className="text-2xl font-bold text-foreground">{title}</h3>
        <Tooltip>
          <TooltipTrigger asChild>
            <Info className="h-4 w-4 text-muted-foreground cursor-help" />
          </TooltipTrigger>
          <TooltipContent>
            <p className="max-w-xs">{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </div>
      {children}
    </div>
  );
};

export default SectionHeader;