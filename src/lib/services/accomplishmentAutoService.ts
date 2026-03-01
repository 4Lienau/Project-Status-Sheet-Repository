/**
 * File: accomplishmentAutoService.ts
 * Purpose: Service for auto-copying completed milestones/tasks to accomplishments
 * Description: Handles detection of newly completed milestones and tasks,
 * generates accomplishment descriptions, prevents duplicates, and manages
 * the auto-copy confirmation workflow.
 */

import { supabase } from "@/lib/supabase";

export interface AccomplishmentItem {
  id?: string;
  description: string;
  source_type: "manual" | "milestone" | "task";
  source_id: string | null;
  is_hidden: boolean;
  is_deleted: boolean;
  auto_generated: boolean;
}

export interface CompletedItem {
  id: string;
  description: string;
  type: "milestone" | "task";
  parentMilestoneName?: string; // For tasks, the parent milestone name
}

/**
 * Abbreviate a milestone name for task context.
 * If milestone name is longer than 40 chars, truncate with ellipsis.
 */
function abbreviateMilestoneName(name: string): string {
  if (name.length <= 40) return name;
  return name.substring(0, 37) + "...";
}

/**
 * Generate an accomplishment description from a completed item.
 */
export function generateAccomplishmentDescription(item: CompletedItem): string {
  if (item.type === "milestone") {
    return item.description;
  }
  // For tasks, include abbreviated parent milestone context
  if (item.parentMilestoneName) {
    return `${item.description} (${abbreviateMilestoneName(item.parentMilestoneName)})`;
  }
  return item.description;
}

/**
 * Detect newly completed milestones and tasks by comparing old and new form data.
 * Only returns items that transitioned TO 100% (i.e., were NOT 100% before).
 */
export function detectNewlyCompletedItems(
  previousMilestones: any[],
  currentMilestones: any[],
  existingAccomplishments: AccomplishmentItem[],
): CompletedItem[] {
  const newlyCompleted: CompletedItem[] = [];

  // Build a map of previous milestone completions by a stable key
  // We use milestone description + date as a composite key since IDs may not persist
  const prevMilestoneMap = new Map<string, { completion: number; tasks: any[] }>();
  for (const m of previousMilestones) {
    const key = `milestone:${m.milestone || ""}:${m.date || ""}`;
    prevMilestoneMap.set(key, {
      completion: m.completion || 0,
      tasks: m.tasks || [],
    });
  }

  // Build a set of existing auto-generated source IDs to prevent duplicates
  const existingSourceIds = new Set(
    existingAccomplishments
      .filter((a) => a.auto_generated && !a.is_deleted)
      .map((a) => a.source_id)
      .filter(Boolean),
  );

  for (const milestone of currentMilestones) {
    const milestoneKey = `milestone:${milestone.milestone || ""}:${milestone.date || ""}`;
    const prevMilestone = prevMilestoneMap.get(milestoneKey);
    const prevCompletion = prevMilestone?.completion || 0;
    const currentCompletion = milestone.completion || 0;

    // Check if this milestone just reached 100%
    if (currentCompletion === 100 && prevCompletion < 100) {
      // Use the milestone ID if available, otherwise use key
      const sourceId = milestone.id || milestoneKey;
      if (!existingSourceIds.has(sourceId)) {
        newlyCompleted.push({
          id: sourceId,
          description: milestone.milestone || "",
          type: "milestone",
        });
      }
    }

    // Check tasks within this milestone
    const currentTasks = milestone.tasks || [];
    const prevTasks = prevMilestone?.tasks || [];

    // Build a map of previous task completions
    const prevTaskMap = new Map<string, number>();
    for (const t of prevTasks) {
      const taskKey = `task:${t.description || ""}:${milestone.milestone || ""}`;
      prevTaskMap.set(taskKey, t.completion || 0);
    }

    for (const task of currentTasks) {
      const taskKey = `task:${task.description || ""}:${milestone.milestone || ""}`;
      const prevTaskCompletion = prevTaskMap.get(taskKey) || 0;
      const currentTaskCompletion = task.completion || 0;

      if (currentTaskCompletion === 100 && prevTaskCompletion < 100) {
        const sourceId = task.id || taskKey;
        if (!existingSourceIds.has(sourceId)) {
          newlyCompleted.push({
            id: sourceId,
            description: task.description || "",
            type: "task",
            parentMilestoneName: milestone.milestone || "",
          });
        }
      }
    }
  }

  return newlyCompleted;
}

