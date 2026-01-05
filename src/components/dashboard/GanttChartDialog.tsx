import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import GanttChart from "./GanttChart";

interface Milestone {
  id?: string;
  date: string;
  end_date?: string;
  milestone: string;
  owner: string;
  completion: number;
  status: "green" | "yellow" | "red";
}

interface GanttChartDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  milestones: Milestone[];
  projectTitle: string;
}

const GanttChartDialog: React.FC<GanttChartDialogProps> = ({
  open,
  onOpenChange,
  milestones,
  projectTitle,
}) => {
  // Create a local state to ensure dialog stays open
  const [isOpen, setIsOpen] = useState(false);

  // Sync the local state with the parent's open state
  useEffect(() => {
    if (open) {
      setIsOpen(true);
    }
  }, [open]);

  // Handle dialog close properly
  const handleOpenChange = (newOpenState: boolean) => {
    setIsOpen(newOpenState);
    if (!newOpenState) {
      // Only notify parent when actually closing
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[95vw] w-[1800px] max-h-[90vh] overflow-auto bg-gradient-to-b from-blue-50/50 to-white/90 backdrop-blur-sm border border-blue-100/50">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-blue-800">
            Project Timeline - Gantt Chart
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            Visual representation of project milestones and their timeline.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          {isOpen && (
            <GanttChart milestones={milestones} projectTitle={projectTitle} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GanttChartDialog;
