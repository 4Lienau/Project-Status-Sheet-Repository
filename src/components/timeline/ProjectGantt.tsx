import React, { useState } from "react";
import { format, addDays } from "date-fns";
import { ChevronDown, ChevronRight, ChevronsDownUp, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface TimelineTask {
  description: string;
  assignee: string;
  date: string;
  completion: number;
  duration_days?: number;
}

export interface TimelineMilestone {
  date: string;
  endDate?: string; // Optional end date for single-line display
  end_date?: string; // Database field name for end date
  milestone: string;
  status?: "green" | "yellow" | "red";
  completion?: number;
  owner?: string;
  tasksCount?: number; // optional count of tasks for tooltip
  tasks?: TimelineTask[]; // full task data for sub-rows
}

interface ProjectGanttProps {
  projectTitle?: string;
  startDate?: string | null;
  endDate?: string | null;
  milestones?: TimelineMilestone[];
  zoom?: "weekly" | "monthly" | "quarterly" | "yearly";
  overallStatusColor?: "green" | "yellow" | "red";
  healthCalculationType?: string | null;
  rowLabelText?: string; // NEW: Customizable label for the left column header
}

// Lightweight, dependency-free timeline visualization
// Renders a project duration and milestone rows over a scalable time grid
const parseDate = (d?: string | null) => (d ? new Date(d) : null);

const dateDiffInDays = (a: Date, b: Date) => {
  const ms = b.getTime() - a.getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
};

const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));

const statusColor = (status?: "green" | "yellow" | "red") => {
  switch (status) {
    case "green":
      return "bg-green-500 border-green-600";
    case "yellow":
      return "bg-yellow-500 border-yellow-600";
    case "red":
      return "bg-red-500 border-red-600";
    default:
      return "bg-blue-500/80 border-blue-600";
  }
};

