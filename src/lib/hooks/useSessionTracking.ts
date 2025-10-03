import { useEffect, useRef, useCallback } from "react";
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
  const isStartingSessionRef = useRef(false);

  // Memoize callback functions to prevent dependency changes
  const trackPageView = useCallback((url?: string) => {
    if (user && sessionIdRef.current) {
      adminService.logUserActivity(
        user.id,
        sessionIdRef.current,
        "page_view",
        {
          url: url || window.location.href,
          timestamp: new Date().toISOString(),
        },
        window.location.href,
      ).catch(() => {
        // Silently ignore errors
      });
    }
  }, [user]);

  const trackFeatureUse = useCallback((feature: string, data?: any) => {
    if (user && sessionIdRef.current) {
      adminService.logUserActivity(
        user.id,
        sessionIdRef.current,
        "feature_use",
        {
          feature,
          ...data,
          timestamp: new Date().toISOString(),
        },
        window.location.href,
      ).catch(() => {
        // Silently ignore errors
      });
    }
  }, [user]);

  const trackProjectAction = useCallback((
    action: string,
    projectId?: string,
    data?: any,
  ) => {
    if (user && sessionIdRef.current) {
      adminService.logUserActivity(
        user.id,
        sessionIdRef.current,
        "project_action",
        {
          action,
          projectId,
          ...data,
          timestamp: new Date().toISOString(),
        },
        window.location.href,
      ).catch(() => {
        // Silently ignore errors
      });
    }
  }, [user]);

  const logActivity = useCallback(async (activityType: string, activityData?: any) => {
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
      // Silently fail - don't block user experience
    }
  }, [user]);

  const startHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }

    // Send heartbeat every 30 seconds
    heartbeatIntervalRef.current = setInterval(() => {
      if (sessionIdRef.current && user) {
        adminService.updateSessionActivity(sessionIdRef.current).catch(() => {
          // Silently ignore errors
        });
      }
    }, 30 * 1000);
  }, [user]);

  const endSession = useCallback(async () => {
    if (!sessionIdRef.current) return;

    const currentSessionId = sessionIdRef.current;
    sessionIdRef.current = null;

    try {
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

      // End session (silently fail if error)
      if (user) {
        await adminService.endAllUserSessions(user.id).catch(() => {
          // Silently ignore errors
        });
      } else {
        await adminService.endUserSession(currentSessionId).catch(() => {
          // Silently ignore errors
        });
      }
    } catch (error) {
      // Silently fail - don't block user experience
    }
  }, [user]);

  const startSession = useCallback(async () => {
    if (!user || isStartingSessionRef.current) return;

    isStartingSessionRef.current = true;

    try {
      const userAgent = navigator.userAgent;

      const sessionId = await adminService.startUserSession(
        user.id,
        undefined,
        userAgent,
      );

      if (sessionId) {
        sessionIdRef.current = sessionId;
        startHeartbeat();

        // Log initial page view (silently fail if error)
        logActivity("session_start", {
          url: window.location.href,
          userAgent,
        }).catch(() => {
          // Silently ignore errors
        });

        // Update daily metrics (silently fail if error)
        supabase.rpc("update_daily_usage_metrics", {
          p_user_id: user.id,
          p_activity_type: "login",
        }).catch(() => {
          // Silently ignore errors
        });

        // Initial activity updates (silently fail if error)
        setTimeout(() => {
          if (sessionIdRef.current) {
            adminService.updateSessionActivity(sessionIdRef.current).catch(() => {
              // Silently ignore errors
            });
          }
        }, 500);
      }
    } catch (error) {
      // Silently fail - don't block user experience
    } finally {
      isStartingSessionRef.current = false;
    }
  }, [user, startHeartbeat, logActivity]);

  // Start session when user logs in
  useEffect(() => {
    if (user && !sessionIdRef.current && !isStartingSessionRef.current) {
      startSession();
    } else if (!user && sessionIdRef.current) {
      endSession();
    }

    return () => {
      if (sessionIdRef.current) {
        endSession();
      }
    };
  }, [user, startSession, endSession]);

  // Handle page unload to end session
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (sessionIdRef.current) {
        // Use navigator.sendBeacon for reliable session end on page unload
        const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/user_sessions?id=eq.${sessionIdRef.current}`;
        const data = JSON.stringify({
          is_active: false,
          session_end: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        
        try {
          navigator.sendBeacon(url, data);
        } catch (error) {
          // Silently fail - don't block page unload
        }
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
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
  }, [startHeartbeat]);

  // Track user activity (mouse, keyboard, scroll)
  useEffect(() => {
    const trackActivity = () => {
      if (sessionIdRef.current) {
        // Reset activity timeout
        if (activityTimeoutRef.current) {
          clearTimeout(activityTimeoutRef.current);
        }

        // Update session activity (silently fail if error)
        adminService.updateSessionActivity(sessionIdRef.current).catch(() => {
          // Silently ignore errors
        });

        // Set timeout to detect inactivity (5 minutes)
        activityTimeoutRef.current = setTimeout(
          () => {
            if (sessionIdRef.current) {
              endSession();
            }
          },
          5 * 60 * 1000,
        );
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
  }, [endSession]);

  return {
    sessionId: sessionIdRef.current,
    trackPageView,
    trackFeatureUse,
    trackProjectAction,
    logActivity,
  };
};