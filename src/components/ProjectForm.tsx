import React, { useMemo } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Save, Wand2, Loader2 } from "lucide-react";
import { MilestoneSortableItem } from "./MilestoneSortableItem";
import { SuggestedMilestones } from "./SuggestedMilestones";
import { useToast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { aiService } from "@/lib/services/aiService";

interface ProjectData {
  title: string;
  description?: string;
  valueStatement?: string;
  status?: "active" | "on_hold" | "completed" | "cancelled" | "draft";
  budget: {
    total: string;
    actuals: string;
    forecast: string;
  };
  charterLink?: string;
  sponsors?: string;
  businessLeads?: string;
  projectManager?: string;
  accomplishments: string[];
  nextPeriodActivities: string[];
  milestones: Array<{
    date: string;
    milestone: string;
    owner: string;
    completion: number;
    status: "green" | "yellow" | "red";
  }>;
  risks: string[];
  considerations: string[];
}

interface ProjectFormProps {
  initialData?: ProjectData;
  onSubmit: (data: ProjectData) => void;
}

const ProjectForm: React.FC<ProjectFormProps> = ({ initialData, onSubmit }) => {
  const formatCurrency = (value: string) => {
    const cleanValue = value.replace(/[^0-9.]/g, "");
    const numValue = parseFloat(cleanValue);

    if (!isNaN(numValue)) {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
        .format(numValue)
        .replace("$", "");
    }
    return "0.00";
  };

  const [formData, setFormData] = React.useState<ProjectData>(
    initialData || {
      title: "",
      description: "",
      valueStatement: "",
      status: "active",
      budget: {
        total: formatCurrency("0"),
        actuals: formatCurrency("0"),
        forecast: formatCurrency("0"),
      },
      charterLink: "",
      sponsors: "",
      businessLeads: "",
      projectManager: "",
      accomplishments: [""],
      nextPeriodActivities: [""],
      milestones: [
        { date: "", milestone: "", owner: "", completion: 0, status: "green" },
      ],
      risks: [""],
      considerations: [""],
    },
  );

  const [localFormData, setLocalFormData] = React.useState(formData);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [showSuggestedMilestones, setShowSuggestedMilestones] =
    React.useState(false);
  const [suggestedMilestones, setSuggestedMilestones] = React.useState([]);
  const { toast } = useToast();

  // Only set initial data, don't sync with formData changes
  React.useEffect(() => {
    if (initialData) {
      setLocalFormData(initialData);
    }
  }, [initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!localFormData.title.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(localFormData);
      // Don't update formData here since we don't need to sync anymore
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGenerateContent = async (
    type: "description" | "value" | "milestones",
  ) => {
    if (!localFormData.title.trim()) {
      toast({
        title: "Error",
        description: "Please enter a project title first",
        variant: "destructive",
      });
      return;
    }

    if (
      (type === "description" && localFormData.description?.trim()) ||
      (type === "value" && localFormData.valueStatement?.trim())
    ) {
      const shouldReplace = window.confirm(
        `This will replace your existing ${type === "description" ? "project description" : "value statement"}. Do you want to continue?`,
      );
      if (!shouldReplace) return;
    }

    setIsGenerating(true);
    try {
      const content = await aiService.generateContent(
        type,
        localFormData.title,
        localFormData.description,
      );

      if (type === "milestones") {
        let milestones;
        try {
          milestones = JSON.parse(content.trim());
          if (!Array.isArray(milestones)) {
            throw new Error("Invalid response structure");
          }
          setSuggestedMilestones(milestones);
          setShowSuggestedMilestones(true);
        } catch (parseError) {
          console.error("JSON Parse Error:", parseError);
          throw new Error("Failed to parse AI response");
        }
      } else {
        setLocalFormData({
          ...localFormData,
          [type === "description" ? "description" : "valueStatement"]: content,
        });
      }

      toast({
        title: "Success",
        description: `Generated ${type === "description" ? "project description" : type === "value" ? "value statement" : "milestones"}`,
        className: "bg-green-50 border-green-200",
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: `Failed to generate ${type === "description" ? "description" : type === "value" ? "value statement" : "milestones"}`,
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  return (
    <Card className="p-6 bg-card">
      <form
        onSubmit={handleSubmit}
        className="space-y-6"
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
          }
        }}
      >
        <div className="flex justify-end">
          <Button
            type="submit"
            className="flex items-center gap-2"
            disabled={isSubmitting}
          >
            <Save className="h-4 w-4" />
            {isSubmitting
              ? "Saving..."
              : initialData
                ? "Save Changes"
                : "Create Project"}
          </Button>
        </div>

        <div className="space-y-4">
          {/* Project Title */}
          <div>
            <Label className="text-blue-800">Project Title *</Label>
            <Input
              value={localFormData.title}
              onChange={(e) =>
                setLocalFormData({ ...localFormData, title: e.target.value })
              }
              required
              placeholder="Enter project title"
            />
          </div>

          {/* Project Description */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <Label className="text-blue-800">Project Description</Label>
              <Button
                type="button"
                size="sm"
                className="bg-gradient-to-r from-green-500 to-green-700 text-white hover:from-green-600 hover:to-green-800 shadow-lg hover:shadow-green-500/25 transition-all duration-200 flex items-center gap-2 w-[200px] justify-center"
                onClick={() => handleGenerateContent("description")}
                disabled={isSubmitting || isGenerating}
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Wand2 className="h-4 w-4" />
                )}
                AI Generate Description
              </Button>
            </div>
            <textarea
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={localFormData.description}
              onChange={(e) =>
                setLocalFormData({
                  ...localFormData,
                  description: e.target.value,
                })
              }
              placeholder="Enter a brief description of the project"
            />
          </div>

          {/* Value Statement */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <Label className="text-blue-800">Value Statement</Label>
              <Button
                type="button"
                size="sm"
                className="bg-gradient-to-r from-green-500 to-green-700 text-white hover:from-green-600 hover:to-green-800 shadow-lg hover:shadow-green-500/25 transition-all duration-200 flex items-center gap-2 w-[200px] justify-center"
                onClick={() => handleGenerateContent("value")}
                disabled={isSubmitting || isGenerating}
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Wand2 className="h-4 w-4" />
                )}
                AI Generate Value
              </Button>
            </div>
            <textarea
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={localFormData.valueStatement}
              onChange={(e) =>
                setLocalFormData({
                  ...localFormData,
                  valueStatement: e.target.value,
                })
              }
              placeholder="Enter the business value, ROI, and strategic importance of this project"
            />
          </div>

          {/* Project Status */}
          <div>
            <Label className="text-blue-800">Project Status</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              value={localFormData.status}
              onChange={(e) =>
                setLocalFormData({
                  ...localFormData,
                  status: e.target.value as typeof localFormData.status,
                })
              }
            >
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="on_hold">On Hold</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Budget Section */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label className="text-blue-800">Total Budget</Label>
              <Input
                type="text"
                placeholder="0.00"
                value={localFormData.budget.total}
                onChange={(e) =>
                  setLocalFormData({
                    ...localFormData,
                    budget: { ...localFormData.budget, total: e.target.value },
                  })
                }
                onBlur={(e) =>
                  setLocalFormData({
                    ...localFormData,
                    budget: {
                      ...localFormData.budget,
                      total: formatCurrency(e.target.value),
                    },
                  })
                }
              />
            </div>
            <div>
              <Label className="text-blue-800">Actuals</Label>
              <Input
                type="text"
                placeholder="0.00"
                value={localFormData.budget.actuals}
                onChange={(e) =>
                  setLocalFormData({
                    ...localFormData,
                    budget: {
                      ...localFormData.budget,
                      actuals: e.target.value,
                    },
                  })
                }
                onBlur={(e) =>
                  setLocalFormData({
                    ...localFormData,
                    budget: {
                      ...localFormData.budget,
                      actuals: formatCurrency(e.target.value),
                    },
                  })
                }
              />
            </div>
            <div>
              <Label className="text-blue-800">Forecast</Label>
              <Input
                type="text"
                placeholder="0.00"
                value={localFormData.budget.forecast}
                onChange={(e) =>
                  setLocalFormData({
                    ...localFormData,
                    budget: {
                      ...localFormData.budget,
                      forecast: e.target.value,
                    },
                  })
                }
                onBlur={(e) =>
                  setLocalFormData({
                    ...localFormData,
                    budget: {
                      ...localFormData.budget,
                      forecast: formatCurrency(e.target.value),
                    },
                  })
                }
              />
            </div>
          </div>

          {/* Project Links and Team */}
          <div>
            <Label className="text-blue-800">Project Charter Link</Label>
            <Input
              type="url"
              value={localFormData.charterLink}
              onChange={(e) =>
                setLocalFormData({
                  ...localFormData,
                  charterLink: e.target.value,
                })
              }
              placeholder="https://..."
            />
          </div>

          <div>
            <Label className="text-blue-800">Sponsors</Label>
            <Input
              value={localFormData.sponsors}
              onChange={(e) =>
                setLocalFormData({ ...localFormData, sponsors: e.target.value })
              }
              placeholder="Enter sponsors"
            />
          </div>

          <div>
            <Label className="text-blue-800">Business Lead(s)</Label>
            <Input
              value={localFormData.businessLeads}
              onChange={(e) =>
                setLocalFormData({
                  ...localFormData,
                  businessLeads: e.target.value,
                })
              }
              placeholder="Enter business leads"
            />
          </div>

          <div>
            <Label className="text-blue-800">Project Manager</Label>
            <Input
              value={localFormData.projectManager}
              onChange={(e) =>
                setLocalFormData({
                  ...localFormData,
                  projectManager: e.target.value,
                })
              }
              placeholder="Enter project manager"
            />
          </div>

          {/* Milestones */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label className="text-blue-800 text-lg">Milestones</Label>
              <Button
                type="button"
                size="sm"
                className="bg-gradient-to-r from-green-500 to-green-700 text-white hover:from-green-600 hover:to-green-800 shadow-lg hover:shadow-green-500/25 transition-all duration-200 flex items-center gap-2 w-[200px] justify-center"
                onClick={() => handleGenerateContent("milestones")}
                disabled={isSubmitting || isGenerating}
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Wand2 className="h-4 w-4" />
                )}
                AI Generate Milestones
              </Button>
            </div>
            <div className="grid grid-cols-4 gap-2 mb-2">
              <div className="text-sm font-medium text-muted-foreground">
                Date
              </div>
              <div className="text-sm font-medium text-muted-foreground">
                Milestone
              </div>
              <div className="text-sm font-medium text-muted-foreground">
                Owner
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="text-sm font-medium text-muted-foreground">
                  Percent
                </div>
                <div className="text-sm font-medium text-muted-foreground">
                  Status
                </div>
              </div>
            </div>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={({ active, over }) => {
                if (over && active.id !== over.id) {
                  const oldIndex = localFormData.milestones.findIndex(
                    (_, i) => `milestone-${i}` === active.id,
                  );
                  const newIndex = localFormData.milestones.findIndex(
                    (_, i) => `milestone-${i}` === over.id,
                  );

                  const newMilestones = arrayMove(
                    localFormData.milestones,
                    oldIndex,
                    newIndex,
                  );

                  setLocalFormData((prev) => ({
                    ...prev,
                    milestones: newMilestones,
                  }));
                }
              }}
            >
              <SortableContext
                items={localFormData.milestones.map((_, i) => `milestone-${i}`)}
                strategy={verticalListSortingStrategy}
              >
                {localFormData.milestones.map((milestone, index) => (
                  <MilestoneSortableItem
                    key={`milestone-${index}`}
                    id={`milestone-${index}`}
                    milestone={milestone}
                    onUpdate={(values) => {
                      const newMilestones = [...localFormData.milestones];
                      newMilestones[index] = {
                        ...newMilestones[index],
                        ...values,
                      };
                      setLocalFormData((prev) => ({
                        ...prev,
                        milestones: newMilestones,
                      }));
                    }}
                    onDelete={() => {
                      const newMilestones = [...localFormData.milestones];
                      newMilestones.splice(index, 1);
                      setLocalFormData((prev) => ({
                        ...prev,
                        milestones: newMilestones,
                      }));
                    }}
                  />
                ))}
              </SortableContext>
            </DndContext>
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setLocalFormData((prev) => ({
                  ...prev,
                  milestones: [
                    ...prev.milestones,
                    {
                      date: "",
                      milestone: "",
                      owner: "",
                      completion: 0,
                      status: "green",
                    },
                  ],
                }))
              }
            >
              Add Milestone
            </Button>
          </div>

          {/* Accomplishments */}
          <div className="space-y-2">
            <Label className="text-blue-800 text-lg">Accomplishments</Label>
            {localFormData.accomplishments.map((accomplishment, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={accomplishment}
                  onChange={(e) => {
                    const newAccomplishments = [
                      ...localFormData.accomplishments,
                    ];
                    newAccomplishments[index] = e.target.value;
                    setLocalFormData((prev) => ({
                      ...prev,
                      accomplishments: newAccomplishments,
                    }));
                  }}
                  placeholder="Enter accomplishment"
                />
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setLocalFormData((prev) => ({
                  ...prev,
                  accomplishments: [...prev.accomplishments, ""],
                }))
              }
            >
              Add Accomplishment
            </Button>
          </div>

          {/* Next Period's Activities */}
          <div className="space-y-2">
            <Label className="text-blue-800 text-lg">
              Next Period's Activities
            </Label>
            {localFormData.nextPeriodActivities.map((activity, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={activity}
                  onChange={(e) => {
                    const newActivities = [
                      ...localFormData.nextPeriodActivities,
                    ];
                    newActivities[index] = e.target.value;
                    setLocalFormData((prev) => ({
                      ...prev,
                      nextPeriodActivities: newActivities,
                    }));
                  }}
                  placeholder="Enter activity"
                />
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setLocalFormData((prev) => ({
                  ...prev,
                  nextPeriodActivities: [...prev.nextPeriodActivities, ""],
                }))
              }
            >
              Add Activity
            </Button>
          </div>

          {/* Risks */}
          <div className="space-y-2">
            <Label className="text-blue-800 text-lg">Risks and Issues</Label>
            {localFormData.risks.map((risk, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={risk}
                  onChange={(e) => {
                    const newRisks = [...localFormData.risks];
                    newRisks[index] = e.target.value;
                    setLocalFormData((prev) => ({
                      ...prev,
                      risks: newRisks,
                    }));
                  }}
                  placeholder="Enter risk or issue"
                />
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setLocalFormData((prev) => ({
                  ...prev,
                  risks: [...prev.risks, ""],
                }))
              }
            >
              Add Risk
            </Button>
          </div>

          {/* Considerations */}
          <div className="space-y-2">
            <Label className="text-blue-800 text-lg">
              Questions / Items for Consideration
            </Label>
            {localFormData.considerations.map((consideration, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={consideration}
                  onChange={(e) => {
                    const newConsiderations = [...localFormData.considerations];
                    newConsiderations[index] = e.target.value;
                    setLocalFormData((prev) => ({
                      ...prev,
                      considerations: newConsiderations,
                    }));
                  }}
                  placeholder="Enter consideration"
                />
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setLocalFormData((prev) => ({
                  ...prev,
                  considerations: [...prev.considerations, ""],
                }))
              }
            >
              Add Consideration
            </Button>
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            type="submit"
            className="flex items-center gap-2"
            disabled={isSubmitting}
          >
            <Save className="h-4 w-4" />
            {isSubmitting
              ? "Saving..."
              : initialData
                ? "Save Changes"
                : "Create Project"}
          </Button>
        </div>
      </form>

      <SuggestedMilestones
        isOpen={showSuggestedMilestones}
        onClose={() => setShowSuggestedMilestones(false)}
        suggestedMilestones={suggestedMilestones}
        onApply={(selected) => {
          setLocalFormData((prev) => ({
            ...prev,
            milestones: [...prev.milestones, ...selected],
          }));
        }}
      />
      <Toaster />
    </Card>
  );
};

export default ProjectForm;
