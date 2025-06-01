/**
 * File: ProjectDurationDebugger.tsx
 * Purpose: Debug component for testing project duration calculations
 * Description: This component provides debugging tools to test project duration
 * calculations and database updates for individual projects.
 */

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  RefreshCw,
  Search,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Database,
} from "lucide-react";
import { projectDurationService } from "@/lib/services/projectDurationService";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/use-toast";

interface ProjectDebugInfo {
  id: string;
  title: string;
  milestones: Array<{
    id: string;
    date: string;
    milestone: string;
  }>;
  calculated_start_date: string | null;
  calculated_end_date: string | null;
  total_days: number | null;
  working_days: number | null;
}

const ProjectDurationDebugger = () => {
  const { toast } = useToast();
  const [projectId, setProjectId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState<ProjectDebugInfo | null>(null);
  const [updateResult, setUpdateResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const handleFetchProjectInfo = async () => {
    if (!projectId.trim()) {
      toast({
        title: "Error",
        description: "Please enter a project ID",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setDebugInfo(null);
    setUpdateResult(null);

    try {
      console.log("[DEBUG_COMPONENT] Fetching project info for:", projectId);

      // Fetch project and milestones
      const [projectResult, milestonesResult] = await Promise.all([
        supabase
          .from("projects")
          .select(
            "id, title, calculated_start_date, calculated_end_date, total_days, working_days",
          )
          .eq("id", projectId)
          .single(),
        supabase
          .from("milestones")
          .select("id, date, milestone")
          .eq("project_id", projectId)
          .order("date"),
      ]);

      if (projectResult.error) {
        console.error(
          "[DEBUG_COMPONENT] Project fetch error:",
          projectResult.error,
        );
        toast({
          title: "Error",
          description: `Failed to fetch project: ${projectResult.error.message}`,
          variant: "destructive",
        });
        return;
      }

      if (milestonesResult.error) {
        console.error(
          "[DEBUG_COMPONENT] Milestones fetch error:",
          milestonesResult.error,
        );
        toast({
          title: "Error",
          description: `Failed to fetch milestones: ${milestonesResult.error.message}`,
          variant: "destructive",
        });
        return;
      }

      const info: ProjectDebugInfo = {
        ...projectResult.data,
        milestones: milestonesResult.data || [],
      };

      console.log("[DEBUG_COMPONENT] Fetched project info:", info);
      setDebugInfo(info);

      toast({
        title: "Success",
        description: "Project information fetched successfully",
        className: "bg-green-50 border-green-200",
      });
    } catch (error) {
      console.error("[DEBUG_COMPONENT] Error fetching project info:", error);
      toast({
        title: "Error",
        description: "Failed to fetch project information",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateDuration = async () => {
    if (!debugInfo) return;

    setIsLoading(true);
    setUpdateResult(null);

    try {
      console.log(
        "[DEBUG_COMPONENT] Testing duration update for:",
        debugInfo.id,
      );
      const success = await projectDurationService.updateProjectDuration(
        debugInfo.id,
      );

      if (success) {
        setUpdateResult({
          success: true,
          message: "Duration updated successfully",
        });
        // Refresh the project info
        await handleFetchProjectInfo();
      } else {
        setUpdateResult({
          success: false,
          message: "Duration update failed - check console for details",
        });
      }
    } catch (error) {
      console.error("[DEBUG_COMPONENT] Error updating duration:", error);
      setUpdateResult({
        success: false,
        message: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          Project Duration Debugger
        </h2>
        <p className="text-gray-600 mt-1">
          Debug project duration calculations for individual projects
        </p>
      </div>

      {/* Project ID Input */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Project Lookup
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Enter project ID (UUID)"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="flex-1"
            />
            <Button
              onClick={handleFetchProjectInfo}
              disabled={isLoading}
              className="min-w-[120px]"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Fetch Info
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Project Information */}
      {debugInfo && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Project Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Project Title
                </label>
                <p className="text-sm text-gray-900">{debugInfo.title}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Project ID
                </label>
                <p className="text-sm text-gray-900 font-mono">
                  {debugInfo.id}
                </p>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">
                Milestones ({debugInfo.milestones.length})
              </label>
              {debugInfo.milestones.length > 0 ? (
                <div className="mt-2 space-y-2">
                  {debugInfo.milestones.map((milestone) => (
                    <div
                      key={milestone.id}
                      className="flex justify-between items-center p-2 bg-gray-50 rounded"
                    >
                      <span className="text-sm">{milestone.milestone}</span>
                      <Badge variant="outline">{milestone.date}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <Alert className="mt-2">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    No milestones found. Duration calculation requires at least
                    one milestone.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Start Date
                </label>
                <p className="text-sm text-gray-900">
                  {debugInfo.calculated_start_date || "NULL"}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">
                  End Date
                </label>
                <p className="text-sm text-gray-900">
                  {debugInfo.calculated_end_date || "NULL"}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Total Days
                </label>
                <p className="text-sm text-gray-900">
                  {debugInfo.total_days ?? "NULL"}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Working Days
                </label>
                <p className="text-sm text-gray-900">
                  {debugInfo.working_days ?? "NULL"}
                </p>
              </div>
            </div>

            <Button
              onClick={handleUpdateDuration}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Test Duration Update
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Update Result */}
      {updateResult && (
        <Alert
          className={
            updateResult.success
              ? "border-green-200 bg-green-50"
              : "border-red-200 bg-red-50"
          }
        >
          {updateResult.success ? (
            <CheckCircle className="h-4 w-4 text-green-600" />
          ) : (
            <XCircle className="h-4 w-4 text-red-600" />
          )}
          <AlertDescription
            className={updateResult.success ? "text-green-800" : "text-red-800"}
          >
            {updateResult.message}
          </AlertDescription>
        </Alert>
      )}

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>How to Use</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm text-gray-600 space-y-2">
            <p>
              <strong>1.</strong> Enter a project ID (UUID) in the input field
              above
            </p>
            <p>
              <strong>2.</strong> Click "Fetch Info" to load project details and
              current duration data
            </p>
            <p>
              <strong>3.</strong> Review the milestone information and current
              duration fields
            </p>
            <p>
              <strong>4.</strong> Click "Test Duration Update" to manually
              trigger the duration calculation
            </p>
            <p>
              <strong>5.</strong> Check the browser console for detailed logging
              information
            </p>
          </div>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              This tool is for debugging purposes. Check the browser console for
              detailed logs during duration updates.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProjectDurationDebugger;