const ProjectGantt: React.FC<ProjectGanttProps> = ({
  projectTitle = "Project Timeline",
  startDate = null,
  endDate = null,
  milestones = [],
  zoom = "weekly",
  overallStatusColor = "green",
  healthCalculationType = null,
  rowLabelText = "Milestone", // NEW: Default to "Milestone"
}) => {
  // Scale per zoom level (px per day)
  const dayWidth = zoom === "weekly" ? 24 : zoom === "monthly" ? 8 : zoom === "quarterly" ? 3 : 1.5;

  // Derive range from milestones if not provided
  const milestoneStartDates = milestones
    .map((m) => new Date(m.date))
    .filter((d) => !isNaN(d.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());
  
  // Use end_date if available, otherwise fall back to date
  const milestoneEndDates = milestones
    .map((m) => new Date(m.endDate || m.end_date || m.date))
    .filter((d) => !isNaN(d.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());

  let start = parseDate(startDate) || (milestoneStartDates[0] ? new Date(milestoneStartDates[0]) : null);
  let end = parseDate(endDate) || (milestoneEndDates[milestoneEndDates.length - 1] ? new Date(milestoneEndDates[milestoneEndDates.length - 1]) : null);

  if (!start && !end) {
    return (
      <div className="w-full bg-card text-foreground border border-border rounded-lg p-6">
        <div className="text-lg font-semibold">{projectTitle}</div>
        <div className="text-muted-foreground mt-2">No schedule data yet. Add project dates or milestones to see a timeline.</div>
      </div>
    );
  }

  // If only one bound is available, align the other to it
  if (start && !end) end = new Date(start);
  if (end && !start) start = new Date(end);

  // Ensure start <= end
  if (start && end && start > end) {
    const tmp = start;
    start = end;
    end = tmp;
  }

  // Add a small buffer on both sides for readability
  const bufferedStart = start ? new Date(start.getTime()) : null;
  const bufferedEnd = end ? new Date(end.getTime()) : null;
  if (bufferedStart) bufferedStart.setDate(bufferedStart.getDate() - 2);
  if (bufferedEnd) bufferedEnd.setDate(bufferedEnd.getDate() + 2);

  const totalDays = start && end ? dateDiffInDays(start, end) + 1 : 1;
  const gridDays = bufferedStart && bufferedEnd ? dateDiffInDays(bufferedStart, bufferedEnd) + 1 : totalDays + 4;
  // Make grid wide enough and add a 1-day buffer so the last bar/tick never bleeds off
  const gridWidth = Math.max(320, Math.ceil(gridDays * dayWidth) + Math.ceil(dayWidth));

  const xForDate = (d: Date) => {
    if (!bufferedStart) return 0;
    const daysFromStart = dateDiffInDays(bufferedStart, d);
    return clamp(daysFromStart * dayWidth, 0, gridWidth);
  };

  const projectBarLeft = start ? xForDate(start) : 0;
  // Inclusive right edge (end day included)
  const projectBarRightInclusive = end ? xForDate(addDays(end, 1)) : projectBarLeft;
  const projectBarWidth = Math.max(8, projectBarRightInclusive - projectBarLeft);

  // Generate hierarchical ticks based on zoom level (primary + secondary)
  type Tick = { left: number; label: string };
  const ticksPrimary: Tick[] = [];
  const ticksSecondary: Tick[] = [];
  const quarterLines: number[] = []; // used in yearly view to add quarter markers

  if (bufferedStart) {
    const cursor = new Date(bufferedStart);
    const endCursor = new Date(bufferedEnd || bufferedStart);
    let lastPrimaryLabelLeft = -Infinity;
    let lastSecondaryLabelLeft = -Infinity;
    const minPrimarySpacing = 80; // px
    const minSecondarySpacing = 50; // px

    while (cursor <= endCursor) {
      const isMonday = cursor.getDay() === 1;
      const isFirstOfMonth = cursor.getDate() === 1;
      const month = cursor.getMonth();
      const isQuarterStart = isFirstOfMonth && [0, 3, 6, 9].includes(month);
      const isYearStart = isFirstOfMonth && month === 0;
      const left = xForDate(new Date(cursor));

      if (zoom === "weekly") {
        // Primary: week start label; Secondary: days
        if (isMonday || cursor.getTime() === bufferedStart.getTime()) {
          if (left - lastPrimaryLabelLeft > minPrimarySpacing) {
            ticksPrimary.push({ left, label: `Week of ${format(cursor, "MMM d")}` });
            lastPrimaryLabelLeft = left;
          }
        }
        if (left - lastSecondaryLabelLeft > minSecondarySpacing) {
          ticksSecondary.push({ left, label: format(cursor, "EEE d") });
          lastSecondaryLabelLeft = left;
        }
      } else if (zoom === "monthly") {
        // Primary: Month label; Secondary: Weeks (Mondays)
        if (isFirstOfMonth) {
          if (left - lastPrimaryLabelLeft > minPrimarySpacing) {
            ticksPrimary.push({ left, label: format(cursor, "MMM yyyy") });
            lastPrimaryLabelLeft = left;
          }
        }
        if (isMonday) {
          if (left - lastSecondaryLabelLeft > minSecondarySpacing) {
            ticksSecondary.push({ left, label: `Wk ${format(cursor, "w")}` });
            lastSecondaryLabelLeft = left;
          }
        }
      } else if (zoom === "quarterly") {
        // Primary: Quarter label; Secondary: Months
        if (isQuarterStart) {
          if (left - lastPrimaryLabelLeft > minPrimarySpacing) {
            const q = Math.floor(month / 3) + 1;
            ticksPrimary.push({ left, label: `Q${q} ${format(cursor, "yyyy")}` });
            lastPrimaryLabelLeft = left;
          }
        }
        if (isFirstOfMonth) {
          if (left - lastSecondaryLabelLeft > minSecondarySpacing) {
            ticksSecondary.push({ left, label: format(cursor, "MMM") });
            lastSecondaryLabelLeft = left;
          }
        }
      } else {
        // yearly -> Primary: Year; Secondary: Months; Quarter marks as stronger lines
        if (isYearStart) {
          if (left - lastPrimaryLabelLeft > minPrimarySpacing) {
            ticksPrimary.push({ left, label: format(cursor, "yyyy") });
            lastPrimaryLabelLeft = left;
          }
        }
        if (isFirstOfMonth) {
          if (left - lastSecondaryLabelLeft > minSecondarySpacing) {
            ticksSecondary.push({ left, label: format(cursor, "MMM") });
            lastSecondaryLabelLeft = left;
          }
        }
        if (isQuarterStart) {
          quarterLines.push(left);
        }
      }

      cursor.setDate(cursor.getDate() + 1);
    }
  }

  // Milestone rows: derive durations between consecutive milestones (last -> project end)
  const rowHeight = 38; // px per row
  const taskRowHeight = 30; // px per task sub-row
  const minBarPx = Math.max(10, dayWidth); // ensure visibility for same-day ranges

  // Track which milestones are expanded to show tasks
  const [expandedMilestones, setExpandedMilestones] = useState<Set<number>>(new Set());

  const toggleMilestoneExpand = (idx: number) => {
    setExpandedMilestones(prev => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  };

  const validMilestones = [...milestones]
    .map((m) => ({ 
      ...m, 
      _date: new Date(m.date), 
      _endDate: m.endDate ? new Date(m.endDate) : (m.end_date ? new Date(m.end_date) : null), // Support both endDate and end_date
      _tasksCount: (m as any)?.tasksCount ?? (m.tasks?.length ?? 0),
      _tasks: m.tasks || [],
    }))
    .filter((m) => !isNaN(m._date.getTime()))
    .sort((a, b) => a._date.getTime() - b._date.getTime());

  type Row = {
    label: string;
    start: Date;
    end: Date;
    status?: "green" | "yellow" | "red";
    completion?: number;
    tasksCount?: number;
    tasks?: TimelineTask[];
  };

  const rows: Row[] = validMilestones.map((m, i) => {
    // NEW: Use explicit endDate if provided, otherwise calculate from next milestone
    const next = m._endDate || validMilestones[i + 1]?._date || end || m._date;
    let rowStart = new Date(m._date);
    let rowEnd = new Date(next);
    if (rowEnd < rowStart) rowEnd = new Date(rowStart);
    return {
      label: m.milestone,
      start: rowStart,
      end: rowEnd,
      status: m.status as Row["status"],
      completion: m.completion,
      tasksCount: m._tasksCount,
      tasks: m._tasks,
    };
  });

  // Toggle all milestones that have tasks
  const toggleAllMilestones = () => {
    const milestonesWithTasks = rows
      .map((r, idx) => ({ idx, hasTasks: (r.tasks?.length ?? 0) > 0 }))
      .filter(m => m.hasTasks)
      .map(m => m.idx);
    
    if (milestonesWithTasks.length === 0) return;
    
    const allExpanded = milestonesWithTasks.every(idx => expandedMilestones.has(idx));
    
    if (allExpanded) {
      // Collapse all
      setExpandedMilestones(new Set());
    } else {
      // Expand all
      setExpandedMilestones(new Set(milestonesWithTasks));
    }
  };

  // Dynamic left column width to fit labels up to MAX_LABEL_CHARS
  const MAX_LABEL_CHARS = 45;
  const CHAR_WIDTH_APPROX = 8; // px per character (approx.)
  const PADDING = 80; // px (icon + padding)
  const MIN_LEFT_COL = 260;
  const MAX_LEFT_COL = 600;
  const longestLen = rows.length > 0 ? Math.max(...rows.map((r) => r.label.length)) : 0;
  const visibleLen = Math.min(longestLen, MAX_LABEL_CHARS);
  const leftColWidth = clamp(visibleLen * CHAR_WIDTH_APPROX + PADDING, MIN_LEFT_COL, MAX_LEFT_COL);

  const today = new Date();
  const showToday = Boolean(
    bufferedStart && bufferedEnd && today.getTime() >= bufferedStart.getTime() && today.getTime() <= bufferedEnd.getTime(),
  );
  const todayLeft = showToday ? xForDate(today) : null;

  // Map overall status color to label and dot color classes
  const statusText = overallStatusColor === "red" ? "Critical" : overallStatusColor === "yellow" ? "At Risk" : "On Track";
  const statusDotClass = overallStatusColor === "red"
    ? "bg-red-500 border-red-600"
    : overallStatusColor === "yellow"
    ? "bg-yellow-500 border-yellow-600"
    : "bg-green-500 border-green-600";

  // Check if any milestones have tasks and if all are expanded
  const milestonesWithTasks = rows.filter(r => r.tasks && r.tasks.length > 0);
  const allExpanded = milestonesWithTasks.length > 0 && 
    milestonesWithTasks.every((_, idx) => expandedMilestones.has(rows.findIndex(r => r === milestonesWithTasks[idx])));

  return (
    <div className="w-full bg-card text-foreground border border-border rounded-lg p-4">
      <div className="mb-3 flex items-center justify-between">
        {start && end && (
          <div className="text-sm text-muted-foreground">
            {format(start, "MMM d, yyyy")} – {format(end, "MMM d, yyyy")} ({totalDays} day{totalDays === 1 ? "" : "s"})
          </div>
        )}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className={`inline-block w-2.5 h-2.5 rounded-full border ${statusDotClass}`} />
            <span className="text-sm">{statusText}</span>
            {healthCalculationType && (
              <span className="text-xs text-muted-foreground">{healthCalculationType === "manual" ? "Manual" : "Automatic"}</span>
            )}
          </div>
          {milestonesWithTasks.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={toggleAllMilestones}
              className="h-7 px-2 text-xs"
            >
              {allExpanded ? (
                <>
                  <ChevronsUpDown className="h-3.5 w-3.5 mr-1.5" />
                  Collapse All
                </>
              ) : (
                <>
                  <ChevronsDownUp className="h-3.5 w-3.5 mr-1.5" />
                  Expand All
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* FIXED: New layout with fixed left column and scrollable right section */}
      <div className="flex border border-border rounded-lg overflow-hidden">
        {/* Fixed left column */}
        <div className="flex-shrink-0 bg-card" style={{ width: leftColWidth }}>
          {/* Left header */}
          <div className="h-14 flex items-center px-3 text-xs text-muted-foreground border-b border-border bg-card">
            {rowLabelText}
          </div>
          {/* Left labels */}
          {rows.length > 0 ? (
            rows.map((r, idx) => {
              const displayLabel = r.label.length > MAX_LABEL_CHARS ? `${r.label.slice(0, MAX_LABEL_CHARS - 1)}…` : r.label;
              const hasTasks = r.tasks && r.tasks.length > 0;
              const isExpanded = expandedMilestones.has(idx);
              return (
                <React.Fragment key={idx}>
                  <div 
                    className="h-[38px] px-3 flex items-center border-b border-border bg-card cursor-pointer"
                    title={`${r.label} (${format(r.start, "MMM d")} – ${format(r.end, "MMM d")})`}
                    onClick={() => hasTasks && toggleMilestoneExpand(idx)}
                  >
                    {hasTasks ? (
                      <span className="mr-1.5 flex-shrink-0 text-muted-foreground">
                        {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                      </span>
                    ) : (
                      <span className="mr-1.5 w-3.5 flex-shrink-0" />
                    )}
                    <div className="truncate">{displayLabel}</div>
                    {hasTasks && (
                      <span className="ml-1.5 text-xs text-muted-foreground flex-shrink-0">
                        ({r.tasks!.length})
                      </span>
                    )}
                  </div>
                  {/* Task sub-row labels */}
                  {isExpanded && r.tasks && r.tasks.map((task, tIdx) => {
                    const taskLabel = task.description || "Untitled task";
                    const truncatedTaskLabel = taskLabel.length > (MAX_LABEL_CHARS - 4) ? `${taskLabel.slice(0, MAX_LABEL_CHARS - 5)}…` : taskLabel;
                    return (
                      <div
                        key={`task-label-${idx}-${tIdx}`}
                        className="h-[30px] pl-8 pr-3 flex items-center border-b border-border/50 bg-card/60"
                        title={`${taskLabel} (${task.assignee || "unassigned"})`}
                      >
                        <span className="text-xs text-muted-foreground truncate">↳ {truncatedTaskLabel}</span>
                      </div>
                    );
                  })}
                </React.Fragment>
              );
            })
          ) : (
            <div className="h-[38px] px-3 flex items-center border-b border-border bg-card text-muted-foreground">
              Project
            </div>
          )}
        </div>

        {/* Scrollable right section */}
        <div className="flex-1 overflow-x-auto">
          <div style={{ width: gridWidth }}>
            {/* Right header with hierarchical ticks and today marker */}
            <div className="relative h-14 border-b border-border bg-background">
              {/* Primary lines */}
              {ticksPrimary.map((t, i) => (
                <div key={`p-line-${i}`} className="absolute top-0 bottom-0 w-[1.5px] bg-border" style={{ left: t.left }} />
              ))}
              {/* Secondary lines */}
              {ticksSecondary.map((t, i) => (
                <div key={`s-line-${i}`} className="absolute top-0 bottom-0 w-px bg-border/70" style={{ left: t.left }} />
              ))}
              {/* Quarter marks (yearly) */}
              {quarterLines.map((left, i) => (
                <div key={`q-line-${i}`} className="absolute top-0 bottom-0 w-[2px] bg-foreground/30" style={{ left }} />
              ))}
              {/* Labels: primary (top) */}
              {ticksPrimary.map((t, i) => (
                <div key={`p-lbl-${i}`} className="absolute top-0 left-2 text-[11px] text-muted-foreground" style={{ left: t.left }}>
                  {t.label}
                </div>
              ))}
              {/* Labels: secondary (bottom) */}
              {ticksSecondary.map((t, i) => (
                <div key={`s-lbl-${i}`} className="absolute bottom-0 left-2 text-[11px] text-muted-foreground" style={{ left: t.left }}>
                  {t.label}
                </div>
              ))}
              {showToday && (
                <div
                  className="absolute top-0 bottom-0 w-[3px] bg-red-500"
                  style={{ left: todayLeft || 0 }}
                  title={`Today • ${format(today, "MMM d, yyyy")}`}
                />
              )}
            </div>

            {/* Timeline bars */}
            {rows.length > 0 ? (
              rows.map((r, idx) => {
                // Inclusive right edge; clamp to grid bounds
                const left = clamp(xForDate(r.start), 0, gridWidth);
                const rightInclusive = clamp(xForDate(addDays(r.end, 1)), 0, gridWidth);
                const width = Math.max(minBarPx, rightInclusive - left);
                const color = statusColor(r.status);
                const pct = clamp((r.completion ?? 0) / 100, 0, 1);
                const progressWidth = Math.max(0, Math.floor(width * pct));
                const displayLabel = r.label.length > MAX_LABEL_CHARS ? `${r.label.slice(0, MAX_LABEL_CHARS - 1)}…` : r.label;
                const durationDays = dateDiffInDays(r.start, r.end) + 1;
                const isExpanded = expandedMilestones.has(idx);
                const hasTasks = r.tasks && r.tasks.length > 0;
                return (
                  <React.Fragment key={idx}>
                    <div className="relative border-b border-border h-[38px] bg-background">
                      {/* Vertical primary/secondary grid lines */}
                      {ticksPrimary.map((t, i) => (
                        <div key={`row-${idx}-p-${i}`} className="absolute top-0 bottom-0 w-[1.5px] bg-border" style={{ left: t.left }} />
                      ))}
                      {ticksSecondary.map((t, i) => (
                        <div key={`row-${idx}-s-${i}`} className="absolute top-0 bottom-0 w-px bg-border/70" style={{ left: t.left }} />
                      ))}
                      {quarterLines.map((l, i) => (
                        <div key={`row-${idx}-q-${i}`} className="absolute top-0 bottom-0 w-[2px] bg-foreground/30" style={{ left: l }} />
                      ))}
                      {/* Today marker */}
                      {showToday && (
                        <div className="absolute top-0 bottom-0 w-[3px] bg-red-500" style={{ left: todayLeft || 0 }} />
                      )}
                      {/* Bar */}
                      <div
                        className={`absolute top-1.5 h-6 rounded-md shadow-sm text-[11px] leading-6 text-white dark:text-black px-2 overflow-hidden whitespace-nowrap ${color}`}
                        style={{ left, width }}
                        title={
                          `${r.label}\n${format(r.start, "MMM d, yyyy")} → ${format(r.end, "MMM d, yyyy")}\n` +
                          `Status: ${r.status ?? "n/a"}\nTasks: ${r.tasksCount ?? 0}\n% Complete: ${Math.round((r.completion ?? 0))}%\nDuration: ${durationDays} day${durationDays === 1 ? "" : "s"}`
                        }
                      >
                        {/* Progress overlay */}
                        <div className="absolute inset-y-0 left-0 bg-white/30" style={{ width: progressWidth }} />
                        <span className="truncate">{displayLabel}</span>
                      </div>
                    </div>
                    {/* Task sub-rows */}
                    {isExpanded && r.tasks && r.tasks.map((task, tIdx) => {
                      const taskStartDate = task.date ? new Date(task.date) : r.start;
                      const taskDuration = task.duration_days || 1;
                      const taskEndDate = addDays(taskStartDate, taskDuration);
                      const taskLeft = clamp(xForDate(taskStartDate), 0, gridWidth);
                      const taskRight = clamp(xForDate(taskEndDate), 0, gridWidth);
                      const taskWidth = Math.max(minBarPx, taskRight - taskLeft);
                      const taskPct = clamp((task.completion ?? 0) / 100, 0, 1);
                      const taskProgressWidth = Math.max(0, Math.floor(taskWidth * taskPct));
                      // Task bars use a distinct purple/indigo color to differentiate from milestones
                      const taskColor = "bg-purple-400/70 border-purple-600/70";
                      return (
                        <div key={`task-bar-${idx}-${tIdx}`} className="relative border-b border-border/50 h-[30px] bg-background/50">
                          {/* Grid lines for task rows */}
                          {ticksPrimary.map((t, i) => (
                            <div key={`task-${idx}-${tIdx}-p-${i}`} className="absolute top-0 bottom-0 w-[1.5px] bg-border/50" style={{ left: t.left }} />
                          ))}
                          {ticksSecondary.map((t, i) => (
                            <div key={`task-${idx}-${tIdx}-s-${i}`} className="absolute top-0 bottom-0 w-px bg-border/40" style={{ left: t.left }} />
                          ))}
                          {showToday && (
                            <div className="absolute top-0 bottom-0 w-[3px] bg-red-500/50" style={{ left: todayLeft || 0 }} />
                          )}
                          {/* Task bar */}
                          <div
                            className={`absolute top-1 h-5 rounded border border-dashed text-[10px] leading-5 text-foreground/80 px-1.5 overflow-hidden whitespace-nowrap ${taskColor}`}
                            style={{ left: taskLeft, width: taskWidth }}
                            title={
                              `${task.description || "Untitled"}\nAssignee: ${task.assignee || "unassigned"}\n` +
                              `Start: ${task.date ? format(taskStartDate, "MMM d, yyyy") : "n/a"}\nDuration: ${taskDuration} day${taskDuration === 1 ? "" : "s"}\n% Complete: ${Math.round(task.completion ?? 0)}%`
                            }
                          >
                            {/* Task progress overlay */}
                            <div className="absolute inset-y-0 left-0 bg-white/25" style={{ width: taskProgressWidth }} />
                            <span className="truncate">{task.description || "Untitled"}</span>
                          </div>
                        </div>
                      );
                    })}
                  </React.Fragment>
                );
              })
            ) : (
              // Fallback: show a single project bar when no milestone rows are available
              <div className="relative border-b border-border h-[38px] bg-background">
                {ticksPrimary.map((t, i) => (
                  <div key={`p-tick-${i}`} className="absolute top-0 bottom-0 w-[1.5px] bg-border" style={{ left: t.left }} />
                ))}
                {ticksSecondary.map((t, i) => (
                  <div key={`s-tick-${i}`} className="absolute top-0 bottom-0 w-px bg-border/70" style={{ left: t.left }} />
                ))}
                {quarterLines.map((l, i) => (
                  <div key={`q-tick-${i}`} className="absolute top-0 bottom-0 w-[2px] bg-foreground/30" style={{ left: l }} />
                ))}
                {showToday && <div className="absolute top-0 bottom-0 w-[3px] bg-red-500" style={{ left: todayLeft || 0 }} />}
                <div
                  className="absolute top-1.5 h-6 rounded-md bg-blue-500/80 border border-blue-600 shadow-sm"
                  style={{ left: projectBarLeft, width: projectBarWidth }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
        <div className="flex items-center gap-2"><span className="w-4 h-2 bg-blue-500/80 border border-blue-600 rounded-sm" /> Project duration</div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-green-500 border border-green-600" /> Green</div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-yellow-500 border border-yellow-600" /> Yellow</div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-red-500 border border-red-600" /> Red</div>
        <div className="flex items-center gap-2"><span className="w-4 h-2 bg-green-400/60 border border-dashed border-green-500/60 rounded-sm" /> Sub-task</div>
        {showToday && <div className="flex items-center gap-2"><span className="w-[3px] h-4 bg-red-500" /> Today</div>}
      </div>
    </div>
  );
};

export default ProjectGantt;