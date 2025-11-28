import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { recalculateAllComputedStatusColors } from "@/lib/services/project";
import { healthStatusDebugger } from "@/lib/services/healthStatusDebugger";
import {
  Loader2,
  RefreshCw,
  CheckCircle,
  Bug,
  AlertTriangle,
} from "lucide-react";

const ComputedStatusColorManager = () => {
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [isDebugging, setIsDebugging] = useState(false);
  const [lastRecalculation, setLastRecalculation] = useState<{
    count: number;
    timestamp: Date;
  } | null>(null);
  const [debugResults, setDebugResults] = useState<{
    totalProjects: number;
    discrepancies: number;
    projects: any[];
  } | null>(null);
  const { toast } = useToast();

  const handleRecalculateAll = async () => {
    setIsRecalculating(true);
    try {
      console.log("Starting recalculation of all computed status colors...");
      const count = await recalculateAllComputedStatusColors();

      setLastRecalculation({
        count,
        timestamp: new Date(),
      });

      toast({
        title: "Recalculation Complete",
        description: `Successfully recalculated computed status colors for ${count} projects.`,
        className: "bg-green-50 border-green-200",
      });

      console.log(`Recalculation complete: ${count} projects updated`);

      // Clear debug results since we just fixed everything
      setDebugResults(null);
    } catch (error) {
      // Expected error handler for failed status color recalculation
      console.error("Error recalculating computed status colors:", error);
      toast({
        title: "Recalculation Failed",
        description:
          "Failed to recalculate computed status colors. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRecalculating(false);
    }
  };

  const handleDebugAll = async () => {
    setIsDebugging(true);
    try {
      console.log("Starting health status debug for all projects...");
      const results = await healthStatusDebugger.debugAllProjects();

      setDebugResults(results);

      if (results.discrepancies > 0) {
        toast({
          title: "Discrepancies Found",
          description: `Found ${results.discrepancies} projects with health status discrepancies out of ${results.totalProjects} total projects.`,
          className: "bg-yellow-50 border-yellow-200",
        });
      } else {
        toast({
          title: "No Discrepancies Found",
          description: `All ${results.totalProjects} projects have consistent health status calculations.`,
          className: "bg-green-50 border-green-200",
        });
      }

      console.log(
        `Debug complete: ${results.totalProjects} projects, ${results.discrepancies} discrepancies`,
      );
    } catch (error) {
      // Expected error handler for failed health status debug
      console.error("Error debugging health status:", error);
      toast({
        title: "Debug Failed",
        description: "Failed to debug health status. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDebugging(false);
    }
  };

  return (
    <Card className="p-6 bg-white">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            Computed Status Color Manager
          </h3>
        </div>

        <p className="text-sm text-gray-600">
          This tool recalculates the computed status color for all projects in
          the database. The computed status color is used for filtering and
          ensures consistency between manual and automatic health calculation
          projects.
        </p>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Status Color Logic:</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
            <Badge className="bg-green-100 text-green-800 border-green-200">
              Green: Completed, Active (≥70% milestones), Manual Green
            </Badge>
            <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
              Yellow: Draft, On Hold, Active (40-69% milestones), Manual Yellow
            </Badge>
            <Badge className="bg-red-100 text-red-800 border-red-200">
              Red: Cancelled, Active (&lt;40% milestones), Manual Red
            </Badge>
          </div>
        </div>

        {lastRecalculation && (
          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-md">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="text-sm text-green-800">
              Last recalculation: {lastRecalculation.count} projects updated at{" "}
              {lastRecalculation.timestamp.toLocaleString()}
            </span>
          </div>
        )}

        <div className="space-y-3">
          <Button
            onClick={handleDebugAll}
            disabled={isDebugging || isRecalculating}
            variant="outline"
            className="w-full"
          >
            {isDebugging ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Debugging...
              </>
            ) : (
              <>
                <Bug className="mr-2 h-4 w-4" />
                Debug Health Status Calculations
              </>
            )}
          </Button>

          <Button
            onClick={handleRecalculateAll}
            disabled={isRecalculating || isDebugging}
            className="w-full"
          >
            {isRecalculating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Recalculating...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Recalculate All Computed Status Colors
              </>
            )}
          </Button>
        </div>

        {debugResults && (
          <div className="mt-6 space-y-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <h4 className="text-md font-semibold text-gray-900">
                Debug Results
              </h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                <div className="text-sm font-medium text-blue-800">
                  Total Projects
                </div>
                <div className="text-2xl font-bold text-blue-900">
                  {debugResults.totalProjects}
                </div>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                <div className="text-sm font-medium text-yellow-800">
                  Discrepancies
                </div>
                <div className="text-2xl font-bold text-yellow-900">
                  {debugResults.discrepancies}
                </div>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-md p-3">
                <div className="text-sm font-medium text-green-800">
                  Consistent
                </div>
                <div className="text-2xl font-bold text-green-900">
                  {debugResults.totalProjects - debugResults.discrepancies}
                </div>
              </div>
            </div>

            {debugResults.discrepancies > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <h5 className="text-sm font-semibold text-red-800 mb-2">
                  Projects with Discrepancies:
                </h5>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {debugResults.projects
                    .filter((p) => p.discrepancy)
                    .map((project) => (
                      <div
                        key={project.id}
                        className="text-xs text-red-700 bg-red-100 rounded px-2 py-1"
                      >
                        <strong>{project.title}</strong> - Stored:{" "}
                        {project.computed_status_color || "null"}, Calculated:{" "}
                        {project.calculated_color}
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};

export default ComputedStatusColorManager;
