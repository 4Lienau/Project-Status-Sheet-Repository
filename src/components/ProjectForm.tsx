import React, { useState } from "react";
import { useToast } from "@/components/ui/use-toast";

export interface ProjectFormProps {
  initialData?: {
    title: string;
    description?: string;
    valueStatement?: string;
    status?: "active" | "on_hold" | "completed" | "cancelled" | "draft";
    budget: {
      total: string;
      actuals: string;
      forecast: string;
    };
    charterLink: string;
    sponsors: string;
    businessLeads: string;
    projectManager: string;
    milestones: Array<{
      date: string;
      milestone: string;
      owner: string;
      completion: number;
      status: "green" | "yellow" | "red";
    }>;
    accomplishments: string[];
    nextPeriodActivities: string[];
    risks: string[];
    considerations: string[];
  };
  onSubmit: (data: ProjectFormProps["initialData"]) => void;
}

const ProjectForm: React.FC<ProjectFormProps> = ({ initialData, onSubmit }) => {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [formData, setFormData] = useState(
    initialData || {
      title: "",
      description: "",
      valueStatement: "",
      status: "active" as const,
      budget: {
        total: "0",
        actuals: "0",
        forecast: "0",
      },
      charterLink: "",
      sponsors: "",
      businessLeads: "",
      projectManager: "",
      milestones: [],
      accomplishments: [],
      nextPeriodActivities: [],
      risks: [],
      considerations: [],
    },
  );

  const generateContent = async (prompt: string, systemPrompt: string) => {
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [
            {
              role: "system",
              content: systemPrompt,
            },
            {
              role: "user",
              content: prompt,
            },
          ],
        }),
      });

      if (!response.ok) throw new Error("Failed to generate content");

      const data = await response.json();
      return data.choices[0].message.content.trim();
    } catch (error) {
      console.error("Error generating content:", error);
      throw error;
    }
  };

  const handleGenerateDescription = async () => {
    if (!formData.title.trim()) {
      toast({
        title: "Error",
        description: "Please enter a project title first",
        variant: "destructive",
      });
      return;
    }

    if (formData.description?.trim()) {
      const shouldReplace = window.confirm(
        "This will replace your existing project description. Do you want to continue?",
      );
      if (!shouldReplace) return;
    }

    setIsGenerating(true);
    try {
      const description = await generateContent(
        formData.title,
        "You are a professional project manager. Generate a concise but detailed project description focusing on purpose, goals, and expected outcomes based on the project title. Return ONLY the description text, no other content or formatting.",
      );

      setFormData({
        ...formData,
        description: description,
      });

      toast({
        title: "Success",
        description: "Generated project description",
        className: "bg-green-50 border-green-200",
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to generate description",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div>
      {/* Form implementation */}
      <div>Form implementation goes here</div>
    </div>
  );
};

export default ProjectForm;
