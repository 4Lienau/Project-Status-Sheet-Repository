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

interface ProjectFormProps {
  initialData?: {
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
  };
  onSubmit: (data: any) => void;
}

const defaultFormData = {
  title: "",
  description: "",
  valueStatement: "",
  status: "active" as const,
  health_calculation_type: "automatic" as const,
  manual_health_percentage: 0,
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
};

const ProjectForm: React.FC<ProjectFormProps> = ({ initialData, onSubmit }) => {
  const [formData, setFormData] = React.useState(() => ({
    ...defaultFormData,
    ...initialData,
  }));
  const [showSuggestedMilestones, setShowSuggestedMilestones] =
    React.useState(false);
  const [suggestedMilestones, setSuggestedMilestones] = React.useState([]);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleGenerateContent = async (
    type: "description" | "value" | "milestones",
  ) => {
    try {
      if (!formData.title) {
        toast({
          title: "Error",
          description: "Please enter a project title first",
          variant: "destructive",
        });
        return;
      }

      const content = await aiService.generateContent(
        type,
        formData.title,
        formData.description,
      );

      if (type === "milestones") {
        try {
          const parsedMilestones = JSON.parse(content);
          setSuggestedMilestones(parsedMilestones);
          setShowSuggestedMilestones(true);
        } catch (error) {
          console.error("Failed to parse milestones:", error);
          toast({
            title: "Error",
            description: "Failed to generate milestones",
            variant: "destructive",
          });
        }
      } else {
        setFormData((prev) => ({
          ...prev,
          [type === "value" ? "valueStatement" : "description"]: content,
        }));
      }
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to generate ${type}`,
        variant: "destructive",
      });
    }
  };

  const cardClasses =
    "p-4 bg-gradient-to-b from-gray-100/90 to-white/90 backdrop-blur-sm rounded-2xl border border-gray-100/50 shadow-sm";

  return (
    <form onSubmit={handleSubmit} className="max-w-[1200px] mx-auto space-y-3">
      {/* Project Title, Description and Value Statement */}
      <div className={cardClasses}>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Project Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, title: e.target.value }))
              }
              placeholder="Enter project title"
              className="bg-white/50 backdrop-blur-sm border-gray-200/50"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="description">Project Description</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleGenerateContent("description")}
                className="bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-200"
              >
                <Wand2 className="h-4 w-4 mr-2" />
                Use AI to Generate
              </Button>
            </div>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              placeholder="Enter project description"
              className="bg-white/50 backdrop-blur-sm border-gray-200/50 min-h-[120px] resize-y"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="valueStatement">Value Statement</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleGenerateContent("value")}
                className="bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-200"
              >
                <Wand2 className="h-4 w-4 mr-2" />
                Use AI to Generate
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
              className="bg-white/50 backdrop-blur-sm border-gray-200/50 min-h-[120px] resize-y"
            />
          </div>
        </div>
      </div>

      {/* Project Status */}
      <div className={cardClasses}>
        <div className="space-y-2">
          <Label>Project Status</Label>
          <Select
            value={formData.status}
            onValueChange={(value: any) =>
              setFormData((prev) => ({ ...prev, status: value }))
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
      </div>

      {/* Health Calculation */}
      <div className={cardClasses}>
        <div className="space-y-2">
          <Label>Health Calculation</Label>
          <Select
            value={formData.health_calculation_type}
            onValueChange={(value: any) =>
              setFormData((prev) => ({
                ...prev,
                health_calculation_type: value,
              }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select calculation type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="automatic">Automatic</SelectItem>
              <SelectItem value="manual">Manual</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Health Percentage */}
      {formData.health_calculation_type === "manual" && (
        <div className={cardClasses}>
          <div className="space-y-2">
            <Label htmlFor="manual_health_percentage">Health Percentage</Label>
            <Input
              id="manual_health_percentage"
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
              className="bg-white/50 backdrop-blur-sm border-gray-200/50"
            />
          </div>
        </div>
      )}

      {/* Budget & Links */}
      <div className={cardClasses}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="budget_total">Total Budget</Label>
              <Input
                id="budget_total"
                value={formData.budget.total}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    budget: { ...prev.budget, total: e.target.value },
                  }))
                }
                placeholder="Enter total budget"
                className="bg-white/50 backdrop-blur-sm border-gray-200/50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="budget_actuals">Actuals</Label>
              <Input
                id="budget_actuals"
                value={formData.budget.actuals}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    budget: { ...prev.budget, actuals: e.target.value },
                  }))
                }
                placeholder="Enter actuals"
                className="bg-white/50 backdrop-blur-sm border-gray-200/50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="budget_forecast">Forecast</Label>
              <Input
                id="budget_forecast"
                value={formData.budget.forecast}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    budget: { ...prev.budget, forecast: e.target.value },
                  }))
                }
                placeholder="Enter forecast"
                className="bg-white/50 backdrop-blur-sm border-gray-200/50"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="charterLink">Charter Link</Label>
              <Input
                id="charterLink"
                value={formData.charterLink}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    charterLink: e.target.value,
                  }))
                }
                placeholder="Enter charter link"
                className="bg-white/50 backdrop-blur-sm border-gray-200/50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sponsors">Sponsors</Label>
              <Input
                id="sponsors"
                value={formData.sponsors}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, sponsors: e.target.value }))
                }
                placeholder="Enter sponsors"
                className="bg-white/50 backdrop-blur-sm border-gray-200/50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="businessLeads">Business Leads</Label>
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
                className="bg-white/50 backdrop-blur-sm border-gray-200/50"
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
                className="bg-white/50 backdrop-blur-sm border-gray-200/50"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Milestones */}
      <div className={cardClasses}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Milestones</h3>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleGenerateContent("milestones")}
            className="bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-200"
          >
            <Wand2 className="h-4 w-4 mr-2" />
            Use AI to Generate
          </Button>
        </div>

        <div className="space-y-4">
          {formData.milestones.map((milestone, index) => (
            <MilestoneSortableItem
              key={index}
              id={`milestone-${index}`}
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
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              setFormData((prev) => ({
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
            className="bg-white/50 backdrop-blur-sm border-gray-200/50"
          >
            Add Milestone
          </Button>
        </div>
      </div>

      {/* Accomplishments */}
      <div className={cardClasses}>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          Accomplishments
        </h3>
        <div className="space-y-4">
          {formData.accomplishments.map((item, index) => (
            <div key={index} className="flex gap-2">
              <Input
                value={item}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    accomplishments: prev.accomplishments.map((a, i) =>
                      i === index ? e.target.value : a,
                    ),
                  }))
                }
                placeholder="Enter accomplishment"
                className="bg-white/50 backdrop-blur-sm border-gray-200/50"
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
                className="bg-white/50 backdrop-blur-sm border-gray-200/50"
              >
                Remove
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              setFormData((prev) => ({
                ...prev,
                accomplishments: [...prev.accomplishments, ""],
              }))
            }
            className="bg-white/50 backdrop-blur-sm border-gray-200/50"
          >
            Add Accomplishment
          </Button>
        </div>
      </div>

      {/* Next Period Activities */}
      <div className={cardClasses}>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          Next Period Activities
        </h3>
        <div className="space-y-4">
          {formData.nextPeriodActivities.map((item, index) => (
            <div key={index} className="flex gap-2">
              <Input
                value={item}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    nextPeriodActivities: prev.nextPeriodActivities.map(
                      (a, i) => (i === index ? e.target.value : a),
                    ),
                  }))
                }
                placeholder="Enter activity"
                className="bg-white/50 backdrop-blur-sm border-gray-200/50"
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
                className="bg-white/50 backdrop-blur-sm border-gray-200/50"
              >
                Remove
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              setFormData((prev) => ({
                ...prev,
                nextPeriodActivities: [...prev.nextPeriodActivities, ""],
              }))
            }
            className="bg-white/50 backdrop-blur-sm border-gray-200/50"
          >
            Add Activity
          </Button>
        </div>
      </div>

      {/* Risks */}
      <div className={cardClasses}>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Risks</h3>
        <div className="space-y-4">
          {formData.risks.map((item, index) => (
            <div key={index} className="flex gap-2">
              <Input
                value={item}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    risks: prev.risks.map((r, i) =>
                      i === index ? e.target.value : r,
                    ),
                  }))
                }
                placeholder="Enter risk"
                className="bg-white/50 backdrop-blur-sm border-gray-200/50"
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
                className="bg-white/50 backdrop-blur-sm border-gray-200/50"
              >
                Remove
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              setFormData((prev) => ({ ...prev, risks: [...prev.risks, ""] }))
            }
            className="bg-white/50 backdrop-blur-sm border-gray-200/50"
          >
            Add Risk
          </Button>
        </div>
      </div>

      {/* Considerations */}
      <div className={cardClasses}>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          Considerations
        </h3>
        <div className="space-y-4">
          {formData.considerations.map((item, index) => (
            <div key={index} className="flex gap-2">
              <Input
                value={item}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    considerations: prev.considerations.map((c, i) =>
                      i === index ? e.target.value : c,
                    ),
                  }))
                }
                placeholder="Enter consideration"
                className="bg-white/50 backdrop-blur-sm border-gray-200/50"
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
                className="bg-white/50 backdrop-blur-sm border-gray-200/50"
              >
                Remove
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              setFormData((prev) => ({
                ...prev,
                considerations: [...prev.considerations, ""],
              }))
            }
            className="bg-white/50 backdrop-blur-sm border-gray-200/50"
          >
            Add Consideration
          </Button>
        </div>
      </div>

      {/* Submit Button */}
      <div className="sticky bottom-0 bg-gradient-to-t from-white via-white to-transparent pt-6 pb-4 px-4">
        <div className="flex justify-end max-w-[1200px] mx-auto">
          <Button
            type="submit"
            size="lg"
            className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 rounded-xl px-8"
          >
            Save Project
          </Button>
        </div>
      </div>

      {/* Suggested Milestones Dialog */}
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
