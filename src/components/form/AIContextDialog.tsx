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
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Wand2 } from "lucide-react";

interface AIContextDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (context: string) => void;
  type: "description" | "value" | "milestones" | "analysis";
  isGenerating: boolean;
}

export const AIContextDialog: React.FC<AIContextDialogProps> = ({
  isOpen,
  onClose,
  onGenerate,
  type,
  isGenerating,
}) => {
  const [context, setContext] = useState("");

  const getDialogContent = () => {
    switch (type) {
      case "description":
        return {
          title: "Generate Project Description",
          description:
            "To get the best results, please provide some context about your project. What are the main goals? Who is the target audience? What problem does it solve?",
          placeholder:
            "E.g., This project aims to streamline our internal reporting process by automating data collection from three different departments...",
        };
      case "value":
        return {
          title: "Generate Value Statement",
          description:
            "Help the AI understand the business value of this project. What is the ROI? How does it align with company strategy? What are the key benefits?",
          placeholder:
            "E.g., This project will reduce manual data entry time by 50%, resulting in an estimated annual saving of $50k...",
        };
      case "milestones":
        return {
          title: "Generate Milestones",
          description:
            "You can guide the AI by listing any specific milestones that must be included, or key phases of the project. The AI will generate a timeline based on this.",
          placeholder:
            "E.g., We need to have a prototype ready by Q2, and user testing must be completed before the final release in Q4...",
        };
      case "analysis":
        return {
          title: "Generate Project Analysis",
          description:
            "Add any specific areas you want the analysis to focus on, or any external factors that should be considered.",
          placeholder:
            "E.g., Focus on the budget variance in the marketing department...",
        };
      default:
        return {
          title: "Generate Content",
          description: "Please provide additional context for the AI.",
          placeholder: "Add context here...",
        };
    }
  };

  const content = getDialogContent();

  const handleGenerate = () => {
    onGenerate(context);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{content.title}</DialogTitle>
          <DialogDescription>{content.description}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Textarea
            placeholder={content.placeholder}
            value={context}
            onChange={(e) => setContext(e.target.value)}
            className="min-h-[150px]"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isGenerating}>
            Cancel
          </Button>
          <Button onClick={handleGenerate} disabled={isGenerating}>
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Wand2 className="mr-2 h-4 w-4" />
                Generate
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
