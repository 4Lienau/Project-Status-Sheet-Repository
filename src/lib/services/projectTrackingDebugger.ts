/**
 * Project Creation Tracking Debugger
 * This service has been simplified to reduce performance impact
 */

import { supabase } from "../supabase";

export const projectTrackingDebugger = {
  async debugProjectCreationTracking(): Promise<{
    success: boolean;
    summary: string;
    details: any;
  }> {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        return {
          success: false,
          summary: "User authentication failed",
          details: { userError },
        };
      }

      const { count, error } = await supabase
        .from("user_activity_logs")
        .select("*", { count: "exact", head: true })
        .eq("activity_type", "project_creation");

      return {
        success: !error,
        summary: error ? "Database access failed" : "System operational",
        details: { count, error },
      };
    } catch (error) {
      return {
        success: false,
        summary: `Debug failed: ${error.message}`,
        details: { error: error.message },
      };
    }
  },

  async testProjectCreationTracking(testProjectData: {
    projectId: string;
    projectTitle: string;
    department?: string;
  }): Promise<boolean> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return false;

      const { adminService } = await import("./adminService");
      let sessionId = await adminService.getCurrentUserActiveSession(user.id);

      if (!sessionId) {
        sessionId = await adminService.startUserSession(
          user.id,
          "127.0.0.1",
          "Test User Agent",
        );
        if (!sessionId) return false;
      }

      return await adminService.logUserActivity(
        user.id,
        sessionId,
        "project_creation",
        {
          project_id: testProjectData.projectId,
          project_title: testProjectData.projectTitle,
          department: testProjectData.department,
          timestamp: new Date().toISOString(),
          test: true,
        },
        "test-page",
      );
    } catch (error) {
      return false;
    }
  },
};
