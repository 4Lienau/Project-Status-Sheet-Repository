import React from "react";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertCircle, Clock } from "lucide-react";

interface MilestoneGenerationFeedbackProps {
  milestones: any[];
  isVisible: boolean;
}

const MilestoneGenerationFeedback: React.FC<
  MilestoneGenerationFeedbackProps
> = ({ milestones, isVisible }) => {
  if (!isVisible || !milestones.length) return null;

  const hasKickoff = milestones.some(
    (m) => m.milestone && m.milestone.toLowerCase().includes("kickoff"),
  );
  const hasCloseout = milestones.some(
    (m) =>
      m.milestone &&
      (m.milestone.toLowerCase().includes("closeout") ||
        m.milestone.toLowerCase().includes("closure")),
  );

  const kickoffFirst = milestones[0]?.milestone
    ?.toLowerCase()
    .includes("kickoff");
  const closeoutLast =
    milestones[milestones.length - 1]?.milestone
      ?.toLowerCase()
      .includes("closeout") ||
    milestones[milestones.length - 1]?.milestone
      ?.toLowerCase()
      .includes("closure");

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <CheckCircle className="h-5 w-5 text-blue-600" />
        <h4 className="font-semibold text-blue-800">
          AI Milestone Generation Summary
        </h4>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm">
            {milestones.length} milestones generated
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            {hasKickoff ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-600" />
            )}
            <span className={hasKickoff ? "text-green-700" : "text-red-700"}>
              Project Kickoff{" "}
              {kickoffFirst
                ? "(first)"
                : hasKickoff
                  ? "(included)"
                  : "(missing)"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {hasCloseout ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-600" />
            )}
            <span className={hasCloseout ? "text-green-700" : "text-red-700"}>
              Project Closeout{" "}
              {closeoutLast
                ? "(last)"
                : hasCloseout
                  ? "(included)"
                  : "(missing)"}
            </span>
          </div>
        </div>

        {(!hasKickoff || !hasCloseout || !kickoffFirst || !closeoutLast) && (
          <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span className="font-medium">Auto-correction applied:</span>
            </div>
            <ul className="mt-1 ml-6 list-disc text-xs">
              {!hasKickoff && <li>Added "Project Kickoff" milestone</li>}
              {!hasCloseout && <li>Added "Project Closeout" milestone</li>}
              {hasKickoff && !kickoffFirst && (
                <li>Moved "Project Kickoff" to first position</li>
              )}
              {hasCloseout && !closeoutLast && (
                <li>Moved "Project Closeout" to last position</li>
              )}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default MilestoneGenerationFeedback;
