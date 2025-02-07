import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Plus, AlertTriangle, CheckCircle, Clock } from "lucide-react";

interface StatusUpdate {
  id: string;
  content: string;
  date: string;
}

interface StatusUpdatesProps {
  accomplishments?: StatusUpdate[];
  nextActivities?: StatusUpdate[];
  risks?: StatusUpdate[];
  considerations?: StatusUpdate[];
}

const defaultAccomplishments = [
  { id: "1", content: "Completed initial project setup", date: "2024-03-15" },
  { id: "2", content: "Team onboarding finished", date: "2024-03-16" },
];

const defaultNextActivities = [
  { id: "1", content: "Begin development phase", date: "2024-03-20" },
  { id: "2", content: "Schedule stakeholder review", date: "2024-03-22" },
];

const defaultRisks = [
  { id: "1", content: "Resource availability constraint", date: "2024-03-17" },
  { id: "2", content: "Technical debt accumulation", date: "2024-03-18" },
];

const defaultConsiderations = [
  {
    id: "1",
    content: "Need to evaluate third-party integrations",
    date: "2024-03-19",
  },
  { id: "2", content: "Consider scaling requirements", date: "2024-03-21" },
];

const StatusUpdateList = ({ updates }: { updates: StatusUpdate[] }) => (
  <ScrollArea className="h-[300px] w-full rounded-md border p-4">
    <div className="space-y-4">
      {updates.map((update) => (
        <Card key={update.id}>
          <CardContent className="p-4">
            <p className="text-sm text-gray-600">{update.date}</p>
            <p className="mt-2">{update.content}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  </ScrollArea>
);

const StatusUpdates = ({
  accomplishments = defaultAccomplishments,
  nextActivities = defaultNextActivities,
  risks = defaultRisks,
  considerations = defaultConsiderations,
}: StatusUpdatesProps) => {
  return (
    <div className="w-full bg-white p-6 rounded-lg shadow-sm">
      <Tabs defaultValue="accomplishments" className="w-full">
        <div className="flex justify-between items-center mb-4">
          <TabsList>
            <TabsTrigger
              value="accomplishments"
              className="flex items-center gap-2"
            >
              <CheckCircle className="h-4 w-4" />
              Accomplishments
            </TabsTrigger>
            <TabsTrigger
              value="next-activities"
              className="flex items-center gap-2"
            >
              <Clock className="h-4 w-4" />
              Next Activities
            </TabsTrigger>
            <TabsTrigger value="risks" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Risks/Issues
            </TabsTrigger>
            <TabsTrigger
              value="considerations"
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Considerations
            </TabsTrigger>
          </TabsList>
          <Button variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Add New
          </Button>
        </div>

        <TabsContent value="accomplishments">
          <Card>
            <CardHeader>
              <CardTitle>Recent Accomplishments</CardTitle>
            </CardHeader>
            <CardContent>
              <StatusUpdateList updates={accomplishments} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="next-activities">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Activities</CardTitle>
            </CardHeader>
            <CardContent>
              <StatusUpdateList updates={nextActivities} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="risks">
          <Card>
            <CardHeader>
              <CardTitle>Current Risks and Issues</CardTitle>
            </CardHeader>
            <CardContent>
              <StatusUpdateList updates={risks} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="considerations">
          <Card>
            <CardHeader>
              <CardTitle>Key Considerations</CardTitle>
            </CardHeader>
            <CardContent>
              <StatusUpdateList updates={considerations} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StatusUpdates;
