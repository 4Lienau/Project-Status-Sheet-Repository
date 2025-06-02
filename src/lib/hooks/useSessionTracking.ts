import { useEffect, useRef } from "react";
import { useAuth } from "./useAuth";
import { adminService } from "../services/adminService";
import { supabase } from "../supabase";

/**
 * Hook to track user sessions and activity for usage analytics
 */
export const useSessionTracking = () => {
  const { user } = useAuth();
  const sessionIdRef = useRef<string | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const activityTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Start session when user logs in
  useEffect(() => {
    if (user && !sessionIdRef.current) {
      startSession();
    } else if (!user && sessionIdRef.current) {
      endSession();
    }

    return () => {
      if (sessionIdRef.current) {
        endSession();
      }
    };
  }, [user]);

  // Track page visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page is hidden, pause heartbeat
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
          heartbeatIntervalRef.current = null;
        }
      } else {
        // Page is visible, resume heartbeat
        if (sessionIdRef.current && !heartbeatIntervalRef.current) {
          startHeartbeat();
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // Track user activity (mouse, keyboard, scroll)
  useEffect(() => {
    const trackActivity = () => {
      if (sessionIdRef.current) {
        // Reset activity timeout
        if (activityTimeoutRef.current) {
          clearTimeout(activityTimeoutRef.current);
        }

        // Update session activity
        adminService.updateSessionActivity(sessionIdRef.current);

        // Set timeout to detect inactivity (30 minutes)
        activityTimeoutRef.current = setTimeout(
          () => {
            if (sessionIdRef.current) {
              endSession();
            }
          },
          30 * 60 * 1000,
        ); // 30 minutes
      }
    };

    const events = [
      "mousedown",
      "mousemove",
      "keypress",
      "scroll",
      "touchstart",
    ];

    // Throttle activity tracking to avoid too many calls
    let lastActivity = 0;
    const throttledTrackActivity = () => {
      const now = Date.now();
      if (now - lastActivity > 60000) {
        // Only track once per minute
        lastActivity = now;
        trackActivity();
      }
    };

    events.forEach((event) => {
      document.addEventListener(event, throttledTrackActivity, true);
    });

    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, throttledTrackActivity, true);
      });
      if (activityTimeoutRef.current) {
        clearTimeout(activityTimeoutRef.current);
      }
    };
  }, []);

  const startSession = async () => {
    if (!user) return;

    try {
      console.log("[useSessionTracking] Starting session for user:", user.id);

      // Get user's IP and user agent (basic info)
      const userAgent = navigator.userAgent;

      const sessionId = await adminService.startUserSession(
        user.id,
        undefined, // IP address not easily available in browser
        userAgent,
      );

      if (sessionId) {
        sessionIdRef.current = sessionId;
        startHeartbeat();

        // Log initial page view
        logActivity("session_start", {
          url: window.location.href,
          userAgent,
        });

        // Update daily metrics
        try {
          const { error: metricsError } = await supabase.rpc(
            "update_daily_usage_metrics",
            {
              p_user_id: user.id,
              p_activity_type: "login",
            },
          );

          if (metricsError) {
            console.error(
              "[useSessionTracking.startSession] Error updating metrics:",
              metricsError,
            );
          }
        } catch (metricsError) {
          console.error(
            "[useSessionTracking.startSession] Metrics update failed:",
            metricsError,
          );
        }

        // Force an immediate activity update to ensure session is marked as active
        setTimeout(() => {
          if (sessionIdRef.current) {
            adminService.updateSessionActivity(sessionIdRef.current);
          }
        }, 1000);
      }
    } catch (error) {
      console.error("[useSessionTracking] Error starting session:", error);
    }
  };

  const endSession = async () => {
    if (!sessionIdRef.current) return;

    try {
      console.log("[useSessionTracking] Ending session:", sessionIdRef.current);

      // Stop heartbeat
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }

      // Clear activity timeout
      if (activityTimeoutRef.current) {
        clearTimeout(activityTimeoutRef.current);
        activityTimeoutRef.current = null;
      }

      // Log session end
      if (user) {
        await logActivity("session_end", {
          url: window.location.href,
        });
      }

      // End session in database
      await adminService.endUserSession(sessionIdRef.current);
      sessionIdRef.current = null;
    } catch (error) {
      console.error("[useSessionTracking] Error ending session:", error);
    }
  };

  const startHeartbeat = () => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }

    // Send heartbeat every 2 minutes for more accurate active user tracking
    heartbeatIntervalRef.current = setInterval(
      () => {
        if (sessionIdRef.current && user) {
          console.log(
            "[useSessionTracking] Sending heartbeat for session:",
            sessionIdRef.current,
          );
          adminService.updateSessionActivity(sessionIdRef.current);
        }
      },
      2 * 60 * 1000,
    ); // 2 minutes
  };

  const logActivity = async (activityType: string, activityData?: any) => {
    if (!user || !sessionIdRef.current) return;

    try {
      await adminService.logUserActivity(
        user.id,
        sessionIdRef.current,
        activityType,
        activityData,
        window.location.href,
      );
    } catch (error) {
      console.error("[useSessionTracking] Error logging activity:", error);
    }
  };

  // Public methods for manual activity logging
  const trackPageView = (url?: string) => {
    if (user && sessionIdRef.current) {
      console.log(
        "[useSessionTracking] Tracking page view:",
        url || window.location.href,
      );
      logActivity("page_view", {
        url: url || window.location.href,
        timestamp: new Date().toISOString(),
      });
    } else {
      console.log(
        "[useSessionTracking] Cannot track page view - no user or session:",
        {
          hasUser: !!user,
          hasSession: !!sessionIdRef.current,
        },
      );
    }
  };

  const trackFeatureUse = (feature: string, data?: any) => {
    if (user && sessionIdRef.current) {
      logActivity("feature_use", {
        feature,
        ...data,
        timestamp: new Date().toISOString(),
      });
    }
  };

  const trackProjectAction = (
    action: string,
    projectId?: string,
    data?: any,
  ) => {
    if (user && sessionIdRef.current) {
      logActivity("project_action", {
        action,
        projectId,
        ...data,
        timestamp: new Date().toISOString(),
      });
    }
  };

  return {
    sessionId: sessionIdRef.current,
    trackPageView,
    trackFeatureUse,
    trackProjectAction,
    logActivity,
  };
};
