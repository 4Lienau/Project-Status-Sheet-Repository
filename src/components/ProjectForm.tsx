import React, { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, Wand2 } from "lucide-react";
import { SuggestedMilestones } from "./SuggestedMilestones";

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
  const [showSuggestedMilestones, setShowSuggestedMilestones] = useState(false);
  const [suggestedMilestones, setSuggestedMilestones] = useState([]);
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
      const response = await fetch("/.netlify/functions/generate", {
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

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate content");
      }

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

  const handleGenerateValueStatement = async () => {
    if (!formData.title.trim()) {
      toast({
        title: "Error",
        description: "Please enter a project title first",
        variant: "destructive",
      });
      return;
    }

    if (formData.valueStatement?.trim()) {
      const shouldReplace = window.confirm(
        "This will replace your existing value statement. Do you want to continue?",
      );
      if (!shouldReplace) return;
    }

    setIsGenerating(true);
    try {
      const valueStatement = await generateContent(
        formData.title + "\n" + formData.description,
        "You are a professional project manager. Generate a concise value statement that highlights the business value and expected ROI of this project. Return ONLY the value statement text, no other content or formatting.",
      );

      setFormData({
        ...formData,
        valueStatement: valueStatement,
      });

      toast({
        title: "Success",
        description: "Generated value statement",
        className: "bg-green-50 border-green-200",
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to generate value statement",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateMilestones = async () => {
    if (!formData.title.trim() || !formData.description?.trim()) {
      toast({
        title: "Error",
        description: "Please enter a project title and description first",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const milestonesText = await generateContent(
        `Project Title: ${formData.title}\nDescription: ${formData.description}`,
        "You are a professional project manager. Generate a list of key project milestones with realistic dates, owners, and initial status. Format each milestone as a JSON object with date (YYYY-MM-DD), milestone (description), owner (name), completion (0), and status (green/yellow/red). Return ONLY a JSON array of these objects, no other text.",
      );

      try {
        const parsedMilestones = JSON.parse(milestonesText);
        setSuggestedMilestones(parsedMilestones);
        setShowSuggestedMilestones(true);
      } catch (parseError) {
        console.error("Failed to parse milestones:", parseError);
        toast({
          title: "Error",
          description: "Failed to parse generated milestones",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to generate milestones",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(formData);
      }}
      className="space-y-8"
    >
      <Card className="p-6 space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Project Title</Label>
            <Input
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              required
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label>Description</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="flex items-center gap-2 hover:bg-purple-50 hover:text-purple-600 transition-colors"
                onClick={handleGenerateDescription}
                disabled={isGenerating}
              >
                <Wand2 className="h-4 w-4" />
                {isGenerating ? "Generating..." : "Generate with AI"}
              </Button>
            </div>
            <Textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="h-32"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label>Value Statement</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="flex items-center gap-2 hover:bg-purple-50 hover:text-purple-600 transition-colors"
                onClick={handleGenerateValueStatement}
                disabled={isGenerating}
              >
                <Wand2 className="h-4 w-4" />
                {isGenerating ? "Generating..." : "Generate with AI"}
              </Button>
            </div>
            <Textarea
              value={formData.valueStatement}
              onChange={(e) =>
                setFormData({ ...formData, valueStatement: e.target.value })
              }
              className="h-32"
            />
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value) =>
                setFormData({ ...formData, status: value as any })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="on_hold">On Hold</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Budget Total</Label>
              <Input
                type="text"
                value={formData.budget.total}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    budget: { ...formData.budget, total: e.target.value },
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Actuals</Label>
              <Input
                type="text"
                value={formData.budget.actuals}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    budget: { ...formData.budget, actuals: e.target.value },
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Forecast</Label>
              <Input
                type="text"
                value={formData.budget.forecast}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    budget: { ...formData.budget, forecast: e.target.value },
                  })
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Charter Link</Label>
            <Input
              type="url"
              value={formData.charterLink}
              onChange={(e) =>
                setFormData({ ...formData, charterLink: e.target.value })
              }
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Sponsors</Label>
              <Input
                value={formData.sponsors}
                onChange={(e) =>
                  setFormData({ ...formData, sponsors: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Business Leads</Label>
              <Input
                value={formData.businessLeads}
                onChange={(e) =>
                  setFormData({ ...formData, businessLeads: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Project Manager</Label>
              <Input
                value={formData.projectManager}
                onChange={(e) =>
                  setFormData({ ...formData, projectManager: e.target.value })
                }
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Label>Milestones</Label>
              <div className="space-x-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="flex items-center gap-2 hover:bg-purple-50 hover:text-purple-600 transition-colors"
                  onClick={handleGenerateMilestones}
                  disabled={isGenerating}
                >
                  <Wand2 className="h-4 w-4" />
                  {isGenerating ? "Generating..." : "Generate with AI"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="bg-white hover:bg-gray-50 shadow-sm hover:shadow transition-all"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      milestones: [
                        ...formData.milestones,
                        {
                          date: "",
                          milestone: "",
                          owner: "",
                          completion: 0,
                          status: "green",
                        },
                      ],
                    })
                  }
                >
                  Add Milestone
                </Button>
              </div>
            </div>
            {formData.milestones.map((milestone, index) => (
              <div
                key={index}
                className="grid grid-cols-[1fr,2fr,1fr,1fr,auto] gap-2"
              >
                <Input
                  type="date"
                  value={milestone.date}
                  onChange={(e) => {
                    const newMilestones = [...formData.milestones];
                    newMilestones[index] = {
                      ...milestone,
                      date: e.target.value,
                    };
                    setFormData({ ...formData, milestones: newMilestones });
                  }}
                />
                <Input
                  value={milestone.milestone}
                  onChange={(e) => {
                    const newMilestones = [...formData.milestones];
                    newMilestones[index] = {
                      ...milestone,
                      milestone: e.target.value,
                    };
                    setFormData({ ...formData, milestones: newMilestones });
                  }}
                  placeholder="Milestone description"
                />
                <Input
                  value={milestone.owner}
                  onChange={(e) => {
                    const newMilestones = [...formData.milestones];
                    newMilestones[index] = {
                      ...milestone,
                      owner: e.target.value,
                    };
                    setFormData({ ...formData, milestones: newMilestones });
                  }}
                  placeholder="Owner"
                />
                <Select
                  value={milestone.status}
                  onValueChange={(value) => {
                    const newMilestones = [...formData.milestones];
                    newMilestones[index] = {
                      ...milestone,
                      status: value as any,
                    };
                    setFormData({ ...formData, milestones: newMilestones });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="green">On Track</SelectItem>
                    <SelectItem value="yellow">At Risk</SelectItem>
                    <SelectItem value="red">Off Track</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="hover:bg-red-50 hover:text-red-600 transition-colors"
                  onClick={() => {
                    const newMilestones = formData.milestones.filter(
                      (_, i) => i !== index,
                    );
                    setFormData({ ...formData, milestones: newMilestones });
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Label>Accomplishments</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="bg-white hover:bg-gray-50 shadow-sm hover:shadow transition-all"
                onClick={() =>
                  setFormData({
                    ...formData,
                    accomplishments: [...formData.accomplishments, ""],
                  })
                }
              >
                Add Accomplishment
              </Button>
            </div>
            {formData.accomplishments.map((accomplishment, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={accomplishment}
                  onChange={(e) => {
                    const newAccomplishments = [...formData.accomplishments];
                    newAccomplishments[index] = e.target.value;
                    setFormData({
                      ...formData,
                      accomplishments: newAccomplishments,
                    });
                  }}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="hover:bg-red-50 hover:text-red-600 transition-colors"
                  onClick={() => {
                    const newAccomplishments = formData.accomplishments.filter(
                      (_, i) => i !== index,
                    );
                    setFormData({
                      ...formData,
                      accomplishments: newAccomplishments,
                    });
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Label>Next Period Activities</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="bg-white hover:bg-gray-50 shadow-sm hover:shadow transition-all"
                onClick={() =>
                  setFormData({
                    ...formData,
                    nextPeriodActivities: [
                      ...formData.nextPeriodActivities,
                      "",
                    ],
                  })
                }
              >
                Add Activity
              </Button>
            </div>
            {formData.nextPeriodActivities.map((activity, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={activity}
                  onChange={(e) => {
                    const newActivities = [...formData.nextPeriodActivities];
                    newActivities[index] = e.target.value;
                    setFormData({
                      ...formData,
                      nextPeriodActivities: newActivities,
                    });
                  }}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="hover:bg-red-50 hover:text-red-600 transition-colors"
                  onClick={() => {
                    const newActivities = formData.nextPeriodActivities.filter(
                      (_, i) => i !== index,
                    );
                    setFormData({
                      ...formData,
                      nextPeriodActivities: newActivities,
                    });
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Label>Risks</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="bg-white hover:bg-gray-50 shadow-sm hover:shadow transition-all"
                onClick={() =>
                  setFormData({
                    ...formData,
                    risks: [...formData.risks, ""],
                  })
                }
              >
                Add Risk
              </Button>
            </div>
            {formData.risks.map((risk, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={risk}
                  onChange={(e) => {
                    const newRisks = [...formData.risks];
                    newRisks[index] = e.target.value;
                    setFormData({ ...formData, risks: newRisks });
                  }}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="hover:bg-red-50 hover:text-red-600 transition-colors"
                  onClick={() => {
                    const newRisks = formData.risks.filter(
                      (_, i) => i !== index,
                    );
                    setFormData({ ...formData, risks: newRisks });
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Label>Considerations</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="bg-white hover:bg-gray-50 shadow-sm hover:shadow transition-all"
                onClick={() =>
                  setFormData({
                    ...formData,
                    considerations: [...formData.considerations, ""],
                  })
                }
              >
                Add Consideration
              </Button>
            </div>
            {formData.considerations.map((consideration, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={consideration}
                  onChange={(e) => {
                    const newConsiderations = [...formData.considerations];
                    newConsiderations[index] = e.target.value;
                    setFormData({
                      ...formData,
                      considerations: newConsiderations,
                    });
                  }}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="hover:bg-red-50 hover:text-red-600 transition-colors"
                  onClick={() => {
                    const newConsiderations = formData.considerations.filter(
                      (_, i) => i !== index,
                    );
                    setFormData({
                      ...formData,
                      considerations: newConsiderations,
                    });
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <div className="flex justify-end">
        <Button
          type="submit"
          size="lg"
          className="bg-purple-600 hover:bg-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:-translate-y-0.5"
        >
          Save Project
        </Button>
      </div>

      <SuggestedMilestones
        isOpen={showSuggestedMilestones}
        onClose={() => setShowSuggestedMilestones(false)}
        suggestedMilestones={suggestedMilestones}
        onApply={(selectedMilestones) => {
          setFormData({
            ...formData,
            milestones: [...formData.milestones, ...selectedMilestones],
          });
        }}
      />
    </form>
  );
};

export default ProjectForm;
