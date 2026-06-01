import React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CheckCircle2 } from "lucide-react";

interface ProjectCompleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ProjectCompleteDialog: React.FC<ProjectCompleteDialogProps> = ({
  open,
  onOpenChange,
  onConfirm,
  onCancel,
}) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <AlertDialogTitle className="text-lg">
              All Milestones Complete!
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-sm text-muted-foreground">
            All milestones in this project have reached 100% completion. Would
            you like to change the project status to{" "}
            <span className="font-semibold text-green-600 dark:text-green-400">
              Completed
            </span>
            ?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>
            No, Keep Current Status
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            Yes, Mark as Completed
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
