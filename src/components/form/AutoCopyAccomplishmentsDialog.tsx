/**
 * File: AutoCopyAccomplishmentsDialog.tsx
 * Purpose: Dialog that appears when milestones/tasks reach 100% completion,
 * prompting the user to add them as accomplishments.
 */

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Milestone, ListChecks } from "lucide-react";
import type { CompletedItem } from "@/lib/services/accomplishmentAutoService";
import { generateAccomplishmentDescription } from "@/lib/services/accomplishmentAutoService";

interface AutoCopyAccomplishmentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  completedItems: CompletedItem[];
  onConfirm: (selectedItems: CompletedItem[]) => void;
  onCancel: () => void;
}

export const AutoCopyAccomplishmentsDialog: React.FC<
  AutoCopyAccomplishmentsDialogProps
> = ({ open, onOpenChange, completedItems, onConfirm, onCancel }) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(completedItems.map((item) => item.id)),
  );

  // Reset selections when dialog opens with new items
  React.useEffect(() => {
    if (open) {
      setSelectedIds(new Set(completedItems.map((item) => item.id)));
    }
  }, [open, completedItems]);

  const toggleItem = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === completedItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(completedItems.map((item) => item.id)));
    }
  };

  const handleConfirm = () => {
    const selected = completedItems.filter((item) => selectedIds.has(item.id));
    onConfirm(selected);
  };

  const milestones = completedItems.filter((item) => item.type === "milestone");
  const tasks = completedItems.filter((item) => item.type === "task");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            Add Completed Items as Accomplishments?
          </DialogTitle>
          <DialogDescription>
            The following items just reached 100% completion. Select which ones
            you'd like to add to the Accomplishments section.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[400px] overflow-y-auto space-y-4 py-2">
          {/* Select/Deselect All */}
          <div className="flex items-center gap-2 px-1">
            <Checkbox
              id="select-all"
              checked={selectedIds.size === completedItems.length}
              onCheckedChange={toggleAll}
            />
            <label
              htmlFor="select-all"
              className="text-sm font-medium cursor-pointer"
            >
              Select All ({completedItems.length})
            </label>
          </div>

          {/* Milestones */}
          {milestones.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                <Milestone className="h-3.5 w-3.5" />
                Milestones ({milestones.length})
              </div>
              {milestones.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-2 pl-1 py-1.5 rounded-md hover:bg-muted/50 transition-colors"
                >
                  <Checkbox
                    id={`item-${item.id}`}
                    checked={selectedIds.has(item.id)}
                    onCheckedChange={() => toggleItem(item.id)}
                    className="mt-0.5"
                  />
                  <label
                    htmlFor={`item-${item.id}`}
                    className="text-sm cursor-pointer flex-1"
                  >
                    <span className="font-medium">{item.description}</span>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Will be added as: "
                      {generateAccomplishmentDescription(item)}"
                    </div>
                  </label>
                  <Badge
                    variant="secondary"
                    className="text-xs bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30"
                  >
                    100%
                  </Badge>
                </div>
              ))}
            </div>
          )}

          {/* Tasks */}
          {tasks.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                <ListChecks className="h-3.5 w-3.5" />
                Tasks ({tasks.length})
              </div>
              {tasks.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-2 pl-1 py-1.5 rounded-md hover:bg-muted/50 transition-colors"
                >
                  <Checkbox
                    id={`item-${item.id}`}
                    checked={selectedIds.has(item.id)}
                    onCheckedChange={() => toggleItem(item.id)}
                    className="mt-0.5"
                  />
                  <label
                    htmlFor={`item-${item.id}`}
                    className="text-sm cursor-pointer flex-1"
                  >
                    <span className="font-medium">{item.description}</span>
                    {item.parentMilestoneName && (
                      <span className="text-muted-foreground ml-1">
                        ({item.parentMilestoneName})
                      </span>
                    )}
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Will be added as: "
                      {generateAccomplishmentDescription(item)}"
                    </div>
                  </label>
                  <Badge
                    variant="secondary"
                    className="text-xs bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30"
                  >
                    100%
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2 sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            className="text-muted-foreground"
          >
            Skip
          </Button>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="default"
              onClick={handleConfirm}
              disabled={selectedIds.size === 0}
              className="gap-1.5"
            >
              <Sparkles className="h-4 w-4" />
              Add {selectedIds.size} as Accomplishment
              {selectedIds.size !== 1 ? "s" : ""}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AutoCopyAccomplishmentsDialog;
