import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2 } from "lucide-react";

interface ListItemRowProps {
  value?: string;
  item?: any;
  index: number;
  placeholder?: string;
  onChange?: (value: string) => void;
  onUpdate?: (field: string, value: string) => void;
  onDelete: () => void;
  className?: string;
  showImpact?: boolean;
  showDisposition?: boolean;
}

/**
 * Reusable component for displaying and editing list items with delete functionality
 * Used in AccomplishmentsSection, ConsiderationsSection, RisksSection, ChangesSection, and other similar list-based sections
 */
export const ListItemRow: React.FC<ListItemRowProps> = ({
  value,
  item,
  index,
  placeholder = "Enter item",
  onChange,
  onUpdate,
  onDelete,
  className = "backdrop-blur-sm border-border",
  showImpact = false,
  showDisposition = false,
}) => {
  // Handle both simple string items and complex objects
  const isSimpleString = typeof value === "string" || typeof item === "string";
  // For Changes section, use 'change' field; for other sections, use 'description' field
  const displayValue = isSimpleString ? (value || item) : (item?.change || item?.description || "");
  const impactValue = item?.impact || "";
  const dispositionValue = item?.disposition || "";

  const handleChange = (newValue: string) => {
    if (onChange) {
      onChange(newValue);
    } else if (onUpdate) {
      // For Changes section (has both impact and disposition), use 'change' field
      // For other sections (like Risks with only impact), use 'description' field
      const fieldName = showImpact && showDisposition ? "change" : "description";
      onUpdate(fieldName, newValue);
    }
  };

  const handleImpactChange = (newValue: string) => {
    if (onUpdate) {
      onUpdate("impact", newValue);
    }
  };

  const handleDispositionChange = (newValue: string) => {
    if (onUpdate) {
      onUpdate("disposition", newValue);
    }
  };

  // Show Impact and Disposition columns (for Changes section)
  if (showImpact && showDisposition) {
    return (
      <div key={index} className="grid grid-cols-[2fr_1fr_1fr_auto] gap-2 items-start">
        <Input
          value={displayValue}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={placeholder}
          className={className}
        />
        <Input
          value={impactValue}
          onChange={(e) => handleImpactChange(e.target.value)}
          placeholder="Impact"
          className={className}
        />
        <Input
          value={dispositionValue}
          onChange={(e) => handleDispositionChange(e.target.value)}
          placeholder="Disposition"
          className={className}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onDelete}
          className="h-9 w-9 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  // Show only Impact column (for Risks section)
  if (showImpact) {
    return (
      <div key={index} className="grid grid-cols-[2fr_1fr_auto] gap-2 items-start">
        <Input
          value={displayValue}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={placeholder}
          className={className}
        />
        <Input
          value={impactValue}
          onChange={(e) => handleImpactChange(e.target.value)}
          placeholder="Impact"
          className={className}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onDelete}
          className="h-9 w-9 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  // Simple single-column layout (for Accomplishments, Considerations, etc.)
  return (
    <div key={index} className="flex gap-2">
      <Input
        value={displayValue}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        className={className}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onDelete}
        className="h-9 w-9 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default ListItemRow;