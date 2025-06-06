import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, X } from "lucide-react";
import UserSelectionPopup from "./user-selection-popup";

interface UserSelectionInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  multiSelect?: boolean;
  className?: string;
  id?: string;
  disabled?: boolean;
}

const UserSelectionInput: React.FC<UserSelectionInputProps> = ({
  value,
  onChange,
  placeholder = "Click to select users...",
  multiSelect = false,
  className = "",
  id,
  disabled = false,
}) => {
  const [showPopup, setShowPopup] = useState(false);

  // Parse the current value into an array of user names
  const selectedUsers = value
    ? value
        .split(",")
        .map((name) => name.trim())
        .filter(Boolean)
    : [];

  const handleUserSelection = (users: string[], searchTerm?: string) => {
    console.log("[UserSelectionInput] User selection received:", {
      users,
      searchTerm,
    });
    const newValue = users.join(", ");
    onChange(newValue);
  };

  const removeUser = (userToRemove: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedUsers = selectedUsers.filter((user) => user !== userToRemove);
    handleUserSelection(updatedUsers);
  };

  const handleInputClick = () => {
    if (!disabled) {
      setShowPopup(true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleInputClick();
    }
  };

  return (
    <div className="bg-white rounded-md">
      <div className="relative">
        {/* Input Field */}
        <div
          className={`relative cursor-pointer ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
          onClick={handleInputClick}
        >
          <Input
            id={id}
            value={value}
            placeholder={placeholder}
            className={`pr-10 cursor-pointer rounded-md ${className}`}
            readOnly
            disabled={disabled}
            onKeyDown={handleKeyDown}
            tabIndex={disabled ? -1 : 0}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-gray-100"
            onClick={handleInputClick}
            disabled={disabled}
            tabIndex={-1}
          >
            <Users className="h-4 w-4 text-gray-500" />
          </Button>
        </div>

        {/* Selected Users Display removed - no badges below input */}
      </div>

      {/* User Selection Popup */}
      <UserSelectionPopup
        open={showPopup}
        onOpenChange={setShowPopup}
        onSelect={handleUserSelection}
        multiSelect={multiSelect}
        title={multiSelect ? "Select Users" : "Select User"}
        placeholder="Search users by name, email, or department..."
        selectedUsers={selectedUsers}
      />
    </div>
  );
};

export default UserSelectionInput;
