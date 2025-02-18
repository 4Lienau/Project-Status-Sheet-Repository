import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Milestone {
  date: string;
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
  suggestedMilestones,
  onApply,
}) => {
  const [selectedMilestones, setSelectedMilestones] = React.useState<
    Set<number>
  >(new Set());

  const handleToggle = (index: number) => {
    const newSelected = new Set(selectedMilestones);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedMilestones(newSelected);
  };

  const handleApply = () => {
    const selected = suggestedMilestones.filter((_, index) =>
      selectedMilestones.has(index),
    );
    onApply(selected);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Suggested Milestones</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {suggestedMilestones.map((milestone, index) => (
              <div
                key={index}
                className="flex items-start space-x-4 border p-4 rounded-lg hover:bg-accent/5"
              >
                <Checkbox
                  id={`milestone-${index}`}
                  checked={selectedMilestones.has(index)}
                  onCheckedChange={() => handleToggle(index)}
                />
                <div className="flex-1 space-y-1">
                  <Label
                    htmlFor={`milestone-${index}`}
                    className="text-base font-medium"
                  >
                    {milestone.milestone}
                  </Label>
                  <div className="text-sm text-muted-foreground">
                    <div>Date: {milestone.date}</div>
                    <div>Owner: {milestone.owner}</div>
                    <div>Completion: {milestone.completion}%</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleApply}>
            Add Selected Milestones ({selectedMilestones.size})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
