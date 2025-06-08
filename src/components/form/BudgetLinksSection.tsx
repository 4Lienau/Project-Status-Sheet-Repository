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
                    Enter the total approved budget for this project. Use
                    numbers only (e.g., 50000).
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="relative max-w-xs">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-700 font-semibold z-10">
                $
              </span>
              <Input
                id="budget_total"
                value={(() => {
                  // If the field is focused or contains non-numeric characters, show raw value
                  const rawValue = formData.budget.total?.toString() || "";
                  const cleanValue = rawValue.replace(/[,$\s]/g, "");
                  const numValue = parseFloat(cleanValue);

                  // If it's a valid number and not currently being edited, format it
                  if (
                    !isNaN(numValue) &&
                    numValue > 0 &&
                    !rawValue.includes("$") &&
                    !rawValue.includes(",")
                  ) {
                    return numValue.toLocaleString("en-US", {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 2,
                    });
                  }

                  return rawValue;
                })()}
                onChange={(e) => {
                  // Allow user to type freely, store the raw input temporarily
                  const rawValue = e.target.value;
                  setFormData((prev) => ({
                    ...prev,
                    budget: { ...prev.budget, total: rawValue },
                  }));
                }}
                onBlur={(e) => {
                  // Clean and parse the value on blur
                  const cleanValue = e.target.value.replace(/[,$\s]/g, "");
                  const numValue = parseFloat(cleanValue) || 0;
                  setFormData((prev) => ({
                    ...prev,
                    budget: { ...prev.budget, total: numValue.toString() },
                  }));
                }}
                placeholder="0.00"
                className="bg-white border-gray-300 pl-8"
              />
            </div>
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
                    Enter the actual amount spent on the project to date. Use
                    numbers only (e.g., 25000).
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="relative max-w-xs">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-700 font-semibold z-10">
                $
              </span>
              <Input
                id="budget_actuals"
                value={(() => {
                  // If the field is focused or contains non-numeric characters, show raw value
                  const rawValue = formData.budget.actuals?.toString() || "";
                  const cleanValue = rawValue.replace(/[,$\s]/g, "");
                  const numValue = parseFloat(cleanValue);

                  // If it's a valid number and not currently being edited, format it
                  if (
                    !isNaN(numValue) &&
                    numValue > 0 &&
                    !rawValue.includes("$") &&
                    !rawValue.includes(",")
                  ) {
                    return numValue.toLocaleString("en-US", {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 2,
                    });
                  }

                  return rawValue;
                })()}
                onChange={(e) => {
                  // Allow user to type freely, store the raw input temporarily
                  const rawValue = e.target.value;
                  setFormData((prev) => ({
                    ...prev,
                    budget: { ...prev.budget, actuals: rawValue },
                  }));
                }}
                onBlur={(e) => {
                  // Clean and parse the value on blur
                  const cleanValue = e.target.value.replace(/[,$\s]/g, "");
                  const numValue = parseFloat(cleanValue) || 0;
                  setFormData((prev) => ({
                    ...prev,
                    budget: { ...prev.budget, actuals: numValue.toString() },
                  }));
                }}
                placeholder="0.00"
                className="bg-white border-gray-300 pl-8"
              />
            </div>
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
                    Enter the total forecasted spend for the project. Use
                    numbers only (e.g., 48000).
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="relative max-w-xs">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-700 font-semibold z-10">
                $
              </span>
              <Input
                id="budget_forecast"
                value={(() => {
                  // If the field is focused or contains non-numeric characters, show raw value
                  const rawValue = formData.budget.forecast?.toString() || "";
                  const cleanValue = rawValue.replace(/[,$\s]/g, "");
                  const numValue = parseFloat(cleanValue);

                  // If it's a valid number and not currently being edited, format it
                  if (
                    !isNaN(numValue) &&
                    numValue > 0 &&
                    !rawValue.includes("$") &&
                    !rawValue.includes(",")
                  ) {
                    return numValue.toLocaleString("en-US", {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 2,
                    });
                  }

                  return rawValue;
                })()}
                onChange={(e) => {
                  // Allow user to type freely, store the raw input temporarily
                  const rawValue = e.target.value;
                  setFormData((prev) => ({
                    ...prev,
                    budget: { ...prev.budget, forecast: rawValue },
                  }));
                }}
                onBlur={(e) => {
                  // Clean and parse the value on blur
                  const cleanValue = e.target.value.replace(/[,$\s]/g, "");
                  const numValue = parseFloat(cleanValue) || 0;
                  setFormData((prev) => ({
                    ...prev,
                    budget: { ...prev.budget, forecast: numValue.toString() },
                  }));
                }}
                placeholder="0.00"
                className="bg-white border-gray-300 pl-8"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <Label htmlFor="budget_remaining">Budget Remaining</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">
                    Calculated automatically as Total Budget minus Actuals. This
                    shows how much budget is still available.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="max-w-xs">
              <Input
                id="budget_remaining"
                value={(() => {
                  // Ensure we're working with clean numeric values
                  const totalStr = formData.budget.total?.toString() || "0";
                  const actualsStr = formData.budget.actuals?.toString() || "0";

                  // Remove any existing formatting before parsing
                  const total = parseFloat(totalStr.replace(/[,$]/g, "")) || 0;
                  const actuals =
                    parseFloat(actualsStr.replace(/[,$]/g, "")) || 0;

                  const remaining = total - actuals;

                  // Format as currency
                  return remaining.toLocaleString("en-US", {
                    style: "currency",
                    currency: "USD",
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  });
                })()}
                readOnly
                className="bg-gray-100 border-gray-300 text-gray-700 font-medium"
              />
            </div>
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
