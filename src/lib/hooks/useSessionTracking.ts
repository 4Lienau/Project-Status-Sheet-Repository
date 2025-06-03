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

  // Handle page unload to end session
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (sessionIdRef.current) {
        console.log(
          "[useSessionTracking] Page unloading, ending session:",
          sessionIdRef.current,
        );
        // Use synchronous call for immediate session end
        adminService.endUserSession(sessionIdRef.current);
      }
    };

    const handleUnload = () => {
      if (sessionIdRef.current) {
        console.log(
          "[useSessionTracking] Page unloaded, ending session:",
          sessionIdRef.current,
        );
        // Synchronous session end for page unload
        adminService.endUserSession(sessionIdRef.current);
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden && sessionIdRef.current) {
        console.log(
          "[useSessionTracking] Page hidden, ending session:",
          sessionIdRef.current,
        );
        // End session when page becomes hidden (user switched tabs/minimized)
        setTimeout(() => {
          if (sessionIdRef.current && document.hidden) {
            adminService.endUserSession(sessionIdRef.current);
            sessionIdRef.current = null;
          }
        }, 30000); // Wait 30 seconds before ending session
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("unload", handleUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("unload", handleUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

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

        // Set timeout to detect inactivity (5 minutes for more accurate tracking)
        activityTimeoutRef.current = setTimeout(
          () => {
            if (sessionIdRef.current) {
              console.log(
                "[useSessionTracking] User inactive for 5 minutes, ending session",
              );
              endSession();
            }
          },
          5 * 60 * 1000,
        ); // 5 minutes
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
      if (now - lastActivity > 30000) {
        // Track every 30 seconds for more responsive session tracking
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
      console.log("[useSessionTracking] Starting session for user:", {
        userId: user.id,
        email: user.email,
        timestamp: new Date().toISOString(),
        currentSessionId: sessionIdRef.current,
      });

      // Get user's IP and user agent (basic info)
      const userAgent = navigator.userAgent;

      const sessionId = await adminService.startUserSession(
        user.id,
        undefined, // IP address not easily available in browser
        userAgent,
      );

      console.log("[useSessionTracking] Session creation result:", {
        sessionId,
        success: !!sessionId,
        userId: user.id,
      });

      if (sessionId) {
        sessionIdRef.current = sessionId;
        console.log("[useSessionTracking] Session ID stored:", sessionId);

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

        // Force multiple immediate activity updates to ensure session is marked as active
        setTimeout(() => {
          if (sessionIdRef.current) {
            console.log(
              "[useSessionTracking] First activity update for session:",
              sessionIdRef.current,
            );
            adminService.updateSessionActivity(sessionIdRef.current);
          }
        }, 500);

        setTimeout(() => {
          if (sessionIdRef.current) {
            console.log(
              "[useSessionTracking] Second activity update for session:",
              sessionIdRef.current,
            );
            adminService.updateSessionActivity(sessionIdRef.current);
          }
        }, 2000);

        // Verify session was created by checking database
        setTimeout(async () => {
          if (sessionIdRef.current) {
            console.log(
              "[useSessionTracking] Verifying session exists in database:",
              sessionIdRef.current,
            );
            try {
              const { data: sessionCheck, error: checkError } = await supabase
                .from("user_sessions")
                .select("id, user_id, is_active, session_start, last_activity")
                .eq("id", sessionIdRef.current)
                .single();

              console.log("[useSessionTracking] Session verification result:", {
                sessionCheck,
                checkError,
                sessionId: sessionIdRef.current,
              });
            } catch (verifyError) {
              console.error(
                "[useSessionTracking] Session verification failed:",
                verifyError,
              );
            }
          }
        }, 3000);
      } else {
        console.error(
          "[useSessionTracking] Failed to create session for user:",
          user.id,
        );
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

        // End all sessions for this user to ensure cleanup
        await adminService.endAllUserSessions(user.id);
      } else {
        // If no user context, just end the specific session
        await adminService.endUserSession(sessionIdRef.current);
      }

      sessionIdRef.current = null;
    } catch (error) {
      console.error("[useSessionTracking] Error ending session:", error);
    }
  };

  const startHeartbeat = () => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }

    console.log(
      "[useSessionTracking] Starting heartbeat for session:",
      sessionIdRef.current,
    );

    // Send heartbeat every 30 seconds for more accurate active user tracking
    heartbeatIntervalRef.current = setInterval(() => {
      if (sessionIdRef.current && user) {
        console.log("[useSessionTracking] Sending heartbeat for session:", {
          sessionId: sessionIdRef.current,
          userId: user.id,
          timestamp: new Date().toISOString(),
        });
        adminService.updateSessionActivity(sessionIdRef.current);
      } else {
        console.warn(
          "[useSessionTracking] Heartbeat skipped - no session or user:",
          {
            hasSession: !!sessionIdRef.current,
            hasUser: !!user,
          },
        );
      }
    }, 30 * 1000); // 30 seconds for more frequent updates
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
