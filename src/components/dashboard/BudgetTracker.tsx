import React from "react";
import { Card } from "../ui/card";
import { Progress } from "../ui/progress";

interface BudgetData {
  actualSpend: number;
  forecastSpend: number;
  totalBudget: number;
  currency: string;
}

interface BudgetTrackerProps {
  data?: BudgetData;
}

const defaultBudgetData: BudgetData = {
  actualSpend: 250000,
  forecastSpend: 400000,
  totalBudget: 500000,
  currency: "USD",
};

const BudgetTracker = ({ data = defaultBudgetData }: BudgetTrackerProps) => {
  const actualPercentage = (data.actualSpend / data.totalBudget) * 100;
  const forecastPercentage = (data.forecastSpend / data.totalBudget) * 100;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: data.currency,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Card className="p-6 bg-card w-[400px]">
      <div className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold">Budget Tracker</h2>
          <p className="text-sm text-gray-500">
            Total Budget: {formatCurrency(data.totalBudget)}
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Actual Spend</span>
              <span className="font-medium">
                {formatCurrency(data.actualSpend)}
              </span>
            </div>
            <Progress value={actualPercentage} className="h-2" />
            <p className="text-xs text-gray-500">
              {actualPercentage.toFixed(1)}% of budget
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Forecast Spend</span>
              <span className="font-medium">
                {formatCurrency(data.forecastSpend)}
              </span>
            </div>
            <Progress value={forecastPercentage} className="h-2" />
            <p className="text-xs text-gray-500">
              {forecastPercentage.toFixed(1)}% of budget
            </p>
          </div>
        </div>

        <div className="pt-4 border-t">
          <div className="flex justify-between text-sm">
            <span>Remaining Budget</span>
            <span className="font-medium">
              {formatCurrency(data.totalBudget - data.forecastSpend)}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default BudgetTracker;
