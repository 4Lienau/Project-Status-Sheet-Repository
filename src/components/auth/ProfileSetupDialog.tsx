import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/hooks/useAuth";
import DepartmentSelect from "@/components/DepartmentSelect";

interface ProfileSetupDialogProps {
  open: boolean;
  onComplete: () => void;
}

const ProfileSetupDialog: React.FC<ProfileSetupDialogProps> = ({
  open,
  onComplete,
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState("");
  const [department, setDepartment] = useState("");

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Pre-fill with email username if available
    if (user?.email) {
      const username = user.email.split("@")[0];
      // Convert username to proper case (capitalize first letter of each word)
      const properName = username
        .split(/[._-]/)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
      setFullName(properName);
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !department.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      setError(null);

      // Use upsert to handle both insert and update cases
      const result = await supabase.from("profiles").upsert(
        {
          id: user?.id,
          full_name: fullName.trim(),
          department: department.trim(),
          email: user?.email,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "id",
          returning: "minimal",
        },
      );

      if (result.error) throw result.error;

      toast({
        title: "Profile updated",
        description: "Your profile has been set up successfully.",
      });
      onComplete();
    } catch (error) {
      console.error("Profile update error:", error);
      setError(error.message || "Failed to update profile");
      toast({
        title: "Error",
        description: error.message || "Failed to update profile.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Complete Your Profile</DialogTitle>
          <DialogDescription>
            Please provide your full name and department to continue.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="setup-fullName">Full Name</Label>
            <Input
              id="setup-fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter your full name"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="setup-department">Department</Label>
            <DepartmentSelect
              value={department}
              onValueChange={setDepartment}
              placeholder="Select your department"
            />
          </div>

          {error && (
            <div className="text-sm text-red-500 font-medium">
              Error: {error}
            </div>
          )}
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Continue"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ProfileSetupDialog;
