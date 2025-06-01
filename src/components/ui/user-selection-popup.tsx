import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Search, User, X, Plus, Building2 } from "lucide-react";
import { adminService } from "@/lib/services/adminService";

interface DirectoryUser {
  id: string;
  display_name: string;
  email: string;
  job_title?: string;
  department?: string;
  sync_status: string;
}

interface CustomOther {
  id: string;
  display_name: string;
  type: "other";
}

interface UserSelectionPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (selectedUsers: string[]) => void;
  multiSelect?: boolean;
  title?: string;
  placeholder?: string;
  selectedUsers?: string[];
}

const UserSelectionPopup: React.FC<UserSelectionPopupProps> = ({
  open,
  onOpenChange,
  onSelect,
  multiSelect = false,
  title = "Select User",
  placeholder = "Search users...",
  selectedUsers = [],
}) => {
  const [users, setUsers] = useState<DirectoryUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<DirectoryUser[]>([]);
  const [customOthers, setCustomOthers] = useState<CustomOther[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [tempSelectedUsers, setTempSelectedUsers] =
    useState<string[]>(selectedUsers);
  const [showAddOtherOption, setShowAddOtherOption] = useState(false);

  // Load users when dialog opens
  useEffect(() => {
    if (open) {
      loadUsers();
      setTempSelectedUsers(selectedUsers);
      setSearchTerm("");
      setShowAddOtherOption(false);
      // Load custom others from localStorage
      loadCustomOthers();
    }
  }, [open, selectedUsers]);

  // Load custom others from localStorage (with backward compatibility)
  const loadCustomOthers = () => {
    try {
      // First try to load from new key
      let stored = localStorage.getItem("customOthers");
      let others = [];

      if (stored) {
        others = JSON.parse(stored);
      } else {
        // Check for old "customVendors" key for backward compatibility
        const oldStored = localStorage.getItem("customVendors");
        if (oldStored) {
          const oldVendors = JSON.parse(oldStored);
          // Convert old vendors to others format
          others = oldVendors.map((vendor: any) => ({
            ...vendor,
            type: "other",
            id: vendor.id.replace("vendor-", "other-"),
          }));
          // Save in new format and remove old key
          localStorage.setItem("customOthers", JSON.stringify(others));
          localStorage.removeItem("customVendors");
        }
      }

      setCustomOthers(others);
    } catch (error) {
      console.error("Error loading custom others from localStorage:", error);
    }
  };

  // Save custom others to localStorage
  const saveCustomOthers = (others: CustomOther[]) => {
    try {
      localStorage.setItem("customOthers", JSON.stringify(others));
    } catch (error) {
      console.error("Error saving custom others to localStorage:", error);
    }
  };

  // Update the setCustomOthers calls to also save to localStorage
  useEffect(() => {
    saveCustomOthers(customOthers);
  }, [customOthers]);

  // Filter users based on search term and check if we should show add other option
  useEffect(() => {
    console.log("[UserSelectionPopup] Filtering with search term:", searchTerm);
    console.log("[UserSelectionPopup] Total users to filter:", users.length);

    if (!searchTerm.trim()) {
      setFilteredUsers(users);
      setShowAddOtherOption(false);
      console.log(
        "[UserSelectionPopup] No search term, showing all users:",
        users.length,
      );
    } else {
      const searchLower = searchTerm.toLowerCase().trim();
      console.log("[UserSelectionPopup] Search term (lowercase):", searchLower);

      const filtered = users.filter((user) => {
        const displayNameMatch =
          user.display_name &&
          user.display_name.toLowerCase().includes(searchLower);
        const emailMatch =
          user.email && user.email.toLowerCase().includes(searchLower);
        const jobTitleMatch =
          user.job_title && user.job_title.toLowerCase().includes(searchLower);
        const departmentMatch =
          user.department &&
          user.department.toLowerCase().includes(searchLower);

        const matches =
          displayNameMatch || emailMatch || jobTitleMatch || departmentMatch;

        if (matches) {
          console.log("[UserSelectionPopup] Match found:", {
            user: user.display_name,
            email: user.email,
            displayNameMatch,
            emailMatch,
            jobTitleMatch,
            departmentMatch,
          });
        }

        return matches;
      });

      console.log("[UserSelectionPopup] Filtered results:", filtered.length);
      setFilteredUsers(filtered);

      // Also filter custom others based on search term
      const filteredOthers = customOthers.filter((other) =>
        other.display_name.toLowerCase().includes(searchLower),
      );

      // Show add other option ONLY if no results found (neither users nor others)
      // and the search term is not already selected
      const alreadySelected = tempSelectedUsers.some(
        (selected) => selected.toLowerCase() === searchLower,
      );

      setShowAddOtherOption(
        searchTerm.trim().length > 0 &&
          filtered.length === 0 &&
          filteredOthers.length === 0 &&
          !alreadySelected,
      );
    }
  }, [users, customOthers, searchTerm, tempSelectedUsers]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      console.log("[UserSelectionPopup] Starting to load users...");

      const directoryUsers = await adminService.getDirectoryUsers();

      console.log("[UserSelectionPopup] Raw directory users response:", {
        isArray: Array.isArray(directoryUsers),
        length: directoryUsers?.length || 0,
        type: typeof directoryUsers,
        data: directoryUsers,
      });

      if (!directoryUsers || directoryUsers.length === 0) {
        console.warn(
          "[UserSelectionPopup] No directory users returned from adminService.getDirectoryUsers()",
        );
        console.warn("[UserSelectionPopup] This could mean:");
        console.warn("  1. The directory_users table is empty");
        console.warn("  2. Azure AD sync hasn't been run");
        console.warn("  3. RLS policies are blocking access");
        console.warn(
          "  4. There's an error in the adminService.getDirectoryUsers() function",
        );
        setUsers([]);
        setFilteredUsers([]);
        return;
      }

      console.log(
        "[UserSelectionPopup] Sample raw user data:",
        directoryUsers.slice(0, 3),
      );

      // Log sync statuses and display names for debugging
      const syncStatuses = [
        ...new Set(directoryUsers.map((u) => u.sync_status)),
      ];
      const usersWithDisplayNames = directoryUsers.filter(
        (u) => u.display_name,
      ).length;
      const usersWithoutDisplayNames = directoryUsers.filter(
        (u) => !u.display_name,
      ).length;

      console.log("[UserSelectionPopup] User data analysis:", {
        totalUsers: directoryUsers.length,
        syncStatuses,
        usersWithDisplayNames,
        usersWithoutDisplayNames,
        sampleUsersWithoutDisplayNames: directoryUsers
          .filter((u) => !u.display_name)
          .slice(0, 2),
      });

      // Show users with display names (both active and inactive)
      const validUsers = directoryUsers.filter(
        (user) =>
          user.display_name &&
          (user.sync_status === "active" || user.sync_status === "inactive"),
      );

      console.log(
        "[UserSelectionPopup] Valid users with display names:",
        validUsers.length,
      );

      if (validUsers.length === 0) {
        console.warn(
          "[UserSelectionPopup] No valid users with display names found!",
        );
        console.warn(
          "[UserSelectionPopup] Available sync statuses:",
          syncStatuses,
        );
        console.warn(
          "[UserSelectionPopup] Users with display names:",
          usersWithDisplayNames,
        );
      } else {
        console.log(
          "[UserSelectionPopup] Sample valid users:",
          validUsers.slice(0, 3),
        );
      }

      setUsers(validUsers);
      setFilteredUsers(validUsers);
    } catch (error) {
      console.error("[UserSelectionPopup] Error loading users:", error);
      console.error("[UserSelectionPopup] Error details:", {
        name: error?.name,
        message: error?.message,
        stack: error?.stack,
      });
      setUsers([]);
      setFilteredUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUserToggle = (displayName: string) => {
    if (multiSelect) {
      setTempSelectedUsers((prev) => {
        if (prev.includes(displayName)) {
          return prev.filter((name) => name !== displayName);
        } else {
          return [...prev, displayName];
        }
      });
    } else {
      setTempSelectedUsers([displayName]);
    }
  };

  const handleAddOther = (otherName: string) => {
    const trimmedName = otherName.trim();
    if (!trimmedName) return;

    // Add to custom others list
    const newOther: CustomOther = {
      id: `other-${Date.now()}`,
      display_name: trimmedName,
      type: "other",
    };
    setCustomOthers((prev) => [...prev, newOther]);

    // Add to selection
    if (multiSelect) {
      setTempSelectedUsers((prev) => {
        if (!prev.includes(trimmedName)) {
          return [...prev, trimmedName];
        }
        return prev;
      });
    } else {
      setTempSelectedUsers([trimmedName]);
    }

    // Clear search term
    setSearchTerm("");
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && showAddOtherOption && searchTerm.trim()) {
      e.preventDefault();
      handleAddOther(searchTerm.trim());
    }
  };

  const isOther = (name: string) => {
    return (
      customOthers.some((other) => other.display_name === name) ||
      (tempSelectedUsers.includes(name) &&
        !users.some((user) => user.display_name === name))
    );
  };

  const handleConfirm = () => {
    onSelect(tempSelectedUsers);
    onOpenChange(false);
  };

  const handleCancel = () => {
    setTempSelectedUsers(selectedUsers);
    onOpenChange(false);
  };

  const removeSelectedUser = (displayName: string) => {
    setTempSelectedUsers((prev) => prev.filter((name) => name !== displayName));
  };

  const removeCustomOther = (otherName: string) => {
    // Remove from custom others list
    setCustomOthers((prev) =>
      prev.filter((other) => other.display_name !== otherName),
    );
    // Also remove from selected users if it was selected
    setTempSelectedUsers((prev) => prev.filter((name) => name !== otherName));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col bg-white shadow-2xl border-0">
        <DialogHeader className="pb-4 border-b border-gray-100">
          <DialogTitle className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <User className="h-5 w-5 text-blue-600" />
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-6 flex-1 min-h-0 py-4">
          {/* Search Input */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <Input
                placeholder="Search users or enter other name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                className="pl-12 pr-4 py-3 text-base border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-lg transition-all duration-200"
              />
            </div>

            {/* Add Other Option */}
            {showAddOtherOption && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-800">
                      Add &quot;{searchTerm}&quot; as other
                    </span>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleAddOther(searchTerm)}
                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 h-8 text-xs"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add Other
                  </Button>
                </div>
                <p className="text-xs text-green-600 mt-1">
                  Press Enter or click &quot;Add Other&quot; to add this as a
                  custom other. You can delete others by hovering over them and
                  clicking the X button.
                </p>
              </div>
            )}
          </div>

          {/* Results Count */}
          {!loading && (
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>
                {searchTerm
                  ? `${filteredUsers.length} user${filteredUsers.length !== 1 ? "s" : ""} found${customOthers.length > 0 ? ` • ${customOthers.length} other${customOthers.length !== 1 ? "s" : ""} added` : ""}`
                  : `${users.length} user${users.length !== 1 ? "s" : ""} available${customOthers.length > 0 ? ` • ${customOthers.length} other${customOthers.length !== 1 ? "s" : ""} added` : ""}`}
              </span>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="text-blue-600 hover:text-blue-800 font-medium transition-colors"
                >
                  Clear search
                </button>
              )}
            </div>
          )}

          {/* Selected Users (for multi-select) */}
          {multiSelect && tempSelectedUsers.length > 0 && (
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
              <div className="text-sm font-semibold text-blue-900 mb-3">
                Selected ({tempSelectedUsers.length}):
              </div>
              <div className="flex flex-wrap gap-2">
                {tempSelectedUsers.map((displayName) => {
                  const isOtherEntry = isOther(displayName);
                  return (
                    <Badge
                      key={displayName}
                      className={`${
                        isOtherEntry
                          ? "bg-green-100 text-green-800 hover:bg-green-200 border border-green-200"
                          : "bg-blue-100 text-blue-800 hover:bg-blue-200 border border-blue-200"
                      } px-3 py-1 flex items-center gap-2 transition-colors`}
                    >
                      {isOtherEntry && <Building2 className="h-3 w-3" />}
                      {!isOtherEntry && <User className="h-3 w-3" />}
                      <span className="font-medium">{displayName}</span>
                      {isOtherEntry && (
                        <span className="text-xs opacity-75">(Other)</span>
                      )}
                      <X
                        className="h-3 w-3 cursor-pointer hover:text-red-600 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeSelectedUser(displayName);
                          // If it's an other, also remove it from the others list
                          if (isOtherEntry) {
                            removeCustomOther(displayName);
                          }
                        }}
                      />
                    </Badge>
                  );
                })}
              </div>
            </div>
          )}

          {/* Users List */}
          <ScrollArea
            className="flex-1 border border-gray-200 rounded-lg bg-gray-50/30"
            style={{ minHeight: "300px", maxHeight: "400px" }}
          >
            {loading ? (
              <div className="flex flex-col items-center justify-center p-12 text-gray-500">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-3" />
                <span className="text-base font-medium">Loading users...</span>
                <span className="text-sm text-gray-400 mt-1">
                  Please wait while we fetch the directory
                </span>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-gray-500">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <Search className="h-8 w-8 text-gray-400" />
                </div>
                <span className="text-base font-medium mb-2">
                  {searchTerm
                    ? "No users found matching your search"
                    : "No users available"}
                </span>
                {searchTerm && (
                  <span className="text-sm text-gray-400">
                    Try adjusting your search terms
                  </span>
                )}
              </div>
            ) : (
              <div className="p-3 space-y-1">
                {/* Custom Others */}
                {customOthers
                  .filter((other) => {
                    if (!searchTerm.trim()) return true;
                    return other.display_name
                      .toLowerCase()
                      .includes(searchTerm.toLowerCase().trim());
                  })
                  .map((other) => {
                    const isSelected = tempSelectedUsers.includes(
                      other.display_name,
                    );
                    return (
                      <div
                        key={other.id}
                        className={`group flex items-center gap-4 p-4 rounded-xl transition-all duration-200 relative ${
                          isSelected
                            ? "bg-green-50 border-2 border-green-200 shadow-sm"
                            : "hover:bg-white hover:shadow-sm border-2 border-transparent"
                        }`}
                      >
                        {/* Main content area - clickable for selection */}
                        <div
                          className="flex items-center gap-4 flex-1 cursor-pointer"
                          onClick={() => handleUserToggle(other.display_name)}
                        >
                          <div className="flex-shrink-0">
                            <div
                              className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                                isSelected
                                  ? "bg-green-100 border-2 border-green-300"
                                  : "bg-gradient-to-br from-green-100 to-green-200 group-hover:from-green-50 group-hover:to-green-100"
                              }`}
                            >
                              <Building2
                                className={`h-6 w-6 transition-colors ${
                                  isSelected
                                    ? "text-green-600"
                                    : "text-green-600 group-hover:text-green-500"
                                }`}
                              />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div
                              className={`font-semibold text-base transition-colors ${
                                isSelected
                                  ? "text-green-900"
                                  : "text-gray-900 group-hover:text-green-800"
                              }`}
                            >
                              {other.display_name}
                            </div>
                            <div className="text-sm text-green-600 truncate mt-1">
                              Custom Other
                            </div>
                          </div>
                          {isSelected && (
                            <div className="flex-shrink-0">
                              <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center shadow-sm">
                                <div className="w-2.5 h-2.5 bg-white rounded-full" />
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Delete button - separate from selection area */}
                        <div className="flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeCustomOther(other.display_name);
                            }}
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Delete other"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}

                {/* Azure AD Users */}
                {filteredUsers.map((user, index) => {
                  const isSelected = tempSelectedUsers.includes(
                    user.display_name,
                  );
                  return (
                    <div
                      key={user.id}
                      className={`group flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all duration-200 ${
                        isSelected
                          ? "bg-blue-50 border-2 border-blue-200 shadow-sm"
                          : "hover:bg-white hover:shadow-sm border-2 border-transparent"
                      }`}
                      onClick={() => handleUserToggle(user.display_name)}
                    >
                      <div className="flex-shrink-0">
                        <div
                          className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                            isSelected
                              ? "bg-blue-100 border-2 border-blue-300"
                              : "bg-gradient-to-br from-gray-100 to-gray-200 group-hover:from-blue-50 group-hover:to-blue-100"
                          }`}
                        >
                          <User
                            className={`h-6 w-6 transition-colors ${
                              isSelected
                                ? "text-blue-600"
                                : "text-gray-600 group-hover:text-blue-500"
                            }`}
                          />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div
                          className={`font-semibold text-base transition-colors ${
                            isSelected
                              ? "text-blue-900"
                              : "text-gray-900 group-hover:text-blue-800"
                          }`}
                        >
                          {user.display_name}
                        </div>
                        <div className="text-sm text-gray-600 truncate mt-1">
                          {user.email}
                        </div>
                        {user.job_title && (
                          <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                            <span className="font-medium">
                              {user.job_title}
                            </span>
                            {user.department && (
                              <>
                                <span className="text-gray-300">•</span>
                                <span className="bg-gray-100 px-2 py-0.5 rounded-full text-xs font-medium text-gray-600">
                                  {user.department}
                                </span>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                      {isSelected && (
                        <div className="flex-shrink-0">
                          <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center shadow-sm">
                            <div className="w-2.5 h-2.5 bg-white rounded-full" />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          {/* Action Buttons */}
          <div className="flex justify-between items-center pt-4 border-t border-gray-100">
            <div className="text-sm text-gray-500">
              {tempSelectedUsers.length > 0 && (
                <span>
                  {tempSelectedUsers.length} user
                  {tempSelectedUsers.length !== 1 ? "s" : ""} selected
                </span>
              )}
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleCancel}
                className="px-6 py-2 border-gray-300 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={tempSelectedUsers.length === 0}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                {multiSelect
                  ? `Select ${tempSelectedUsers.length} User${tempSelectedUsers.length !== 1 ? "s" : ""}`
                  : "Select User"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UserSelectionPopup;
