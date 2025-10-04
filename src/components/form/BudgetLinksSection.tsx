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
import { SectionHeader } from "./SectionHeader";

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
      <SectionHeader
        title="Budget & Links"
        tooltip="Enter budget information and important links related to the project."
      />
      <div className="space-y-4 bg-card/80 backdrop-blur-sm rounded-xl p-4 border-4 border-border shadow-lg">
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <Label htmlFor="budget_total" className="text-foreground">Total Budget</Label>
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
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-foreground font-semibold z-10">
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
                className="bg-card border-border text-foreground pl-8"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <Label htmlFor="budget_actuals" className="text-foreground">Actuals</Label>
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
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-foreground font-semibold z-10">
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
                className="bg-card border-border text-foreground pl-8"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <Label htmlFor="budget_forecast" className="text-foreground">Forecast</Label>
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
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-foreground font-semibold z-10">
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
                className="bg-card border-border text-foreground pl-8"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <Label htmlFor="budget_remaining" className="text-foreground">Budget Remaining</Label>
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
                className="bg-muted border-border text-foreground font-medium"
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <Label htmlFor="charterLink" className="text-foreground">Charter Link</Label>
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
              className="bg-card/50 backdrop-blur-sm border-border text-foreground"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <Label htmlFor="sponsors" className="text-foreground">Sponsors</Label>
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
              className="bg-card/50 backdrop-blur-sm border-border"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <Label htmlFor="businessLeads" className="text-foreground">Business Leads</Label>
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
              className="bg-card/50 backdrop-blur-sm border-border"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <Label htmlFor="projectManager" className="text-foreground">Project Manager</Label>
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
              className="bg-card/50 backdrop-blur-sm border-border"
            />
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default BudgetLinksSection;