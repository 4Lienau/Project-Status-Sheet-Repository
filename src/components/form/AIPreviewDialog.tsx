import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AIPreviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  content: string;
  type: "description" | "value" | "milestones" | "analysis" | null;
}

export const AIPreviewDialog: React.FC<AIPreviewDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  content,
  type,
}) => {
  const getTitle = () => {
    switch (type) {
      case "description":
        return "Review Generated Description";
      case "value":
        return "Review Generated Value Statement";
      default:
        return "Review Generated Content";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
          <DialogDescription>
            Review the generated content below. This will overwrite your existing content.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <div className="rounded-md border bg-muted/50 p-4">
            <ScrollArea className="h-[200px] w-full rounded-md">
              <div 
                className="text-sm leading-relaxed whitespace-pre-wrap"
                dangerouslySetInnerHTML={{ __html: content }} 
              />
            </ScrollArea>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onConfirm}>
            Replace Existing
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
