/**
 * File: useUnsavedChangesWarning.ts
 * Purpose: Custom hook for handling unsaved changes warnings during navigation
 * Description: This hook provides functionality to warn users about unsaved changes when
 * navigating away from a form or editor. It handles both browser's native beforeunload event
 * and React Router navigation, allowing for custom confirmation dialogs. The hook also provides
 * a safe navigation function that checks for unsaved changes before navigating.
 *
 * Imports from:
 * - React core libraries
 * - React Router navigation hooks and context
 *
 * Used by:
 * - src/components/ProjectForm.tsx
 * - src/pages/ProjectDashboard.tsx
 * - Other components with forms that need unsaved changes protection
 */

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
          event.returnValue =
            "You have unsaved changes. Are you sure you want to leave?";
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
          e.returnValue =
            "You have unsaved changes. Are you sure you want to leave?";
          return "You have unsaved changes. Are you sure you want to leave?";
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
      // Double-check the form element directly to ensure we have the latest state
      const formElement = document.querySelector("form");
      const formHasChanges =
        formElement?.getAttribute("data-has-changes") === "true";
      const formHasInteraction =
        formElement?.getAttribute("data-user-interaction") === "true";
      const shouldCheckChanges = formHasChanges && formHasInteraction;

      // Check for a special flag that indicates we just saved
      const justSaved = formElement?.getAttribute("data-just-saved") === "true";

      console.log("Navigation check:", {
        hasUnsavedChanges,
        formHasChanges,
        formHasInteraction,
        shouldCheckChanges,
        justSaved,
      });

      // Only show warning if there are unsaved changes and we didn't just save
      if ((hasUnsavedChanges || shouldCheckChanges) && !justSaved) {
        handleShowWarning(() => {
          if (typeof to === "string") {
            navigate(to, options);
          } else if (typeof to === "number") {
            navigate(to);
          }
        });
      } else {
        // If we just saved, clear the flag
        if (justSaved && formElement) {
          formElement.setAttribute("data-just-saved", "false");
        }

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
