import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Wand2 } from "lucide-react";
import { MilestoneSortableItem } from "./MilestoneSortableItem";
import { aiService } from "@/lib/services/aiService";
import { SuggestedMilestones } from "./SuggestedMilestones";
import { useToast } from "./ui/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ProjectFormData {
  title: string;
  description?: string;
  valueStatement?: string;
  status?: "active" | "on_hold" | "completed" | "cancelled" | "draft";
  health_calculation_type?: "automatic" | "manual";
  manual_health_percentage?: number;
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
}

interface ProjectFormProps {
  initialData?: ProjectFormData;
  onSubmit: (data: ProjectFormData) => void;
}

const ProjectForm: React.FC<ProjectFormProps> = ({ initialData, onSubmit }) => {
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);
  const [showSuggestedMilestones, setShowSuggestedMilestones] =
    React.useState(false);
  const [suggestedMilestones, setSuggestedMilestones] = React.useState([]);

  const [formData, setFormData] = React.useState<ProjectFormData>(
    initialData || {
      title: "",
      description: "",
      valueStatement: "",
      status: "active",
      health_calculation_type: "automatic",
      manual_health_percentage: 0,
      budget: {
        total: "0.00",
        actuals: "0.00",
        forecast: "0.00",
      },
      charterLink: "",
      sponsors: "",
      businessLeads: "",
      projectManager: "",
      milestones: [
        {
          date: new Date().toISOString().split("T")[0],
          milestone: "",
          owner: "",
          completion: 0,
          status: "green",
        },
      ],
      accomplishments: [""],
      nextPeriodActivities: [""],
      risks: [""],
      considerations: [""],
    },
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleGenerateDescription = async () => {
    if (!formData.title) {
      toast({
        title: "Error",
        description: "Please enter a project title first",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const description = await aiService.generateContent(
        "description",
        formData.title,
      );
      setFormData((prev) => ({ ...prev, description }));
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate description",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateValue = async () => {
    if (!formData.title) {
      toast({
        title: "Error",
        description: "Please enter a project title first",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const value = await aiService.generateContent(
        "value",
        formData.title,
        formData.description,
      );
      setFormData((prev) => ({ ...prev, valueStatement: value }));
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate value statement",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateMilestones = async () => {
    if (!formData.title) {
      toast({
        title: "Error",
        description: "Please enter a project title first",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const milestonesJson = await aiService.generateContent(
        "milestones",
        formData.title,
        formData.description,
      );
      const milestones = JSON.parse(milestonesJson);
      setSuggestedMilestones(milestones);
      setShowSuggestedMilestones(true);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate milestones",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-[1200px] mx-auto">
      {/* Project Overview */}
      <div className="space-y-6 p-6 bg-gradient-to-b from-gray-50/80 to-white/80 rounded-2xl border border-gray-100/20 shadow-sm backdrop-blur-sm">
        <h2 className="text-xl font-semibold text-gray-900">
          Project Overview
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="title">Project Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, title: e.target.value }))
              }
              placeholder="Enter project title"
              className="bg-gradient-to-b from-gray-50/50 to-white/50"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Project Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value) =>
                setFormData((prev) => ({
                  ...prev,
                  status: value as typeof formData.status,
                }))
              }
            >
              <SelectTrigger className="bg-gradient-to-b from-gray-50/50 to-white/50">
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
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label htmlFor="description">Project Description</Label>
            <Button
              type="button"
              onClick={handleGenerateDescription}
              disabled={loading}
              className="bg-gradient-to-r from-blue-500/90 to-blue-600/90 text-white hover:from-blue-600/90 hover:to-blue-700/90 shadow-sm hover:shadow-md transition-all duration-200 flex items-center gap-2 w-[200px] justify-center rounded-xl border border-blue-400/20 backdrop-blur-sm"
            >
              <Wand2 className="w-4 h-4" />
              {loading ? "Generating..." : "Generate with AI"}
            </Button>
          </div>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, description: e.target.value }))
            }
            placeholder="Enter project description"
            className="h-32 bg-gradient-to-b from-gray-50/50 to-white/50"
          />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label htmlFor="valueStatement">Value Statement</Label>
            <Button
              type="button"
              onClick={handleGenerateValue}
              disabled={loading}
              className="bg-gradient-to-r from-blue-500/90 to-blue-600/90 text-white hover:from-blue-600/90 hover:to-blue-700/90 shadow-sm hover:shadow-md transition-all duration-200 flex items-center gap-2 w-[200px] justify-center rounded-xl border border-blue-400/20 backdrop-blur-sm"
            >
              <Wand2 className="w-4 h-4" />
              {loading ? "Generating..." : "Generate with AI"}
            </Button>
          </div>
          <Textarea
            id="valueStatement"
            value={formData.valueStatement}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                valueStatement: e.target.value,
              }))
            }
            placeholder="Enter value statement"
            className="h-32 bg-gradient-to-b from-gray-50/50 to-white/50"
          />
        </div>
      </div>

      {/* Budget Section */}
      <div className="space-y-6 p-6 bg-gradient-to-b from-gray-50/80 to-white/80 rounded-2xl border border-gray-100/20 shadow-sm backdrop-blur-sm">
        <h2 className="text-xl font-semibold text-gray-900">
          Budget Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <Label htmlFor="budgetTotal">Total Budget</Label>
            <Input
              id="budgetTotal"
              value={formData.budget.total}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  budget: { ...prev.budget, total: e.target.value },
                }))
              }
              placeholder="Enter total budget"
              className="bg-gradient-to-b from-gray-50/50 to-white/50"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="budgetActuals">Actuals</Label>
            <Input
              id="budgetActuals"
              value={formData.budget.actuals}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  budget: { ...prev.budget, actuals: e.target.value },
                }))
              }
              placeholder="Enter actuals"
              className="bg-gradient-to-b from-gray-50/50 to-white/50"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="budgetForecast">Forecast</Label>
            <Input
              id="budgetForecast"
              value={formData.budget.forecast}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  budget: { ...prev.budget, forecast: e.target.value },
                }))
              }
              placeholder="Enter forecast"
              className="bg-gradient-to-b from-gray-50/50 to-white/50"
            />
          </div>
        </div>
      </div>

      {/* Project Links */}
      <div className="space-y-6 p-6 bg-gradient-to-b from-gray-50/80 to-white/80 rounded-2xl border border-gray-100/20 shadow-sm backdrop-blur-sm">
        <h2 className="text-xl font-semibold text-gray-900">Project Links</h2>
        <div className="space-y-2">
          <Label htmlFor="charterLink">Charter Link</Label>
          <Input
            id="charterLink"
            value={formData.charterLink}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, charterLink: e.target.value }))
            }
            placeholder="Enter charter link"
            className="bg-gradient-to-b from-gray-50/50 to-white/50"
          />
        </div>
      </div>

      {/* Team Information */}
      <div className="space-y-6 p-6 bg-gradient-to-b from-gray-50/80 to-white/80 rounded-2xl border border-gray-100/20 shadow-sm backdrop-blur-sm">
        <h2 className="text-xl font-semibold text-gray-900">
          Team Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <Label htmlFor="sponsors">Sponsors</Label>
            <Input
              id="sponsors"
              value={formData.sponsors}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, sponsors: e.target.value }))
              }
              placeholder="Enter sponsors"
              className="bg-gradient-to-b from-gray-50/50 to-white/50"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="businessLeads">Business Lead(s)</Label>
            <Input
              id="businessLeads"
              value={formData.businessLeads}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  businessLeads: e.target.value,
                }))
              }
              placeholder="Enter business leads"
              className="bg-gradient-to-b from-gray-50/50 to-white/50"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="projectManager">Project Manager</Label>
            <Input
              id="projectManager"
              value={formData.projectManager}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  projectManager: e.target.value,
                }))
              }
              placeholder="Enter project manager"
              className="bg-gradient-to-b from-gray-50/50 to-white/50"
            />
          </div>
        </div>
      </div>

      {/* Project Health */}
      <div className="space-y-6 p-6 bg-gradient-to-b from-gray-50/80 to-white/80 rounded-2xl border border-gray-100/20 shadow-sm backdrop-blur-sm">
        <h2 className="text-xl font-semibold text-gray-900">Project Health</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>Health Calculation</Label>
            <Select
              value={formData.health_calculation_type}
              onValueChange={(value) =>
                setFormData((prev) => ({
                  ...prev,
                  health_calculation_type: value as "automatic" | "manual",
                }))
              }
            >
              <SelectTrigger className="bg-gradient-to-b from-gray-50/50 to-white/50">
                <SelectValue placeholder="Select calculation type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="automatic">
                  Automatic (from milestones)
                </SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.health_calculation_type === "manual" && (
            <div className="space-y-2">
              <Label htmlFor="manualHealthPercentage">Health Percentage</Label>
              <Input
                id="manualHealthPercentage"
                type="number"
                min="0"
                max="100"
                value={formData.manual_health_percentage}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    manual_health_percentage: Number(e.target.value),
                  }))
                }
                placeholder="Enter health percentage"
                className="bg-gradient-to-b from-gray-50/50 to-white/50"
              />
            </div>
          )}
        </div>
      </div>

      {/* Milestones */}
      <div className="space-y-6 p-6 bg-gradient-to-b from-gray-50/80 to-white/80 rounded-2xl border border-gray-100/20 shadow-sm backdrop-blur-sm">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">Milestones</h2>
          <div className="space-x-2">
            <Button
              type="button"
              onClick={handleGenerateMilestones}
              disabled={loading}
              className="bg-gradient-to-r from-blue-500/90 to-blue-600/90 text-white hover:from-blue-600/90 hover:to-blue-700/90 shadow-sm hover:shadow-md transition-all duration-200 flex items-center gap-2 w-[200px] justify-center rounded-xl border border-blue-400/20 backdrop-blur-sm"
            >
              <Wand2 className="w-4 h-4" />
              {loading ? "Generating..." : "Generate with AI"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setFormData((prev) => ({
                  ...prev,
                  milestones: [
                    ...prev.milestones,
                    {
                      date: new Date().toISOString().split("T")[0],
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
        </div>

        <div className="space-y-4">
          {formData.milestones.map((milestone, index) => (
            <MilestoneSortableItem
              key={index}
              id={index.toString()}
              milestone={milestone}
              onUpdate={(values) =>
                setFormData((prev) => ({
                  ...prev,
                  milestones: prev.milestones.map((m, i) =>
                    i === index ? { ...m, ...values } : m,
                  ),
                }))
              }
              onDelete={() =>
                setFormData((prev) => ({
                  ...prev,
                  milestones: prev.milestones.filter((_, i) => i !== index),
                }))
              }
            />
          ))}
        </div>
      </div>

      {/* Accomplishments */}
      <div className="space-y-6 p-6 bg-gradient-to-b from-gray-50/80 to-white/80 rounded-2xl border border-gray-100/20 shadow-sm backdrop-blur-sm">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">
            Accomplishments
          </h2>
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              setFormData((prev) => ({
                ...prev,
                accomplishments: [...prev.accomplishments, ""],
              }))
            }
          >
            Add Accomplishment
          </Button>
        </div>

        <div className="space-y-4">
          {formData.accomplishments.map((accomplishment, index) => (
            <div key={index} className="flex gap-2">
              <Input
                value={accomplishment}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    accomplishments: prev.accomplishments.map((a, i) =>
                      i === index ? e.target.value : a,
                    ),
                  }))
                }
                placeholder="Enter accomplishment"
                className="bg-gradient-to-b from-gray-50/50 to-white/50"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setFormData((prev) => ({
                    ...prev,
                    accomplishments: prev.accomplishments.filter(
                      (_, i) => i !== index,
                    ),
                  }))
                }
              >
                Remove
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Next Period Activities */}
      <div className="space-y-6 p-6 bg-gradient-to-b from-gray-50/80 to-white/80 rounded-2xl border border-gray-100/20 shadow-sm backdrop-blur-sm">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">
            Next Period Activities
          </h2>
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              setFormData((prev) => ({
                ...prev,
                nextPeriodActivities: [...prev.nextPeriodActivities, ""],
              }))
            }
          >
            Add Activity
          </Button>
        </div>

        <div className="space-y-4">
          {formData.nextPeriodActivities.map((activity, index) => (
            <div key={index} className="flex gap-2">
              <Input
                value={activity}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    nextPeriodActivities: prev.nextPeriodActivities.map(
                      (a, i) => (i === index ? e.target.value : a),
                    ),
                  }))
                }
                placeholder="Enter activity"
                className="bg-gradient-to-b from-gray-50/50 to-white/50"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setFormData((prev) => ({
                    ...prev,
                    nextPeriodActivities: prev.nextPeriodActivities.filter(
                      (_, i) => i !== index,
                    ),
                  }))
                }
              >
                Remove
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Risks */}
      <div className="space-y-6 p-6 bg-gradient-to-b from-gray-50/80 to-white/80 rounded-2xl border border-gray-100/20 shadow-sm backdrop-blur-sm">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">Risks</h2>
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              setFormData((prev) => ({
                ...prev,
                risks: [...prev.risks, ""],
              }))
            }
          >
            Add Risk
          </Button>
        </div>

        <div className="space-y-4">
          {formData.risks.map((risk, index) => (
            <div key={index} className="flex gap-2">
              <Input
                value={risk}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    risks: prev.risks.map((r, i) =>
                      i === index ? e.target.value : r,
                    ),
                  }))
                }
                placeholder="Enter risk"
                className="bg-gradient-to-b from-gray-50/50 to-white/50"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setFormData((prev) => ({
                    ...prev,
                    risks: prev.risks.filter((_, i) => i !== index),
                  }))
                }
              >
                Remove
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Considerations */}
      <div className="space-y-6 p-6 bg-gradient-to-b from-gray-50/80 to-white/80 rounded-2xl border border-gray-100/20 shadow-sm backdrop-blur-sm">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">
            Considerations
          </h2>
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              setFormData((prev) => ({
                ...prev,
                considerations: [...prev.considerations, ""],
              }))
            }
          >
            Add Consideration
          </Button>
        </div>

        <div className="space-y-4">
          {formData.considerations.map((consideration, index) => (
            <div key={index} className="flex gap-2">
              <Input
                value={consideration}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    considerations: prev.considerations.map((c, i) =>
                      i === index ? e.target.value : c,
                    ),
                  }))
                }
                placeholder="Enter consideration"
                className="bg-gradient-to-b from-gray-50/50 to-white/50"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setFormData((prev) => ({
                    ...prev,
                    considerations: prev.considerations.filter(
                      (_, i) => i !== index,
                    ),
                  }))
                }
              >
                Remove
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end">
        <Button
          type="submit"
          size="lg"
          className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5"
        >
          Save Project
        </Button>
      </div>

      <SuggestedMilestones
        isOpen={showSuggestedMilestones}
        onClose={() => setShowSuggestedMilestones(false)}
        suggestedMilestones={suggestedMilestones}
        onApply={(selectedMilestones) =>
          setFormData((prev) => ({
            ...prev,
            milestones: [...prev.milestones, ...selectedMilestones],
          }))
        }
      />
    </form>
  );
};

export default ProjectForm;
