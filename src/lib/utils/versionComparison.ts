/**
 * Version Comparison Utilities
 * Functions to compare project versions and identify changes
 */

export interface FieldChange {
  fieldPath: string;
  oldValue: any;
  newValue: any;
  changeType: "added" | "removed" | "modified";
}

export interface VersionChanges {
  [fieldPath: string]: FieldChange;
}

/**
 * Normalize a value for comparison (handles null, undefined, empty strings)
 */
const normalizeValue = (value: any): any => {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  if (typeof value === "string") {
    return value.trim();
  }
  if (typeof value === "number" && isNaN(value)) {
    return null;
  }
  return value;
};

/**
 * Deep equality comparison that handles data structure differences
 */
const deepEqual = (obj1: any, obj2: any): boolean => {
  // Normalize values first
  const val1 = normalizeValue(obj1);
  const val2 = normalizeValue(obj2);

  // Handle null/undefined cases
  if (val1 === null && val2 === null) return true;
  if (val1 === null || val2 === null) return false;

  // Handle primitive types
  if (typeof val1 !== "object" || typeof val2 !== "object") {
    return val1 === val2;
  }

  // Handle arrays
  if (Array.isArray(val1) && Array.isArray(val2)) {
    if (val1.length !== val2.length) return false;
    return val1.every((item, index) => deepEqual(item, val2[index]));
  }

  // Handle objects
  if (Array.isArray(val1) || Array.isArray(val2)) return false;

  const keys1 = Object.keys(val1).sort();
  const keys2 = Object.keys(val2).sort();

  if (keys1.length !== keys2.length) return false;
  if (!keys1.every((key) => keys2.includes(key))) return false;

  return keys1.every((key) => deepEqual(val1[key], val2[key]));
};

/**
 * Create a stable identifier for a milestone based on its content
 */
const createMilestoneId = (milestone: any): string => {
  const date = normalizeValue(milestone.date) || "no-date";
  const text = normalizeValue(milestone.milestone) || "no-text";
  const owner = normalizeValue(milestone.owner) || "no-owner";

  // Create a content-based ID that doesn't depend on array position
  return `${date}|${text}|${owner}`.toLowerCase();
};

/**
 * Compare milestones arrays and detect granular changes
 */
const compareMilestones = (
  currentMilestones: any[],
  previousMilestones: any[],
): VersionChanges => {
  const changes: VersionChanges = {};

  // Create content-based maps for comparison
  const currentMap = new Map<
    string,
    { milestone: any; originalIndex: number }
  >();
  const previousMap = new Map<
    string,
    { milestone: any; originalIndex: number }
  >();

  // Map current milestones by content-based ID
  currentMilestones.forEach((milestone, index) => {
    const id = createMilestoneId(milestone);
    // If there's a duplicate ID, make it unique by appending the index
    let uniqueId = id;
    let counter = 0;
    while (currentMap.has(uniqueId)) {
      counter++;
      uniqueId = `${id}_${counter}`;
    }
    currentMap.set(uniqueId, { milestone, originalIndex: index });
  });

  // Map previous milestones by content-based ID
  previousMilestones.forEach((milestone, index) => {
    const id = createMilestoneId(milestone);
    // If there's a duplicate ID, make it unique by appending the index
    let uniqueId = id;
    let counter = 0;
    while (previousMap.has(uniqueId)) {
      counter++;
      uniqueId = `${id}_${counter}`;
    }
    previousMap.set(uniqueId, { milestone, originalIndex: index });
  });

  // Check for milestone additions - only flag milestones that are truly new
  currentMap.forEach(({ milestone, originalIndex }, id) => {
    if (!previousMap.has(id)) {
      // Use a stable identifier for added milestones based on content, not array position
      const stableId = createMilestoneId(milestone);
      changes[`milestone_added_${stableId}`] = {
        fieldPath: `milestones[${originalIndex}]`,
        oldValue: null,
        newValue: milestone,
        changeType: "added",
      };
    }
  });

  // Check for milestone deletions
  previousMap.forEach(({ milestone, originalIndex }, id) => {
    if (!currentMap.has(id)) {
      // Use a stable identifier for removed milestones based on content, not array position
      const stableId = createMilestoneId(milestone);
      changes[`milestone_removed_${stableId}`] = {
        fieldPath: `milestones[${originalIndex}]`,
        oldValue: milestone,
        newValue: null,
        changeType: "removed",
      };
    }
  });

  // Check for milestone modifications (same milestone ID, different properties)
  currentMap.forEach(
    ({ milestone: currentMilestone, originalIndex: currentIndex }, id) => {
      const previousEntry = previousMap.get(id);
      if (previousEntry) {
        const { milestone: previousMilestone } = previousEntry;
        const stableId = createMilestoneId(currentMilestone);

        // Compare individual properties with normalization
        const fieldsToCompare = [
          { key: "completion", label: "Completion %" },
          { key: "status", label: "Status" },
          { key: "owner", label: "Owner" },
          { key: "date", label: "Date" },
          { key: "milestone", label: "Milestone" },
        ];

        fieldsToCompare.forEach((field) => {
          const currentValue = normalizeValue(currentMilestone[field.key]);
          const previousValue = normalizeValue(previousMilestone[field.key]);

          if (currentValue !== previousValue) {
            // Use stable ID instead of array index to prevent false positives
            changes[`milestone_${field.key}_${stableId}`] = {
              fieldPath: `milestones[${currentIndex}].${field.key}`,
              oldValue: previousValue,
              newValue: currentValue,
              changeType: "modified",
            };
          }
        });

        // Compare tasks with deep equality
        const currentTasks = currentMilestone.tasks || [];
        const previousTasks = previousMilestone.tasks || [];

        if (!deepEqual(currentTasks, previousTasks)) {
          changes[`milestone_tasks_${stableId}`] = {
            fieldPath: `milestones[${currentIndex}].tasks`,
            oldValue: previousTasks,
            newValue: currentTasks,
            changeType: "modified",
          };
        }
      }
    },
  );

  return changes;
};

