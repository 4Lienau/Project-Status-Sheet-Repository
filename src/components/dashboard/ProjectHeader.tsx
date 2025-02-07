import React from "react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ProjectHeaderProps {
  title?: string;
  healthPercentage?: number;
  sponsor?: {
    name: string;
    avatar: string;
  };
  businessLead?: {
    name: string;
    avatar: string;
  };
  startDate?: string;
  endDate?: string;
}

const ProjectHeader = ({
  title = "Project Alpha",
  healthPercentage = 75,
  sponsor = {
    name: "John Doe",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=sponsor",
  },
  businessLead = {
    name: "Jane Smith",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=lead",
  },
  startDate = "2024-01-01",
  endDate = "2024-12-31",
}: ProjectHeaderProps) => {
  const getHealthColor = (percentage: number) => {
    if (percentage >= 75) return "bg-green-500";
    if (percentage >= 50) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <Card className="p-6 bg-white shadow-lg">
      <div className="flex justify-between items-start">
        <div className="space-y-4 flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>

          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">Project Health:</span>
            <div className="w-48">
              <Progress
                value={healthPercentage}
                className={`h-2 ${getHealthColor(healthPercentage)}`}
              />
            </div>
            <span className="text-sm font-medium">{healthPercentage}%</span>
          </div>

          <div className="flex space-x-8">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">Start Date:</span>
              <span className="text-sm font-medium">{startDate}</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">End Date:</span>
              <span className="text-sm font-medium">{endDate}</span>
            </div>
          </div>
        </div>

        <div className="flex space-x-6">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="text-center">
                  <Avatar className="h-12 w-12 mb-1">
                    <AvatarImage src={sponsor.avatar} alt={sponsor.name} />
                    <AvatarFallback>
                      {sponsor.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-xs text-gray-500">Sponsor</div>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{sponsor.name}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="text-center">
                  <Avatar className="h-12 w-12 mb-1">
                    <AvatarImage
                      src={businessLead.avatar}
                      alt={businessLead.name}
                    />
                    <AvatarFallback>
                      {businessLead.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-xs text-gray-500">Business Lead</div>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{businessLead.name}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </Card>
  );
};

export default ProjectHeader;
