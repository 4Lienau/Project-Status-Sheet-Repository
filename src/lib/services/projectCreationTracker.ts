/**
 * Project Creation Tracker Service
 * This service handles tracking project creation events with proper session management
 */

import { supabase } from "../supabase";
import { adminService } from "./adminService";

export const projectCreationTracker = {
  /**
   * Track a project creation event with proper session handling
   */
  async trackProjectCreation(projectData: {
    projectId: string;
    projectTitle: string;
    department?: string;
    userId?: string;
  }): Promise<boolean> {
    try {
      let userId = projectData.userId;
      if (!userId) {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();
        if (userError || !user) {
          return false;
        }
        userId = user.id;
      }

      let sessionId = await adminService.getCurrentUserActiveSession(userId);
      if (!sessionId) {
        sessionId = await adminService.startUserSession(
          userId,
          "unknown",
          navigator?.userAgent || "unknown",
        );
        if (!sessionId) {
          return false;
        }
      }

      return await adminService.logUserActivity(
        userId,
        sessionId,
        "project_creation",
        {
          project_id: projectData.projectId,
          project_title: projectData.projectTitle,
          department: projectData.department,
          timestamp: new Date().toISOString(),
        },
        window?.location?.href || "unknown",
      );
    } catch (error) {
      return false;
    }
  },

  /**
   * Test the project creation tracking system
   */
  async testProjectCreationTracking(): Promise<boolean> {
    try {
      const testProjectData = {
        projectId: `test-project-${Date.now()}`,
        projectTitle: "Test Project for Tracking",
        department: "Test Department",
      };

      return await this.trackProjectCreation(testProjectData);
    } catch (error) {
      return false;
    }
  },
};
