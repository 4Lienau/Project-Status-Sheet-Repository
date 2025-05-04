import React, { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Info, Trash2, TextCursorInput } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";

interface NextPeriodActivitiesSectionProps {
  formData: any;
  setFormData: (updater: (prev: any) => any) => void;
}

interface ProgressPillProps {
  completion: number;
  dueDate?: string;
  onChange: (value: number) => void;
}

const ProgressPill: React.FC<ProgressPillProps> = ({
  completion,
  dueDate,
  onChange,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(completion.toString());
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus the input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Determine color based on completion percentage and due date
  const getBackgroundColor = () => {
    // If task is complete, use blue
    if (completion === 100) return "bg-blue-100 text-blue-800";

    // If no due date, base on completion only
    if (!dueDate) {
      if (completion >= 50) return "bg-green-100 text-green-800";
      return "bg-yellow-100 text-yellow-800";
    }

    // Check if task is past due or due within 14 days
    const today = new Date();
    const dueDateTime = new Date(dueDate);
    const twoWeeksFromNow = new Date();
    twoWeeksFromNow.setDate(today.getDate() + 14);

    // If past due and not complete, use red
    if (dueDateTime < today && completion < 100) {
      return "bg-red-100 text-red-800";
    }

    // Progressive risk calculation based on due date proximity
    // 1. If due within 1 day and less than 80% completion → red
    const oneDayFromNow = new Date();
    oneDayFromNow.setDate(today.getDate() + 1);
    if (dueDateTime <= oneDayFromNow && completion < 80) {
      return "bg-red-100 text-red-800";
    }

    // 2. If due within 2 days and less than 40% completion → red
    const twoDaysFromNow = new Date();
    twoDaysFromNow.setDate(today.getDate() + 2);
    if (dueDateTime <= twoDaysFromNow && completion < 40) {
      return "bg-red-100 text-red-800";
    }

    // 3. Check if task is at risk (due within 5 days)
    const fiveDaysFromNow = new Date();
    fiveDaysFromNow.setDate(today.getDate() + 5);

    if (dueDateTime <= fiveDaysFromNow && completion < 100) {
      return "bg-yellow-100 text-yellow-800";
    }

    // Otherwise, task is on track
    return "bg-green-100 text-green-800";
  };

  // Handle saving the new value
  const handleSave = () => {
    let newValue = parseInt(inputValue, 10);

    // Validate the input value
    if (isNaN(newValue)) {
      newValue = completion; // Revert to original value if invalid
    } else {
      // Ensure value is between 0 and 100
      newValue = Math.max(0, Math.min(100, newValue));
    }

    // Update the input value to the validated value
    setInputValue(newValue.toString());

    // Call the onChange callback with the new value
    if (newValue !== completion) {
      onChange(newValue);
    }

    // Exit edit mode
    setIsEditing(false);
  };

  // Handle key press events
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      setInputValue(completion.toString()); // Revert to original value
      setIsEditing(false);
    }
  };

  // Get the background and text color classes
  const colorClasses = getBackgroundColor();
  const bgColorClass = colorClasses.split(" ")[0];
  const textColorClass = colorClasses.split(" ")[1] || "";

  if (isEditing) {
    return (
      <div className="w-full relative h-7">
        <input
          ref={inputRef}
          type="number"
          min="0"
          max="100"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className="w-full h-7 px-2 py-0 text-xs text-center border border-blue-400 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
          style={{ appearance: "textfield" }}
        />
      </div>
    );
  }

  return (
    <div
      className="w-full h-7 bg-gray-200 rounded-full overflow-hidden relative cursor-pointer hover:ring-2 hover:ring-blue-300 transition-all"
      onClick={() => setIsEditing(true)}
      title="Click to edit completion percentage"
      style={{ width: "100%" }}
    >
      <div
        className={`h-full ${bgColorClass}`}
        style={{ width: `${completion}%` }}
      ></div>
      <div
        className={`absolute inset-0 flex items-center justify-center text-xs font-medium ${textColorClass}`}
      >
        {completion}%
      </div>
    </div>
  );
};

const STORAGE_KEY = "truncate_activities_preference";

const NextPeriodActivitiesSection: React.FC<
  NextPeriodActivitiesSectionProps