/**
 * Represents an un-completed item with all possible identifiers for matching.
 * Since task/milestone IDs can change across saves (delete + re-insert),
 * we include both the DB ID and the composite key for robust matching.
 */
export interface UncompletedItem {
  sourceId: string;       // task.id or milestoneKey (may have changed)
  compositeKey: string;   // Stable key: "task:description:milestoneName" or "milestone:name:date"
  description: string;    // The item description for matching against accomplishment text
  type: "milestone" | "task";
  parentMilestoneName?: string;
}

/**
 * Detect items that were un-completed (went from 100% back to < 100%).
 * Returns structured items with multiple identifiers to handle ID changes
 * that occur when tasks are deleted and re-inserted during saves.
 */
export function detectUncompletedItems(
  previousMilestones: any[],
  currentMilestones: any[],
): UncompletedItem[] {
  const uncompletedItems: UncompletedItem[] = [];

  const prevMilestoneMap = new Map<string, { completion: number; tasks: any[] }>();
  for (const m of previousMilestones) {
    const key = `milestone:${m.milestone || ""}:${m.date || ""}`;
    prevMilestoneMap.set(key, {
      completion: m.completion || 0,
      tasks: m.tasks || [],
    });
  }

  for (const milestone of currentMilestones) {
    const milestoneKey = `milestone:${milestone.milestone || ""}:${milestone.date || ""}`;
    const prevMilestone = prevMilestoneMap.get(milestoneKey);
    const prevCompletion = prevMilestone?.completion || 0;
    const currentCompletion = milestone.completion || 0;

    // Check if milestone went from 100% to lower
    if (prevCompletion === 100 && currentCompletion < 100) {
      const sourceId = milestone.id || milestoneKey;
      uncompletedItems.push({
        sourceId,
        compositeKey: milestoneKey,
        description: milestone.milestone || "",
        type: "milestone",
      });
    }

    // Check tasks
    const currentTasks = milestone.tasks || [];
    const prevTasks = prevMilestone?.tasks || [];

    const prevTaskMap = new Map<string, number>();
    for (const t of prevTasks) {
      const taskKey = `task:${t.description || ""}:${milestone.milestone || ""}`;
      prevTaskMap.set(taskKey, t.completion || 0);
    }

    for (const task of currentTasks) {
      const taskKey = `task:${task.description || ""}:${milestone.milestone || ""}`;
      const prevTaskCompletion = prevTaskMap.get(taskKey) || 0;
      const currentTaskCompletion = task.completion || 0;

      if (prevTaskCompletion === 100 && currentTaskCompletion < 100) {
        const sourceId = task.id || taskKey;
        uncompletedItems.push({
          sourceId,
          compositeKey: taskKey,
          description: task.description || "",
          type: "task",
          parentMilestoneName: milestone.milestone || "",
        });
      }
    }
  }

  return uncompletedItems;
}

/**
 * Convert legacy string accomplishments to AccomplishmentItem objects.
 * Used when loading projects that still have old-format accomplishments.
 */
export function normalizeAccomplishments(
  rawAccomplishments: any[],
): AccomplishmentItem[] {
  return rawAccomplishments.map((a) => {
    if (typeof a === "string") {
      return {
        description: a,
        source_type: "manual" as const,
        source_id: null,
        is_hidden: false,
        is_deleted: false,
        auto_generated: false,
      };
    }
    // Already an object from the database
    return {
      id: a.id,
      description: a.description || "",
      source_type: (a.source_type || "manual") as "manual" | "milestone" | "task",
      source_id: a.source_id || null,
      is_hidden: a.is_hidden || false,
      is_deleted: a.is_deleted || false,
      auto_generated: a.auto_generated || false,
    };
  });
}

/**
 * Convert AccomplishmentItem objects back to the format expected by the save service.
 * Visible items come first, then hidden items, then soft-deleted items.
 */
export function sortAccomplishments(
  accomplishments: AccomplishmentItem[],
): AccomplishmentItem[] {
  const visible = accomplishments.filter((a) => !a.is_hidden && !a.is_deleted);
  const hidden = accomplishments.filter((a) => a.is_hidden && !a.is_deleted);
  const deleted = accomplishments.filter((a) => a.is_deleted);
  return [...visible, ...hidden, ...deleted];
}
