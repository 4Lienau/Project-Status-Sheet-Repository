import React from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

import { User, Shield, LogOut } from "lucide-react";

const Navbar = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = React.useState<{
    full_name: string | null;
    department: string | null;
  }>({
    full_name: null,
    department: null,
  });

  React.useEffect(() => {
    const loadProfile = async () => {
      if (user?.id) {
        const { data } = await supabase
          .from("profiles")
          .select("full_name, department")
          .eq("id", user.id)
          .single();

        if (data) {
          setProfile(data);
        }
      }
    };
    loadProfile();

    // Subscribe to profile changes
    const channel = supabase
      .channel(`profile:${user?.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${user?.id}`,
        },
        (payload) => {
          setProfile(payload.new as { full_name: string });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  return (
    <nav className="sticky top-0 z-50 w-full border-none bg-white shadow-md">
      <div className="container flex h-16 items-center">
        <div className="flex-1 flex items-center justify-between">
          <div className="flex items-center">
            <span className="text-xl font-bold text-blue-800">
              ReWa Project Status Sheet Repository
            </span>
          </div>

          {user && (
            <div className="flex items-center space-x-4">
              <div className="flex flex-col">
                <span className="text-sm">
                  {profile.full_name || user.email?.split("@")[0]}
                </span>
                {profile.department && (
                  <span className="text-xs text-muted-foreground">
                    {profile.department}
                  </span>
                )}
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-8 w-8 rounded-full"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-gradient-to-r from-purple-500 to-teal-500 text-white">
                        {user.email?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {profile.full_name || "Account"}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/profile")}>
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>

                  {(user.email === "4lienau@gmail.com" ||
                    user.email === "chrisl@re-wa.org") && (
                    <DropdownMenuItem onClick={() => navigate("/admin")}>
                      <Shield className="mr-2 h-4 w-4" />
                      <span>Admin Dashboard</span>
                    </DropdownMenuItem>
                  )}

                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={async () => {
                      try {
                        await supabase.auth.signOut();
                        navigate("/login");
                      } catch (error) {
                        console.error("Error signing out:", error);
                        toast({
                          title: "Error",
                          description: "Failed to sign out. Please try again.",
                          variant: "destructive",
                        });
                      }
                    }}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
