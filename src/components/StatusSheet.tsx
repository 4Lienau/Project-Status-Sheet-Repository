import React from "react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ExternalLink, AlertTriangle } from "lucide-react";

interface StatusSheetProps {
  data?: {
    title: string;
    description?: string;
    status?: "active" | "on_hold" | "completed" | "cancelled";
    budget: {
      total: string;
      actuals: string;
      forecast: string;
    };
    charterLink: string;
    sponsors: string;
    businessLeads: string;
    projectManager: string;
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
  };
}

const StatusSheet: React.FC<StatusSheetProps> = ({ data }) => {
  if (!data) {
    return null;
  }

  const calculateProjectHealth = (milestones: typeof data.milestones) => {
    if (!milestones?.length) return { percentage: 0, status: "green" as const };

    // Calculate overall completion percentage
    const percentage = Math.round(
      milestones.reduce((acc, curr) => acc + curr.completion, 0) /
        milestones.length,
    );

    // Check for critical conditions
    const today = new Date();
    const hasRedMilestones = milestones.some(
      (m) => m.status === "red" && m.completion > 0,
    );
    const hasOverdueMilestones = milestones.some((m) => {
      const dueDate = new Date(m.date);
      return dueDate < today && m.completion < 100;
    });

    if (hasRedMilestones || hasOverdueMilestones) {
      return { percentage, status: "red" as const };
    }

    // Check for warning conditions
    const hasYellowMilestones = milestones.some(
      (m) => m.status === "yellow" && m.completion > 0,
    );

    if (hasYellowMilestones) {
      return { percentage, status: "yellow" as const };
    }

    // If we get here, project is on track
    return { percentage, status: "green" as const };
  };

  const { percentage: healthPercentage, status: healthStatus } =
    calculateProjectHealth(data.milestones);

  const budgetTotal = parseFloat(data.budget.total.replace(/,/g, ""));
  const budgetActuals = parseFloat(data.budget.actuals.replace(/,/g, ""));
  const budgetForecast = parseFloat(data.budget.forecast.replace(/,/g, ""));

  const isOverBudget =
    budgetActuals > budgetTotal || budgetForecast > budgetTotal;
  const overageAmount = Math.max(
    budgetActuals - budgetTotal,
    budgetForecast - budgetTotal,
  );

  return (
    <Card className="p-6 bg-card w-full">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start border-b pb-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{data.title}</h1>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  {
                    active: "bg-green-100 text-green-800",
                    on_hold: "bg-yellow-100 text-yellow-800",
                    completed: "bg-blue-100 text-blue-800",
                    cancelled: "bg-red-100 text-red-800",
                  }[data.status || "active"]
                }`}
              >
                {(data.status || "active")
                  .replace("_", " ")
                  .charAt(0)
                  .toUpperCase() +
                  (data.status || "active").slice(1).replace("_", " ")}
              </span>
            </div>
            {data.description && (
              <p className="text-muted-foreground">{data.description}</p>
            )}
            <div className="mt-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">Health:</span>
                <Progress
                  value={healthPercentage}
                  className={`w-32 h-2 ${healthStatus === "green" ? "bg-green-200" : healthStatus === "yellow" ? "bg-yellow-200" : "bg-red-200"}`}
                />
                <span
                  className={`text-sm px-2 py-1 rounded ${healthStatus === "green" ? "bg-green-100 text-green-800" : healthStatus === "yellow" ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800"}`}
                >
                  {healthPercentage}%
                </span>
              </div>
            </div>
          </div>
          <div className="text-right space-y-2">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-4">
                <p>
                  <span className="font-semibold">Total Budget:</span> $
                  {data.budget.total}
                </p>
                {isOverBudget && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-md">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-red-700">
                        Over Budget
                      </span>
                      <span className="text-xs text-red-600">
                        +${overageAmount.toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Forecast</span>
                  <span className="font-medium">${data.budget.forecast}</span>
                </div>
                <div className="relative pt-1">
                  <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-200">
                    <div
                      style={{
                        width: `${Math.min(
                          (budgetForecast / budgetTotal) * 100,
                          100,
                        )}%`,
                      }}
                      className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${budgetForecast > budgetTotal ? "bg-red-500" : "bg-green-500"}`}
                    />
                  </div>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Actuals</span>
                  <span className="font-medium">${data.budget.actuals}</span>
                </div>
                <div className="relative pt-1">
                  <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-200">
                    <div
                      style={{
                        width: `${Math.min(
                          (budgetActuals / budgetTotal) * 100,
                          100,
                        )}%`,
                      }}
                      className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${budgetActuals > budgetTotal ? "bg-red-500" : "bg-blue-500"}`}
                    />
                  </div>
                </div>
              </div>
            </div>
            {data.charterLink && (
              <Button variant="outline" size="sm" asChild>
                <a
                  href={data.charterLink}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View Charter <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>
            )}
          </div>
        </div>

        {/* Project Info */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p>
              <span className="font-semibold">Sponsors:</span> {data.sponsors}
            </p>
            <p>
              <span className="font-semibold">Business Lead(s):</span>{" "}
              {data.businessLeads}
            </p>
          </div>
          <div>
            <p>
              <span className="font-semibold">Project Manager:</span>{" "}
              {data.projectManager}
            </p>
          </div>
        </div>

        {/* Milestones */}
        {data.milestones?.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-2">
              High Level Project Schedule
            </h2>
            <div className="border rounded-lg p-4">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="text-left">Date</th>
                    <th className="text-left">Milestone</th>
                    <th className="text-left">Owner</th>
                    <th className="text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.milestones.map((milestone, index) => (
                    <tr key={index} className="border-t">
                      <td className="py-2">{milestone.date}</td>
                      <td>{milestone.milestone}</td>
                      <td>{milestone.owner}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <Progress
                            value={milestone.completion}
                            className={`w-20 h-2 ${milestone.status === "green" ? "bg-green-200" : milestone.status === "yellow" ? "bg-yellow-200" : "bg-red-200"}`}
                          />
                          <span
                            className={`px-2 py-1 rounded text-xs ${milestone.status === "green" ? "bg-green-100 text-green-800" : milestone.status === "yellow" ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800"}`}
                          >
                            {milestone.completion}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Accomplishments */}
        {data.accomplishments?.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-2">
              Accomplishments To Date
            </h2>
            <ul className="list-disc pl-5 space-y-1">
              {data.accomplishments.map((accomplishment, index) => (
                <li key={index}>{accomplishment}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Next Steps */}
        {data.nextPeriodActivities?.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-2">
              Next Period's Key Activities
            </h2>
            <ul className="list-disc pl-5 space-y-1">
              {data.nextPeriodActivities.map((activity, index) => (
                <li key={index}>{activity}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Risks */}
        {data.risks?.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-2">Risks and Issues</h2>
            <ul className="list-disc pl-5 space-y-1">
              {data.risks.map((risk, index) => (
                <li key={index}>{risk}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Considerations */}
        {data.considerations?.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-2">
              Questions / Items for Consideration
            </h2>
            <ul className="list-disc pl-5 space-y-1">
              {data.considerations.map((consideration, index) => (
                <li key={index}>{consideration}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Card>
  );
};

export default StatusSheet;