/**
 * Calculate budget status based on budget values
 */
const calculateBudgetStatus = (
  total: number | string,
  actuals: number | string,
  forecast: number | string,
): string => {
  // Convert string values to numbers if needed
  const actualsNum =
    typeof actuals === "string"
      ? parseFloat(actuals.toString().replace(/,/g, ""))
      : actuals || 0;
  const totalNum =
    typeof total === "string"
      ? parseFloat(total.toString().replace(/,/g, ""))
      : total || 0;
  const forecastNum =
    typeof forecast === "string"
      ? parseFloat(forecast.toString().replace(/,/g, ""))
      : forecast || 0;

  if (actualsNum + forecastNum > totalNum) return "At Risk";
  if (actualsNum > totalNum) return "Over Budget";
  return "On Budget";
};

/**
 * Compare two project versions and return a map of changes
 */
export const compareVersions = (
  currentVersion: any,
  previousVersion: any,
): VersionChanges => {
  const changes: VersionChanges = {};

  if (!currentVersion || !previousVersion) {
    return changes;
  }

  // Define fields to compare with their paths
  const fieldsToCompare = [
    { path: "title", label: "Title" },
    { path: "description", label: "Description" },
    { path: "status", label: "Status" },
    { path: "budget_total", label: "Budget Total" },
    { path: "budget_actuals", label: "Budget Actuals" },
    { path: "budget_forecast", label: "Budget Forecast" },
    { path: "sponsors", label: "Sponsors" },
    { path: "business_leads", label: "Business Leads" },
    { path: "project_manager", label: "Project Manager" },
    { path: "charter_link", label: "Charter Link" },
    { path: "health_calculation_type", label: "Health Calculation" },
    { path: "manual_health_percentage", label: "Manual Health %" },
    { path: "manual_status_color", label: "Status Color" },
  ];

  // Compare simple fields with normalization
  fieldsToCompare.forEach((field) => {
    const currentValue = normalizeValue(currentVersion[field.path]);
    const previousValue = normalizeValue(previousVersion[field.path]);

    if (currentValue !== previousValue) {
      changes[field.path] = {
        fieldPath: field.path,
        oldValue: previousValue,
        newValue: currentValue,
        changeType: "modified",
      };
    }
  });

  // Compare calculated budget status
  const currentBudgetStatus = calculateBudgetStatus(
    currentVersion.budget_total,
    currentVersion.budget_actuals,
    currentVersion.budget_forecast,
  );
  const previousBudgetStatus = calculateBudgetStatus(
    previousVersion.budget_total,
    previousVersion.budget_actuals,
    previousVersion.budget_forecast,
  );

  if (currentBudgetStatus !== previousBudgetStatus) {
    changes["budget_status"] = {
      fieldPath: "budget_status",
      oldValue: previousBudgetStatus,
      newValue: currentBudgetStatus,
      changeType: "modified",
    };
  }

  // Compare overall completion percentage (calculated vs manual)
  const calculateOverallCompletion = (version: any): number => {
    if (version.health_calculation_type === "manual") {
      return version.manual_health_percentage || 0;
    }
    // For automatic calculation, we need to calculate weighted completion
    // This is a simplified version - in practice this should match the calculateWeightedCompletion function
    const milestones = version.milestones || [];
    if (milestones.length === 0) return 0;

    const totalWeight = milestones.reduce(
      (sum: number, m: any) => sum + (m.weight || 3),
      0,
    );
    const weightedCompletion = milestones.reduce((sum: number, m: any) => {
      const weight = m.weight || 3;
      const completion = m.completion || 0;
      return sum + weight * completion;
    }, 0);

    return totalWeight > 0 ? Math.round(weightedCompletion / totalWeight) : 0;
  };

  const currentOverallCompletion = calculateOverallCompletion(currentVersion);
  const previousOverallCompletion = calculateOverallCompletion(previousVersion);

  if (currentOverallCompletion !== previousOverallCompletion) {
    changes["overall_completion"] = {
      fieldPath: "overall_completion",
      oldValue: previousOverallCompletion,
      newValue: currentOverallCompletion,
      changeType: "modified",
    };
  }

  // Compare milestones with improved logic - only add granular changes, not general milestone changes
  const currentMilestones = currentVersion.milestones || [];
  const previousMilestones = previousVersion.milestones || [];

  // Always perform detailed milestone comparison to get granular changes
  const milestoneChanges = compareMilestones(
    currentMilestones,
    previousMilestones,
  );

  // Add individual milestone field changes - these are the specific changes we want to show
  Object.keys(milestoneChanges).forEach((changeKey) => {
    changes[changeKey] = milestoneChanges[changeKey];
  });

  // Never add the general "milestones" change indicator to prevent double indicators
  // The granular changes (milestone_added_, milestone_completion_, etc.) are sufficient

  // Compare accomplishments with normalization
  // Accomplishments can be stored as objects with description property or as simple strings
  const normalizeAccomplishments = (accomplishments: any[]): string[] => {
    return accomplishments
      .map((item) => {
        if (typeof item === "string") {
          return normalizeValue(item) || "";
        }
        if (typeof item === "object" && item !== null) {
          return normalizeValue(item.description) || "";
        }
        return "";
      })
      .filter((item) => item !== ""); // Remove empty items
  };

  const currentAccomplishments = normalizeAccomplishments(
    currentVersion.accomplishments || [],
  );
  const previousAccomplishments = normalizeAccomplishments(
    previousVersion.accomplishments || [],
  );

  if (!deepEqual(currentAccomplishments, previousAccomplishments)) {
    changes["accomplishments"] = {
      fieldPath: "accomplishments",
      oldValue: previousAccomplishments,
      newValue: currentAccomplishments,
      changeType: "modified",
    };
  }

  // Compare next period activities with normalization
  // Activities can have different structures, normalize them for comparison
  const normalizeActivities = (activities: any[]): any[] => {
    return activities
      .map((item) => {
        if (typeof item === "string") {
          return {
            description: normalizeValue(item) || "",
            date: "",
            completion: 0,
            assignee: "",
          };
        }
        if (typeof item === "object" && item !== null) {
          return {
            description: normalizeValue(item.description) || "",
            date: normalizeValue(item.date) || "",
            completion:
              typeof item.completion === "number" ? item.completion : 0,
            assignee: normalizeValue(item.assignee) || "",
          };
        }
        return {
          description: "",
          date: "",
          completion: 0,
          assignee: "",
        };
      })
      .filter((item) => item.description !== ""); // Remove items with empty descriptions
  };

  const currentActivities = normalizeActivities(
    currentVersion.next_period_activities || [],
  );
  const previousActivities = normalizeActivities(
    previousVersion.next_period_activities || [],
  );

  if (!deepEqual(currentActivities, previousActivities)) {
    changes["next_period_activities"] = {
      fieldPath: "next_period_activities",
      oldValue: previousActivities,
      newValue: currentActivities,
      changeType: "modified",
    };
  }

  // Compare risks with normalization
  // Risks can be stored as objects with description and impact properties or as simple strings
  const normalizeRisks = (risks: any[]): any[] => {
    return risks
      .map((item) => {
        if (typeof item === "string") {
          return {
            description: normalizeValue(item) || "",
            impact: "",
          };
        }
        if (typeof item === "object" && item !== null) {
          return {
            description: normalizeValue(item.description) || "",
            impact: normalizeValue(item.impact) || "",
          };
        }
        return {
          description: "",
          impact: "",
        };
      })
      .filter((item) => item.description !== ""); // Remove items with empty descriptions
  };

  const currentRisks = normalizeRisks(currentVersion.risks || []);
  const previousRisks = normalizeRisks(previousVersion.risks || []);

  if (!deepEqual(currentRisks, previousRisks)) {
    changes["risks"] = {
      fieldPath: "risks",
      oldValue: previousRisks,
      newValue: currentRisks,
      changeType: "modified",
    };
  }

  // Compare considerations with deep equality
  const currentConsiderations = currentVersion.considerations || [];
  const previousConsiderations = previousVersion.considerations || [];

  if (!deepEqual(currentConsiderations, previousConsiderations)) {
    changes["considerations"] = {
      fieldPath: "considerations",
      oldValue: previousConsiderations,
      newValue: currentConsiderations,
      changeType: "modified",
    };
  }

  // Compare changes with normalization
  // Changes are objects with change, impact, and disposition properties
  const normalizeChanges = (changes: any[]): any[] => {
    return changes
      .map((item) => {
        if (typeof item === "object" && item !== null) {
          return {
            change: normalizeValue(item.change) || "",
            impact: normalizeValue(item.impact) || "",
            disposition: normalizeValue(item.disposition) || "",
          };
        }
        // Handle edge case where changes might be stored as strings
        if (typeof item === "string") {
          return {
            change: normalizeValue(item) || "",
            impact: "",
            disposition: "",
          };
        }
        return {
          change: "",
          impact: "",
          disposition: "",
        };
      })
      .filter((item) => item.change !== ""); // Remove items with empty change descriptions
  };

  const currentChanges = normalizeChanges(currentVersion.changes || []);
  const previousChanges = normalizeChanges(previousVersion.changes || []);

  if (!deepEqual(currentChanges, previousChanges)) {
    changes["changes"] = {
      fieldPath: "changes",
      oldValue: previousChanges,
      newValue: currentChanges,
      changeType: "modified",
    };
  }

  return changes;
};

