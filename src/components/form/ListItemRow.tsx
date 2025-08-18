import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2 } from "lucide-react";

interface ListItemRowProps {
  value: string;
  index: number;
  placeholder: string;
  onChange: (value: string) => void;
  onDelete: () => void;
  className?: string;
}

/**
 * Reusable component for displaying and editing list items with delete functionality
 * Used in AccomplishmentsSection, ConsiderationsSection, and other similar list-based sections
 */
export const ListItemRow: React.FC<ListItemRowProps> = ({
  value,
  index,
  placeholder,
  onChange,
  onDelete,
  className = "bg-white/50 backdrop-blur-sm border-gray-200/50",
}) => {
  return (
    <div key={index} className="flex gap-2">
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={className}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onDelete}
        className="h-9 w-9 p-0"
      >
        <Trash2 className="h-4 w-4 text-gray-500 hover:text-red-500" />
      </Button>
    </div>
  );
};

export default ListItemRow;
