/**
 * File: ProjectDurationManager.tsx
 * Purpose: Admin component for managing project duration calculations
 * Description: This component provides admin functionality to recalculate project durations
 * for all projects in the system, view projects that need updates, and monitor the status
 * of duration calculations.
 */

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  RefreshCw,
  Clock,
  CheckCircle,
  AlertTriangle,
  Calendar,
} from "lucide-react";
import { projectDurationService } from "@/lib/services/projectDurationService";
import { useToast } from "@/components/ui/use-toast";

const ProjectDurationManager = () => {
  const { toast } = useToast();
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [recalculationResult, setRecalculationResult] = useState<{
    success: boolean;
    updatedCount: number;
    totalCount: number;
    errors: string[];
  } | null>(null);
  const [projectsNeedingUpdate, setProjectsNeedingUpdate] = useState<{
    count: number;
    projectIds: string[];
  } | null>(null);
  const [isCheckingProjects, setIsCheckingProjects] = useState(false);

  const handleRecalculateAll = async () => {
    setIsRecalculating(true);
    setRecalculationResult(null);

    try {
      console.log(
        "[ADMIN] Starting manual recalculation of all project durations",
      );
      const result =
        await projectDurationService.recalculateAllProjectDurations();

      console.log("[ADMIN] Recalculation result:", result);
      setRecalculationResult(result);

      if (result.success) {
        toast({
          title: "Success",
          description: `Successfully updated duration for ${result.updatedCount} projects (including remaining days)`,
          className: "bg-green-50 border-green-200",
        });
        console.log(
          `[ADMIN] ✓ Successfully updated ${result.updatedCount} projects with duration and remaining days`,
        );
      } else {
        toast({
          title: "Partial Success",
          description: `Updated ${result.updatedCount} of ${result.totalCount} projects. ${result.errors.length} errors occurred.`,
          variant: "destructive",
        });
        console.warn(
          `[ADMIN] ⚠ Partial success: ${result.updatedCount}/${result.totalCount} projects updated`,
        );
        console.error(`[ADMIN] Errors:`, result.errors);
      }
    } catch (error) {
      console.error("[ADMIN] Error recalculating project durations:", error);
      toast({
        title: "Error",
        description: "Failed to recalculate project durations",
        variant: "destructive",
      });
      setRecalculationResult({
        success: false,
        updatedCount: 0,
        totalCount: 0,
        errors: [error instanceof Error ? error.message : "Unknown error"],
      });
    } finally {
      setIsRecalculating(false);
    }
  };

  const handleCheckProjectsNeedingUpdate = async () => {
    setIsCheckingProjects(true);

    try {
      const result =
        await projectDurationService.getProjectsNeedingDurationUpdate();
      setProjectsNeedingUpdate(result);

      toast({
        title: "Check Complete",
        description: `Found ${result.count} projects that need duration updates`,
        className: "bg-blue-50 border-blue-200",
      });
    } catch (error) {
      console.error("Error checking projects:", error);
      toast({
        title: "Error",
        description: "Failed to check projects needing updates",
        variant: "destructive",
      });
    } finally {
      setIsCheckingProjects(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Project Duration Management
          </h2>
          <p className="text-gray-600 mt-1">
            Manage project duration calculations based on milestone dates
          </p>
        </div>
      </div>

      {/* Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Recalculate All Durations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              Recalculate project durations for all projects based on their
              milestone dates. This will update start dates, end dates, total
              days, and working days.
            </p>
            <Button
              onClick={handleRecalculateAll}
              disabled={isRecalculating}
              className="w-full"
            >
              {isRecalculating ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Recalculating...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Recalculate All Projects
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Check Projects Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              Check which projects are missing duration data and need to be
              updated.
            </p>
            <Button
              onClick={handleCheckProjectsNeedingUpdate}
              disabled={isCheckingProjects}
              variant="outline"
              className="w-full"
            >
              {isCheckingProjects ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <Clock className="h-4 w-4 mr-2" />
                  Check Projects
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Results */}
      {recalculationResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {recalculationResult.success ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
              )}
              Recalculation Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {recalculationResult.updatedCount}
                </div>
                <div className="text-sm text-gray-600">Updated</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {recalculationResult.totalCount}
                </div>
                <div className="text-sm text-gray-600">Total</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {recalculationResult.errors.length}
                </div>
                <div className="text-sm text-gray-600">Errors</div>
              </div>
            </div>

            {recalculationResult.totalCount > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress</span>
                  <span>
                    {Math.round(
                      (recalculationResult.updatedCount /
                        recalculationResult.totalCount) *
                        100,
                    )}
                    %
                  </span>
                </div>
                <Progress
                  value={
                    (recalculationResult.updatedCount /
                      recalculationResult.totalCount) *
                    100
                  }
                  className="h-2"
                />
              </div>
            )}

            {recalculationResult.errors.length > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <div className="font-medium">Errors occurred:</div>
                    <ul className="list-disc list-inside text-sm space-y-1">
                      {recalculationResult.errors
                        .slice(0, 5)
                        .map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      {recalculationResult.errors.length > 5 && (
                        <li>
                          ... and {recalculationResult.errors.length - 5} more
                        </li>
                      )}
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {projectsNeedingUpdate && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Projects Needing Updates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">
                  {projectsNeedingUpdate.count}
                </div>
                <div className="text-sm text-gray-600">
                  projects need duration updates
                </div>
              </div>
              <Badge
                variant={
                  projectsNeedingUpdate.count > 0 ? "destructive" : "secondary"
                }
              >
                {projectsNeedingUpdate.count > 0
                  ? "Action Required"
                  : "All Updated"}
              </Badge>
            </div>
            {projectsNeedingUpdate.count > 0 && (
              <Alert className="mt-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Some projects are missing duration data. Run the recalculation
                  to update all projects with proper duration information.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Information Card */}
      <Card>
        <CardHeader>
          <CardTitle>How Duration Calculation Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm text-gray-600 space-y-2">
            <p>
              <strong>Start Date:</strong> The earliest milestone date in the
              project
            </p>
            <p>
              <strong>End Date:</strong> The latest milestone date in the
              project
            </p>
            <p>
              <strong>Total Days:</strong> Calendar days between start and end
              dates
            </p>
            <p>
              <strong>Working Days:</strong> Business days (excluding weekends)
              between start and end dates
            </p>
          </div>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Duration is automatically recalculated when milestones are added,
              removed, or their dates are changed. Manual recalculation is only
              needed for existing projects or troubleshooting.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProjectDurationManager;
