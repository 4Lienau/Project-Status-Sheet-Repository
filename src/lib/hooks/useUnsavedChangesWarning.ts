import { useCallback, useEffect, useState } from "react";
import {
  useNavigate,
  useBeforeUnload,
  UNSAFE_NavigationContext,
} from "react-router-dom";
import { useContext } from "react";

type NavigationBlockerCallback = () => void;

/**
 * Custom hook to handle unsaved changes warnings when navigating away from a page
 * @param hasUnsavedChanges Boolean indicating if there are unsaved changes
 * @param handleShowWarning Function to show the warning dialog
 */
export function useUnsavedChangesWarning(
  hasUnsavedChanges: boolean,
  handleShowWarning: (callback: NavigationBlockerCallback) => void,
) {
  // Get the navigation context from React Router
  const { navigator } = useContext(UNSAFE_NavigationContext);
  const navigate = useNavigate();

  // Handle browser's native beforeunload event
  useBeforeUnload(
    useCallback(
      (event) => {
        if (hasUnsavedChanges) {
          event.preventDefault();
          return "You have unsaved changes. Are you sure you want to leave?";
        }
      },
      [hasUnsavedChanges],
    ),
  );

  // Set up a navigation blocker
  useEffect(() => {
    if (!hasUnsavedChanges) return;

    // React Router v6 uses a different API for blocking navigation
    // We need to use the useBlocker hook or manually create a blocker
    let unblock = () => {};

    // We're not using navigator.block anymore since it's not available in newer React Router versions
    // Instead, we'll rely on the beforeunload event for all navigation
    if (typeof window !== "undefined") {
      // Fallback to window.onbeforeunload for page navigation/refresh
      const onBeforeUnload = (e: BeforeUnloadEvent) => {
        if (hasUnsavedChanges) {
          e.preventDefault();
          e.returnValue = "";
          return "";
        }
      };

      window.addEventListener("beforeunload", onBeforeUnload);
      unblock = () =>
        window.removeEventListener("beforeunload", onBeforeUnload);
    }

    return unblock;
  }, [hasUnsavedChanges, navigator, handleShowWarning]);

  // Custom navigation function that checks for unsaved changes
  const navigateSafely = useCallback(
    (to: string | number, options?: { replace?: boolean }) => {
      if (hasUnsavedChanges) {
        handleShowWarning(() => {
          if (typeof to === "string") {
            navigate(to, options);
          } else if (typeof to === "number") {
            navigate(to);
          }
        });
      } else {
        if (typeof to === "string") {
          navigate(to, options);
        } else if (typeof to === "number") {
          navigate(to);
        }
      }
    },
    [hasUnsavedChanges, handleShowWarning, navigate],
  );

  return { navigateSafely };
}
