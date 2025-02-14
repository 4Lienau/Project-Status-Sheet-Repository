import React from "react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

interface StatusSheetProps {
  data?: {
    title: string;
    budget: {
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

  const healthPercentage = data.milestones?.length
    ? Math.round(
        data.milestones.reduce((acc, curr) => acc + curr.completion, 0) /
          data.milestones.length,
      )
    : 0;

  return (
    <Card className="p-6 bg-card w-full">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start border-b pb-4">
          <div>
            <h1 className="text-2xl font-bold">{data.title}</h1>
            <div className="mt-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">Health:</span>
                <Progress value={healthPercentage} className="w-32 h-2" />
                <span className="text-sm">{healthPercentage}%</span>
              </div>
            </div>
          </div>
          <div className="text-right space-y-2">
            <div>
              <p>
                <span className="font-semibold">Actuals:</span>{" "}
                {data.budget.actuals}
              </p>
              <p>
                <span className="font-semibold">Forecast:</span>{" "}
                {data.budget.forecast}
              </p>
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
