import React from "react";
import { Card } from "../ui/card";
import MilestoneCard from "./MilestoneCard";
import { Milestone } from "@/types/supabase";

interface MilestoneBoardProps {
  milestones: Milestone[];
  onMilestoneUpdate?: (milestone: Milestone) => void;
}

const MilestoneBoard: React.FC<MilestoneBoardProps> = ({
  milestones = [],
  onMilestoneUpdate,
}) => {
  return (
    <Card className="bg-white p-4 shadow-sm">
      <h3 className="text-lg font-medium mb-4">Project Milestones</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {milestones.map((milestone) => (
          <MilestoneCard
            key={milestone.id}
            milestone={milestone}
            onUpdate={onMilestoneUpdate}
          />
        ))}
        {milestones.length === 0 && (
          <div className="col-span-full text-center py-8 text-gray-500">
            No milestones found. Add milestones to track project progress.
          </div>
        )}
      </div>
    </Card>
  );
};

export default MilestoneBoard;
