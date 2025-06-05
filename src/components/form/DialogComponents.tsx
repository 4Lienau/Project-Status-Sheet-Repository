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

interface UnsavedChangesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pendingNavigationAction: (() => void) | null;
  setPendingNavigationAction: (action: (() => void) | null) => void;
}

export const UnsavedChangesDialog: React.FC<UnsavedChangesDialogProps> = ({
  open,
  onOpenChange,
  pendingNavigationAction,
  setPendingNavigationAction,
}) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
          <AlertDialogDescription>
            You have unsaved changes. Are you sure you want to leave without
            saving?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            onClick={() => {
              setPendingNavigationAction(null);
              onOpenChange(false);
            }}
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              if (pendingNavigationAction) {
                pendingNavigationAction();
                setPendingNavigationAction(null);
              }
              onOpenChange(false);
            }}
          >
            Leave Without Saving
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

interface OverwriteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pendingGenerationType: "description" | "value" | null;
  setPendingGenerationType: (type: "description" | "value" | null) => void;
  generateContent: (
    type: "description" | "value" | "milestones" | "analysis",
  ) => Promise<void>;
  onConfirm: () => void;
  onCancel: () => void;
}

export const OverwriteDialog: React.FC<OverwriteDialogProps> = ({
  open,
  onOpenChange,
  pendingGenerationType,
  setPendingGenerationType,
  generateContent,
  onConfirm,
  onCancel,
}) => {
  // Define handlers directly in the component
  const handleCancel = (e: React.MouseEvent) => {
    console.log("Cancel button clicked");
    e.preventDefault();
    e.stopPropagation();
    setPendingGenerationType(null);
    onOpenChange(false);
    if (onCancel) onCancel();
  };

  const handleConfirm = async (e: React.MouseEvent) => {
    console.log("Overwrite button clicked");
    e.preventDefault();
    e.stopPropagation();

    if (pendingGenerationType) {
      try {
        await generateContent(pendingGenerationType);
      } catch (error) {
        console.error("Error generating content:", error);
      }
      setPendingGenerationType(null);
    }

    onOpenChange(false);
    if (onConfirm) onConfirm();
  };

  if (!open) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Overwrite Existing Content</AlertDialogTitle>
          <AlertDialogDescription>
            This will overwrite your existing content. Are you sure you want to
            proceed?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <button
            className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
            onClick={handleCancel}
          >
            Cancel
          </button>
          <button
            className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 ml-2"
            onClick={handleConfirm}
          >
            Overwrite
          </button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

interface DeleteConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export const DeleteConfirmationDialog: React.FC<
  DeleteConfirmationDialogProps
> = ({ open, onOpenChange, onConfirm, onCancel }) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Project</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete this project? This action cannot be
            undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
          >
            Yes, Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
