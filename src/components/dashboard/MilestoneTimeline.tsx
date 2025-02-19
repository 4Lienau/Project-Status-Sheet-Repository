import React from "react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Milestone {
  id: string;
  title: string;
  completion: number;
  date: string;
  owner: string;
  status: "completed" | "on-schedule" | "at-risk" | "high-risk";
}

interface MilestoneTimelineProps {
  milestones?: Milestone[];
}

const defaultMilestones: Milestone[] = [
  {
    id: "1",
    title: "Project Initiation",
    completion: 100,
    date: "2024-01-15",
    owner: "John Doe",
    status: "completed",
  },
  {
    id: "2",
    title: "Requirements Gathering",
    completion: 75,
    date: "2024-02-01",
    owner: "Jane Smith",
    status: "on-schedule",
  },
  {
    id: "3",
    title: "Design Phase",
    completion: 30,
    date: "2024-03-15",
    owner: "Mike Johnson",
    status: "at-risk",
  },
  {
    id: "4",
    title: "Development",
    completion: 0,
    date: "2024-04-30",
    owner: "Sarah Wilson",
    status: "high-risk",
  },
];

const getStatusColor = (status: Milestone["status"]) => {
  const colors = {
    completed: "bg-blue-500",
    "on-schedule": "bg-green-500",
    "at-risk": "bg-yellow-500",
    "high-risk": "bg-red-500",
  };
  return colors[status];
};

const MilestoneTimeline = ({
  milestones = defaultMilestones,
}: MilestoneTimelineProps) => {
  return (
    <Card className="p-6 bg-card w-full">
      <h2 className="text-xl font-semibold mb-6">Project Milestones</h2>
      <div className="space-y-6">
        {milestones.map((milestone, index) => (
          <TooltipProvider key={milestone.id}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="relative">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h3 className="font-medium">{milestone.title}</h3>
                      <p className="text-sm text-gray-500">{milestone.owner}</p>
                    </div>
                    <div className="text-sm text-gray-500">
                      {milestone.date}
                    </div>
                  </div>
                  <div className="relative">
                    <Progress value={milestone.completion} className="h-2" />
                    <div
                      className={`absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full ${getStatusColor(milestone.status)}`}
                    />
                  </div>
                  {index < milestones.length - 1 && (
                    <div className="absolute left-1/2 h-4 w-px bg-gray-200 -bottom-5" />
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-sm">
                  <p>Status: {milestone.status}</p>
                  <p>Completion: {milestone.completion}%</p>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
      </div>
    </Card>
  );
};

export default MilestoneTimeline;
