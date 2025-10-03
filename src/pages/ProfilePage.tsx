import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Moon, Sun, Monitor } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/hooks/useAuth";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabase";
import Layout from "@/components/layout/Layout";
import { useTheme } from "@/components/providers/ThemeProvider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

const ProfilePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const [loading, setLoading] = React.useState(false);
  const [fullName, setFullName] = React.useState("");
  const [department, setDepartment] = React.useState("");
  const [departments, setDepartments] = React.useState<
    { id: string; name: string }[]
  >([]);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const loadProfile = async () => {
      if (user?.id) {
        try {
          const { data } = await supabase
            .from("profiles")
            .select("full_name, department")
            .eq("id", user.id)
            .single();

          if (data) {
            setFullName(data.full_name || "");
            setDepartment(data.department || "");
          }
        } catch (err) {
          console.error("Error loading profile:", err);
        }
      }
    };

    const loadDepartments = async () => {
      // Set fallback departments immediately
      const fallbackDepts = [
        { id: "technology", name: "Technology" },
        { id: "operations", name: "Operations" },
        { id: "finance", name: "Finance" },
        { id: "hr", name: "Human Resources" },
        { id: "marketing", name: "Marketing" },
      ];
      
      setDepartments(fallbackDepts);

      // Try to load from database, but don't fail if it doesn't work
      try {
        const { data, error } = await supabase
          .from("departments")
          .select("id, name")
          .order("name");

        if (!error && data && data.length > 0) {
          setDepartments(data);
        }
      } catch (err) {
        // Silently fail and use fallback departments
        // This prevents console errors from network issues
      }
    };

    loadProfile();
    loadDepartments();
  }, [user?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      setError(null);

      // Update existing profile
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          department: department,
          email: user?.email,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user?.id);

      if (updateError) throw updateError;

      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
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

  const themeOptions = [
    { value: "light", label: "Light", icon: Sun, description: "Light theme" },
    { value: "dark", label: "Dark", icon: Moon, description: "Dark theme" },
    { value: "system", label: "System", icon: Monitor, description: "Follow system preference" },
  ];

  return (
    <Layout>
      <div className="container max-w-2xl mx-auto py-8">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/")}
          className="flex items-center gap-2 mb-4"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Projects
        </Button>
        <Card className="p-6">
          <h1 className="text-2xl font-bold mb-6">Profile Settings</h1>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={user?.email || ""}
                disabled
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Select value={department} onValueChange={setDepartment} required>
                <SelectTrigger id="department">
                  <SelectValue placeholder="Select your department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.name}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {error && (
              <div className="text-sm text-red-500 font-medium">
                Error: {error}
              </div>
            )}
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </form>

          <Separator className="my-8" />

          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold mb-2">Appearance</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Customize how the application looks on your device
              </p>
            </div>

            <div className="space-y-2">
              <Label>Theme</Label>
              <div className="grid grid-cols-3 gap-3">
                {themeOptions.map((option) => {
                  const Icon = option.icon;
                  const isActive = theme === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setTheme(option.value as "light" | "dark" | "system")}
                      className={`
                        flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all
                        ${isActive 
                          ? "border-primary bg-primary/5" 
                          : "border-border hover:border-border-hover bg-card"
                        }
                      `}
                    >
                      <Icon className={`h-6 w-6 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                      <div className="text-center">
                        <div className={`text-sm font-medium ${isActive ? "text-primary" : "text-foreground"}`}>
                          {option.label}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {option.description}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="text-xs text-muted-foreground mt-4 p-3 bg-muted/50 rounded-md">
              <strong>Current theme:</strong> {theme === "system" ? "System (auto)" : theme.charAt(0).toUpperCase() + theme.slice(1)}
              {theme === "system" && (
                <span className="ml-1">
                  - Currently using {window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"} mode
                </span>
              )}
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  );
};

export default ProfilePage;