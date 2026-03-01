import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "./SectionHeader";
import { Input } from "@/components/ui/input";
import {
  Trash2,
  EyeOff,
  Eye,
  Undo2,
  ChevronDown,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import type { AccomplishmentItem } from "@/lib/services/accomplishmentAutoService";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
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
  const [hiddenCollapsed, setHiddenCollapsed] = useState(true);

  // Normalize accomplishments to AccomplishmentItem format
  const accomplishments: AccomplishmentItem[] = (
    formData.accomplishments || []
  ).map((a: any) => {
    if (typeof a === "string") {
      return {
        description: a,
        source_type: "manual" as const,
        source_id: null,
        is_hidden: false,
        is_deleted: false,
        auto_generated: false,
      };
    }
    return {
      id: a.id,
      description: a.description || "",
      source_type: (a.source_type || "manual") as "manual" | "milestone" | "task",
      source_id: a.source_id || null,
      is_hidden: a.is_hidden || false,
      is_deleted: a.is_deleted || false,
      auto_generated: a.auto_generated || false,
    };
  });

  // Split into categories
  const visibleItems = accomplishments.filter(
    (a) => !a.is_hidden && !a.is_deleted,
  );
  const hiddenItems = accomplishments.filter(
    (a) => a.is_hidden && !a.is_deleted,
  );
  const deletedItems = accomplishments.filter((a) => a.is_deleted);

  const hiddenAndDeletedCount = hiddenItems.length + deletedItems.length;

  const updateAccomplishment = (
    globalIndex: number,
    updater: (item: AccomplishmentItem) => AccomplishmentItem,
  ) => {
    setFormData((prev: any) => ({
      ...prev,
      accomplishments: prev.accomplishments.map((a: any, i: number) =>
        i === globalIndex
          ? updater(
              typeof a === "string"
                ? {
                    description: a,
                    source_type: "manual",
                    source_id: null,
                    is_hidden: false,
                    is_deleted: false,
                    auto_generated: false,
                  }
                : a,
            )
          : a,
      ),
    }));
  };

  const handleDescriptionChange = (globalIndex: number, value: string) => {
    updateAccomplishment(globalIndex, (item) => ({
      ...item,
      description: value,
    }));
  };

  const handleHide = (globalIndex: number) => {
    updateAccomplishment(globalIndex, (item) => ({
      ...item,
      is_hidden: true,
    }));
  };

  const handleUnhide = (globalIndex: number) => {
    updateAccomplishment(globalIndex, (item) => ({
      ...item,
      is_hidden: false,
    }));
  };

  const handleSoftDelete = (globalIndex: number) => {
    updateAccomplishment(globalIndex, (item) => ({
      ...item,
      is_deleted: true,
      is_hidden: true,
    }));
  };

  const handleUndoDelete = (globalIndex: number) => {
    updateAccomplishment(globalIndex, (item) => ({
      ...item,
      is_deleted: false,
      is_hidden: true, // Keep hidden after undo - user can unhide manually
    }));
  };

  const handlePermanentDelete = (globalIndex: number) => {
    setFormData((prev: any) => ({
      ...prev,
      accomplishments: prev.accomplishments.filter(
        (_: any, i: number) => i !== globalIndex,
      ),
    }));
  };

  const handleAddAccomplishment = () => {
    setFormData((prev: any) => ({
      ...prev,
      accomplishments: [
        ...prev.accomplishments,
        {
          description: "",
          source_type: "manual",
          source_id: null,
          is_hidden: false,
          is_deleted: false,
          auto_generated: false,
        },
      ],
    }));
  };

  // Get the actual index in the full accomplishments array for a category item
  const getGlobalIndexForVisible = (visibleIdx: number): number => {
    let count = 0;
    for (let i = 0; i < accomplishments.length; i++) {
      if (!accomplishments[i].is_hidden && !accomplishments[i].is_deleted) {
        if (count === visibleIdx) return i;
        count++;
      }
    }
    return -1;
  };

  const getGlobalIndexForHidden = (hiddenIdx: number): number => {
    let count = 0;
    for (let i = 0; i < accomplishments.length; i++) {
      if (accomplishments[i].is_hidden && !accomplishments[i].is_deleted) {
        if (count === hiddenIdx) return i;
        count++;
      }
    }
    return -1;
  };

  const getGlobalIndexForDeleted = (deletedIdx: number): number => {
    let count = 0;
    for (let i = 0; i < accomplishments.length; i++) {
      if (accomplishments[i].is_deleted) {
        if (count === deletedIdx) return i;
        count++;
      }
    }
    return -1;
  };

  const renderVisibleItem = (item: AccomplishmentItem, idx: number) => {
    const globalIndex = getGlobalIndexForVisible(idx);

    return (
      <div key={`visible-${idx}`} className="flex gap-2 items-center group">
        <div className="flex-1 flex gap-2 items-center">
          {item.auto_generated && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Sparkles className="h-4 w-4 text-amber-500 flex-shrink-0" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    Auto-generated from{" "}
                    {item.source_type === "milestone"
                      ? "completed milestone"
                      : "completed task"}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          <Input
            value={item.description}
            onChange={(e) =>
              handleDescriptionChange(globalIndex, e.target.value)
            }
            placeholder="Enter accomplishment"
            className="backdrop-blur-sm border-border"
          />
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => handleHide(globalIndex)}
                className="h-9 w-9 p-0 text-muted-foreground hover:text-amber-600 hover:bg-amber-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <EyeOff className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Hide from status sheet</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => handleSoftDelete(globalIndex)}
          className="h-9 w-9 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    );
  };

  const renderHiddenItem = (item: AccomplishmentItem, idx: number) => {
    const globalIndex = getGlobalIndexForHidden(idx);

    return (
      <div key={`hidden-${idx}`} className="flex gap-2 items-center opacity-50">
        <div className="flex-1 flex gap-2 items-center">
          <EyeOff className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          {item.auto_generated && (
            <Sparkles className="h-3 w-3 text-amber-500/50 flex-shrink-0" />
          )}
          <span className="text-sm text-muted-foreground flex-1 px-3 py-2 truncate">
            {item.description}
          </span>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => handleUnhide(globalIndex)}
                className="h-9 w-9 p-0 text-muted-foreground hover:text-primary hover:bg-primary/10"
              >
                <Eye className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Show on status sheet</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => handlePermanentDelete(globalIndex)}
          className="h-9 w-9 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    );
  };

  const renderDeletedItem = (item: AccomplishmentItem, idx: number) => {
    const globalIndex = getGlobalIndexForDeleted(idx);

    return (
      <div key={`deleted-${idx}`} className="flex gap-2 items-center opacity-40">
        <div className="flex-1 flex gap-2 items-center">
          <Trash2 className="h-4 w-4 text-destructive/50 flex-shrink-0" />
          <span className="text-sm text-muted-foreground line-through flex-1 px-3 py-2 truncate">
            {item.description}
          </span>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => handleUndoDelete(globalIndex)}
                className="h-9 w-9 p-0 text-muted-foreground hover:text-primary hover:bg-primary/10"
              >
                <Undo2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Undo delete (moves to hidden)</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => handlePermanentDelete(globalIndex)}
          className="h-9 w-9 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    );
  };

  return (
    <>
      <SectionHeader
        title="Accomplishments"
        tooltip="List key accomplishments or completed deliverables for the project to date. Items at 100% completion from milestones/tasks will be auto-suggested."
      />
      <div className="space-y-4 bg-card/80 backdrop-blur-sm rounded-xl p-4 border-4 border-border shadow-lg">
        {/* Visible accomplishments */}
        {visibleItems.map((item, idx) => renderVisibleItem(item, idx))}

        {visibleItems.length === 0 && hiddenAndDeletedCount === 0 && (
          <p className="text-sm text-muted-foreground italic py-2">
            No accomplishments yet. Add one manually or complete a milestone to
            auto-generate.
          </p>
        )}

        {/* Hidden/Deleted section toggle */}
        {hiddenAndDeletedCount > 0 && (
          <div className="border-t border-border/50 pt-3 mt-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setHiddenCollapsed(!hiddenCollapsed)}
              className="text-muted-foreground hover:text-foreground text-xs gap-1"
            >
              {hiddenCollapsed ? (
                <ChevronRight className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
              {hiddenCollapsed
                ? `Show ${hiddenAndDeletedCount} hidden/deleted item${hiddenAndDeletedCount !== 1 ? "s" : ""}`
                : `Collapse ${hiddenAndDeletedCount} hidden/deleted item${hiddenAndDeletedCount !== 1 ? "s" : ""}`}
            </Button>

            {!hiddenCollapsed && (
              <div className="space-y-2 mt-2">
                {hiddenItems.length > 0 && (
                  <div className="text-xs text-muted-foreground font-medium pl-1 mb-1">
                    Hidden from status sheet
                  </div>
                )}
                {hiddenItems.map((item, idx) => renderHiddenItem(item, idx))}

                {deletedItems.length > 0 && (
                  <div className="text-xs text-muted-foreground font-medium pl-1 mb-1 mt-2">
                    Deleted
                  </div>
                )}
                {deletedItems.map((item, idx) => renderDeletedItem(item, idx))}
              </div>
            )}
          </div>
        )}

        <Button
          type="button"
          variant="outline"
          onClick={handleAddAccomplishment}
          className="bg-card/50 backdrop-blur-sm border-border"
        >
          Add Accomplishment
        </Button>
      </div>
    </>
  );
};

export default AccomplishmentsSection;