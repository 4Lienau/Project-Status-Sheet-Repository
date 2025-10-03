import React, { useState, useRef, useEffect } from "react";

interface ProgressPillProps {
  completion: number;
  status?: string;
  dueDate?: string;
  onChange: (value: number) => void;
}

export const ProgressPill: React.FC<ProgressPillProps> = ({
  completion,
  status,
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

  // Determine color based on completion percentage, status, and due date
  const getBackgroundColor = () => {
    // If task is complete, use blue
    if (completion === 100) return "bg-blue-100 text-blue-800";

    // For milestones, use status color
    if (status) {
      switch (status) {
        case "green":
          return "bg-green-100 text-green-800";
        case "yellow":
          return "bg-yellow-100 text-yellow-800";
        case "red":
          return "bg-red-100 text-red-800";
        default:
          return "bg-gray-100 text-gray-800";
      }
    }

    // For activities, use due date logic
    if (dueDate) {
      const today = new Date();
      const due = new Date(dueDate);
      const diffTime = due.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // Past due
      if (diffDays < 0) {
        return "bg-red-100 text-red-800";
      }
      // Due within 1 day with <80% completion
      if (diffDays <= 1 && completion < 80) {
        return "bg-red-100 text-red-800";
      }
      // Due within 2 days with <40% completion
      if (diffDays <= 2 && completion < 40) {
        return "bg-red-100 text-red-800";
      }
      // Due within 5 days
      if (diffDays <= 5) {
        return "bg-yellow-100 text-yellow-800";
      }
      // On track
      return "bg-green-100 text-green-800";
    }

    // Default
    return "bg-gray-100 text-gray-800";
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
          className="w-full h-7 px-2 py-0 text-xs text-center border border-blue-400 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white dark:text-gray-900 dark:bg-white dark:focus:text-gray-900 dark:caret-gray-900"
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