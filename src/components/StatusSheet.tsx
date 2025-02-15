import React from "react";

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
  if (!data) return null;

  // Calculate overall completion percentage
  const overallCompletion = Math.round(
    data.milestones.reduce((acc, m) => acc + m.completion, 0) /
      Math.max(data.milestones.length, 1),
  );

  // Determine overall status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-blue-500";
      case "on_hold":
        return "bg-yellow-500";
      case "cancelled":
        return "bg-red-500";
      default:
        return "bg-green-500";
    }
  };

  // Get milestone status styling
  const getMilestoneStatus = (completion: number, status: string) => {
    if (completion === 100) return "bg-blue-100 text-blue-800";
    switch (status) {
      case "green":
        return "bg-green-100 text-green-800";
      case "yellow":
        return "bg-yellow-100 text-yellow-800";
      case "red":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="p-8 bg-white">
      {/* Title and Description */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold">{data.title}</h1>
        <h2 className="text-xl">{data.description}</h2>
      </div>

      <div className="grid grid-cols-[1fr,1fr] gap-12">
        {/* Left Column */}
        <div className="flex-1">
          {/* Overall Status */}
          <div className="flex gap-8 mb-8">
            <div>
              <div className="font-bold mb-1">Overall Status</div>
              <div className="flex items-start gap-2">
                <div
                  className={`w-16 h-16 flex items-center justify-center text-white text-3xl font-bold ${getStatusColor(data.status || "active")}`}
                >
                  {overallCompletion}%
                </div>
                <div>
                  <div>
                    Health:{" "}
                    {data.status?.replace("_", " ").charAt(0).toUpperCase() +
                      data.status?.slice(1).replace("_", " ") || "Active"}
                  </div>
                  <div className="text-cyan-500">
                    Next Steps:{" "}
                    {data.status === "completed"
                      ? "Project Complete"
                      : data.status === "on_hold"
                        ? "Project on Hold"
                        : data.status === "cancelled"
                          ? "Project Cancelled"
                          : "In Progress"}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-12 gap-y-4 ml-8">
              <div>
                <div className="font-bold mb-1">Sponsors</div>
                <div>{data.sponsors}</div>
              </div>
              <div>
                <div className="font-bold mb-1">PM</div>
                <div>{data.projectManager}</div>
              </div>
              <div>
                <div className="font-bold mb-1">Business Lead(s)</div>
                <div>{data.businessLeads}</div>
              </div>
            </div>
          </div>

          {/* Budget Section */}
          <div className="mb-8">
            <div className="grid grid-cols-3 gap-12">
              <div>
                <div className="font-bold mb-1">Budget</div>
                <div>${data.budget.total}</div>
              </div>
              <div>
                <div className="font-bold mb-1">Actuals</div>
                <div>${data.budget.actuals}</div>
              </div>
              <div>
                <div className="font-bold mb-1">Forecast</div>
                <div>${data.budget.forecast}</div>
              </div>
            </div>
          </div>

          {/* Charter */}
          <div className="mb-8">
            <div className="font-bold mb-1">Charter</div>
            <a
              href={data.charterLink}
              className="text-blue-600 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              {data.charterLink.split("/").pop()}
            </a>
          </div>

          {/* Accomplishments */}
          <div className="mb-6">
            <h3 className="text-lg font-bold mb-2">Accomplishments To Date</h3>
            <ul className="list-disc pl-5 space-y-1">
              {data.accomplishments.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </div>

          {/* Next Period's Activities */}
          <div>
            <h3 className="text-lg font-bold mb-2">
              Next Period's Key Activities
            </h3>
            <ul className="list-disc pl-5 space-y-1">
              {data.nextPeriodActivities.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Right Column */}
        <div className="flex-1">
          <h2 className="text-xl font-bold mb-4">
            High Level Project Schedule
          </h2>
          <table className="w-full">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2 pr-4 w-24 font-bold">Status</th>
                <th className="py-2 pr-4 w-24 font-bold">Date</th>
                <th className="py-2 pr-4 font-bold">Milestone</th>
                <th className="py-2 pr-4 font-bold">Owner</th>
              </tr>
            </thead>
            <tbody>
              {data.milestones.map((milestone, index) => (
                <tr key={index} className="border-b border-gray-100">
                  <td className="py-2 pr-4">
                    <div
                      className={`w-16 text-center text-sm font-medium py-1 px-2 rounded ${getMilestoneStatus(milestone.completion, milestone.status)}`}
                    >
                      {milestone.completion}%
                    </div>
                  </td>
                  <td className="py-2 pr-4">{milestone.date}</td>
                  <td className="py-2 pr-4">{milestone.milestone}</td>
                  <td className="py-2 pr-4">{milestone.owner}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Risks and Issues */}
          <div className="mb-6">
            <h3 className="text-lg font-bold mb-2">Risks and Issues</h3>
            <ul className="list-disc pl-5 space-y-1">
              {data.risks.map((risk, index) => (
                <li key={index}>{risk}</li>
              ))}
            </ul>
          </div>

          {/* Considerations */}
          <div>
            <h3 className="text-lg font-bold mb-2">
              Questions / Items for Consideration
            </h3>
            <ul className="list-disc pl-5 space-y-1">
              {data.considerations.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatusSheet;
