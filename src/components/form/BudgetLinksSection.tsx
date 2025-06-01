import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import UserSelectionInput from "@/components/ui/user-selection-input";

interface BudgetLinksSectionProps {
  formData: any;
  setFormData: (updater: (prev: any) => any) => void;
}

const BudgetLinksSection: React.FC<BudgetLinksSectionProps> = ({
  formData,
  setFormData,
}) => {
  return (
    <TooltipProvider>
      <div className="flex items-center gap-1 mb-4">
        <h3 className="text-2xl font-bold text-white">Budget & Links</h3>
        <Tooltip>
          <TooltipTrigger asChild>
            <Info className="h-4 w-4 text-muted-foreground cursor-help" />
          </TooltipTrigger>
          <TooltipContent>
            <p className="max-w-xs">
              Enter budget information and important links related to the
              project.
            </p>
          </TooltipContent>
        </Tooltip>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-gray-100 shadow-sm">
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <Label htmlFor="budget_total">Total Budget</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">
                    Enter the total approved budget for this project as a
                    numerical value (without currency symbols).
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
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
            <div className="flex items-center gap-1">
              <Label htmlFor="budget_actuals">Actuals</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">
                    Enter the actual amount spent on the project to date as a
                    numerical value.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
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
            <div className="flex items-center gap-1">
              <Label htmlFor="budget_forecast">Forecast</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">
                    Enter the forecasted remaining spend for the project as a
                    numerical value.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
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
            <div className="flex items-center gap-1">
              <Label htmlFor="charterLink">Charter Link</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">
                    Enter the URL to the project charter document or relevant
                    project documentation.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
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
            <div className="flex items-center gap-1">
              <Label htmlFor="sponsors">Sponsors</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">
                    Select the project sponsors or stakeholders who have
                    authorized the project from the directory.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            <UserSelectionInput
              id="sponsors"
              value={formData.sponsors}
              onChange={(value) =>
                setFormData((prev) => ({
                  ...prev,
                  sponsors: value,
                }))
              }
              placeholder="Click to select sponsors..."
              multiSelect={true}
              className="bg-white/50 backdrop-blur-sm border-gray-200/50"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <Label htmlFor="businessLeads">Business Leads</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">
                    Select the business leads or key stakeholders responsible
                    for business decisions from the directory.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            <UserSelectionInput
              id="businessLeads"
              value={formData.businessLeads}
              onChange={(value) =>
                setFormData((prev) => ({
                  ...prev,
                  businessLeads: value,
                }))
              }
              placeholder="Click to select business leads..."
              multiSelect={true}
              className="bg-white/50 backdrop-blur-sm border-gray-200/50"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <Label htmlFor="projectManager">Project Manager</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">
                    Select the project manager responsible for day-to-day
                    project execution from the directory.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            <UserSelectionInput
              id="projectManager"
              value={formData.projectManager}
              onChange={(value) =>
                setFormData((prev) => ({
                  ...prev,
                  projectManager: value,
                }))
              }
              placeholder="Click to select project manager..."
              multiSelect={false}
              className="bg-white/50 backdrop-blur-sm border-gray-200/50"
            />
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default BudgetLinksSection;