/**
 * Get a human-readable description of what changed
 */
export const getChangeDescription = (change: FieldChange): string => {
  const { fieldPath, oldValue, newValue, changeType } = change;

  // Handle budget status changes
  if (fieldPath === "budget_status") {
    return `Budget status changed from "${oldValue}" to "${newValue}"`;
  }

  // Handle milestone-specific changes
  if (fieldPath.includes("milestones")) {
    if (fieldPath.includes("completion")) {
      return `Milestone completion changed from ${oldValue}% to ${newValue}%`;
    }
    if (fieldPath.includes("status")) {
      return `Milestone status changed from ${oldValue} to ${newValue}`;
    }
    if (fieldPath.includes("owner")) {
      return `Milestone owner changed from "${oldValue}" to "${newValue}"`;
    }
    if (fieldPath.includes("date")) {
      return `Milestone date changed from ${oldValue} to ${newValue}`;
    }
    if (fieldPath.includes("tasks")) {
      const oldCount = Array.isArray(oldValue) ? oldValue.length : 0;
      const newCount = Array.isArray(newValue) ? newValue.length : 0;
      return `Milestone tasks changed (${oldCount} → ${newCount} tasks)`;
    }
    if (changeType === "added") {
      return `New milestone added: "${newValue?.milestone || "Untitled"}"`;
    }
    if (changeType === "removed") {
      return `Milestone removed: "${oldValue?.milestone || "Untitled"}"`;
    }
  }

  switch (changeType) {
    case "added":
      return `${fieldPath} was added`;
    case "removed":
      return `${fieldPath} was removed`;
    case "modified":
      if (Array.isArray(newValue)) {
        const oldCount = Array.isArray(oldValue) ? oldValue.length : 0;
        const newCount = newValue.length;
        return `${fieldPath} changed (${oldCount} → ${newCount} items)`;
      }
      return `${fieldPath} changed`;
    default:
      return `${fieldPath} was modified`;
  }
};

/**
 * Check if a specific field has changes
 */
export const hasFieldChanged = (
  changes: VersionChanges,
  fieldPath: string,
): boolean => {
  return fieldPath in changes;
};

/**
 * Get the change indicator color based on change type
 */
export const getChangeIndicatorColor = (changeType: string): string => {
  switch (changeType) {
    case "added":
      return "bg-green-500";
    case "removed":
      return "bg-red-500";
    case "modified":
    default:
      return "bg-blue-500";
  }
};
