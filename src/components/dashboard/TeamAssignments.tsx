import React from "react";
import { Card } from "../ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "../ui/avatar";
import { Badge } from "../ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";

interface TeamMember {
  id: string;
  name: string;
  role: string;
  avatarUrl?: string;
  status: "active" | "away" | "offline";
}

interface TeamAssignmentsProps {
  members?: TeamMember[];
}

const defaultMembers: TeamMember[] = [
  {
    id: "1",
    name: "Alice Johnson",
    role: "Project Manager",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=alice",
    status: "active",
  },
  {
    id: "2",
    name: "Bob Smith",
    role: "Developer",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=bob",
    status: "away",
  },
  {
    id: "3",
    name: "Carol Williams",
    role: "Designer",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=carol",
    status: "offline",
  },
];

const statusColors = {
  active: "bg-green-500",
  away: "bg-yellow-500",
  offline: "bg-gray-500",
};

const TeamAssignments: React.FC<TeamAssignmentsProps> = ({
  members = defaultMembers,
}) => {
  return (
    <Card className="p-6 bg-card">
      <h2 className="text-xl font-semibold mb-4">Team Assignments</h2>
      <div className="space-y-4">
        {members.map((member) => (
          <div
            key={member.id}
            className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center space-x-3">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <div className="relative">
                      <Avatar>
                        <AvatarImage src={member.avatarUrl} alt={member.name} />
                        <AvatarFallback>
                          {member.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span
                        className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${statusColors[member.status]}`}
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      {member.status.charAt(0).toUpperCase() +
                        member.status.slice(1)}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <div>
                <p className="font-medium">{member.name}</p>
                <p className="text-sm text-gray-500">{member.role}</p>
              </div>
            </div>
            <Badge
              variant="outline"
              className={`${
                member.status === "active"
                  ? "border-green-500 text-green-700"
                  : member.status === "away"
                    ? "border-yellow-500 text-yellow-700"
                    : "border-gray-500 text-gray-700"
              }`}
            >
              {member.status.charAt(0).toUpperCase() + member.status.slice(1)}
            </Badge>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default TeamAssignments;
