import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";

interface Milestone {
  date: string;
  end_date?: string;
  milestone: string;
  owner: string;
  completion: number;
  status: "green" | "yellow" | "red";
}

interface SuggestedMilestonesProps {
  isOpen: boolean;
  onClose: () => void;
  suggestedMilestones: Milestone[];
  onApply: (selectedMilestones: Milestone[]) => void;
}

export const SuggestedMilestones: React.FC<SuggestedMilestonesProps> = ({
  isOpen,
  onClose,
  suggestedMilestones = [], // Provide default empty array
  onApply,
}) => {
  // Initialize with all milestones selected by default
  const [selectedMilestones, setSelectedMilestones] = React.useState<
    Set<number>
  >(() => {
    // Safely handle the case where suggestedMilestones might be undefined
    return new Set(
      Array.isArray(suggestedMilestones) && suggestedMilestones.length > 0
        ? suggestedMilestones.map((_, index) => index)
        : [],
    );
  });

  // Reset selected milestones when suggestedMilestones changes or dialog opens
  React.useEffect(() => {
    if (
      isOpen &&
      Array.isArray(suggestedMilestones) &&
      suggestedMilestones.length > 0
    ) {
      console.log(
        "Resetting selected milestones with",
        suggestedMilestones.length,
        "items",
      );
      setSelectedMilestones(
        new Set(suggestedMilestones.map((_, index) => index)),
      );
    } else if (isOpen) {
      console.log("No valid milestones to select, clearing selection");
      setSelectedMilestones(new Set());
    }
  }, [suggestedMilestones, isOpen]);

  const handleToggle = (index: number) => {
    const newSelected = new Set(selectedMilestones);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedMilestones(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedMilestones.size === suggestedMilestones.length) {
      setSelectedMilestones(new Set());
    } else {
      setSelectedMilestones(
        new Set(suggestedMilestones.map((_, index) => index)),
      );
    }
  };

  const handleApply = () => {
    console.log("Applying selected milestones", {
      totalMilestones: suggestedMilestones.length,
      selectedCount: selectedMilestones.size,
      selectedIndices: Array.from(selectedMilestones),
    });

    // Check if any milestones are selected
    if (selectedMilestones.size === 0) {
      console.log("No milestones selected, not applying any changes");
      return;
    }

    // Filter the milestones based on selection
    const selected = suggestedMilestones.filter((_, index) =>
      selectedMilestones.has(index),
    );

    console.log("Selected milestones to apply:", selected);

    // Create a deep copy of the selected milestones to prevent reference issues
    const selectedCopy = JSON.parse(JSON.stringify(selected));

    // Important: Don't close the dialog yet - we'll let the parent component do it
    // after the save operation is complete

    // Call the onApply callback with the selected milestones
    // This will trigger the save operation in the parent component
    onApply(selectedCopy);

    // Don't close here - let the parent component handle closing
    // This ensures the state updates complete before the dialog closes
  };

  const isAllSelected = selectedMilestones.size === suggestedMilestones.length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Suggested Milestones</DialogTitle>
          <DialogDescription>
            Select the milestones you want to add to your project.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center space-x-2 py-4">
          <Checkbox
            id="select-all"
            checked={isAllSelected}
            onCheckedChange={handleSelectAll}
          />
          <Label htmlFor="select-all" className="text-sm font-medium">
            {isAllSelected ? "Deselect All" : "Select All"}
          </Label>
        </div>

        <Card className="p-0 border-none shadow-none">
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-2">
              {suggestedMilestones.map((milestone, index) => (
                <Card
                  key={index}
                  className="flex items-start space-x-4 p-4 transition-colors hover:bg-accent/5"
                >
                  <Checkbox
                    id={`milestone-${index}`}
                    checked={selectedMilestones.has(index)}
                    onCheckedChange={() => handleToggle(index)}
                  />
                  <div className="flex-1 space-y-1">
                    <Label
                      htmlFor={`milestone-${index}`}
                      className="text-base font-medium cursor-pointer"
                    >
                      {milestone.milestone}
                    </Label>
                    <div className="grid grid-cols-3 gap-2 text-sm text-muted-foreground">
                      <div>
                        {milestone.end_date
                          ? `${milestone.date} - ${milestone.end_date}`
                          : `Date: ${milestone.date}`}
                      </div>
                      <div>Owner: {milestone.owner}</div>
                      <div>Completion: {milestone.completion}%</div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </Card>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleApply}
            disabled={selectedMilestones.size === 0}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Add Selected Milestones ({selectedMilestones.size})
          </Button>
        </DialogFooter>
        <div className="text-sm text-amber-600 mt-2 text-center">
          <strong>Note:</strong> After adding milestones, remember to click
          "Save Project" to permanently save your changes.
        </div>
      </DialogContent>
    </Dialog>
  );
};