> = ({ formData, setFormData }) => {
  // Initialize from localStorage or default to true
  const [truncateActivities, setTruncateActivities] = useState(() => {
    const savedPreference = localStorage.getItem(STORAGE_KEY);
    return savedPreference !== null ? savedPreference === "true" : true;
  });

  // Update localStorage when preference changes
  const updateTruncatePreference = useCallback((checked: boolean) => {
    setTruncateActivities(checked);
    localStorage.setItem(STORAGE_KEY, checked.toString());
  }, []);

  // Sync with localStorage on mount
  useEffect(() => {
    const savedPreference = localStorage.getItem(STORAGE_KEY);
    if (savedPreference !== null) {
      setTruncateActivities(savedPreference === "true");
    }
  }, []);
  return (
    <TooltipProvider>
      <div className="flex items-center justify-between mb-2 -mt-2">
        <div className="flex items-center gap-1">
          <h3 className="text-2xl font-bold text-blue-800">
            Next Period Activities
          </h3>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-4 w-4 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs">
                List activities planned for the next reporting period, including
                dates, completion percentages, and assignees.
              </p>
            </TooltipContent>
          </Tooltip>
        </div>
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <TextCursorInput className="h-4 w-4 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs">
                Toggle whether activity descriptions should be truncated in the
                status sheet view.
              </p>
            </TooltipContent>
          </Tooltip>
          <div className="flex items-center space-x-2">
            <Switch
              id="truncate-activities"
              checked={truncateActivities}
              onCheckedChange={updateTruncatePreference}
              className="data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-gray-300"
            />
            <Label
              htmlFor="truncate-activities"
              className="text-sm text-gray-600"
            >
              Truncate activities in status sheet
            </Label>
          </div>
        </div>
      </div>
      <div className="space-y-2 bg-white/80 backdrop-blur-sm rounded-md p-4 border border-gray-100 shadow-sm mt-0">
        {/* Column Headers */}
        <div className="grid grid-cols-[140px_1fr_80px_150px_auto] gap-2 items-start">
          <div className="font-medium text-sm text-blue-800">Date</div>
          <div className="font-medium text-sm text-blue-800">Activity</div>
          <div className="font-medium text-sm text-blue-800 flex items-center gap-1 -ml-4">
            <span>% Complete</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="font-medium mb-1">Color Status Guide:</p>
                <ul className="space-y-1 text-sm">
                  <li className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-100"></div>
                    <span>Blue: 100% complete</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-100"></div>
                    <span>Green: On track</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-yellow-100"></div>
                    <span>Yellow: Due within 5 days</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-100"></div>
                    <span>
                      Red: At risk - Past due, due within 1 day with &lt;80%
                      completion, or due within 2 days with &lt;40% completion
                    </span>
                  </li>
                </ul>
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="font-medium text-sm text-blue-800">Assignee</div>
          <div></div>
        </div>
        {/* Create a sorted array with original indices */}
        {(() => {
          // Create array of [item, originalIndex] pairs
          const itemsWithIndices = formData.nextPeriodActivities.map(
            (item, index) => ({
              item,
              originalIndex: index,
            }),
          );

          // Sort by date
          const sortedItems = [...itemsWithIndices].sort((a, b) =>
            a.item.date.localeCompare(b.item.date),
          );

          // Render the sorted items
          return sortedItems.map(({ item, originalIndex }) => (
            <div
              key={originalIndex}
              className="grid grid-cols-[140px_1fr_80px_150px_auto] gap-2 items-start"
            >
              <Input
                type="date"
                value={item.date}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    nextPeriodActivities: prev.nextPeriodActivities.map(
                      (a, i) =>
                        i === originalIndex
                          ? { ...a, date: e.target.value }
                          : a,
                    ),
                  }))
                }
                className="bg-white/50 backdrop-blur-sm border-gray-200/50"
              />
              <Input
                value={item.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    nextPeriodActivities: prev.nextPeriodActivities.map(
                      (a, i) =>
                        i === originalIndex
                          ? { ...a, description: e.target.value }
                          : a,
                    ),
                  }))
                }
                placeholder="Enter activity"
                className="bg-white/50 backdrop-blur-sm border-gray-200/50"
              />
              <div className="flex flex-row items-center">
                <div className="flex-1">
                  <ProgressPill
                    completion={item.completion}
                    dueDate={item.date}
                    onChange={(value) =>
                      setFormData((prev) => ({
                        ...prev,
                        nextPeriodActivities: prev.nextPeriodActivities.map(
                          (a, i) =>
                            i === originalIndex
                              ? { ...a, completion: value }
                              : a,
                        ),
                      }))
                    }
                  />
                </div>
              </div>
              <Input
                value={item.assignee}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    nextPeriodActivities: prev.nextPeriodActivities.map(
                      (a, i) =>
                        i === originalIndex
                          ? { ...a, assignee: e.target.value }
                          : a,
                    ),
                  }))
                }
                placeholder="Enter assignee"
                className="bg-white/50 backdrop-blur-sm border-gray-200/50"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() =>
                  setFormData((prev) => ({
                    ...prev,
                    nextPeriodActivities: prev.nextPeriodActivities.filter(
                      (_, i) => i !== originalIndex,
                    ),
                  }))
                }
                className="h-9 w-9 p-0"
              >
                <Trash2 className="h-4 w-4 text-gray-500 hover:text-red-500" />
              </Button>
            </div>
          ));
        })()}
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            setFormData((prev) => ({
              ...prev,
              nextPeriodActivities: [
                ...prev.nextPeriodActivities,
                {
                  description: "",
                  date: new Date().toISOString().split("T")[0],
                  completion: 0,
                  assignee: "",
                },
              ],
            }))
          }
          className="bg-white/50 backdrop-blur-sm border-gray-200/50"
        >
          Add Activity
        </Button>
      </div>
    </TooltipProvider>
  );
};

export default NextPeriodActivitiesSection;
