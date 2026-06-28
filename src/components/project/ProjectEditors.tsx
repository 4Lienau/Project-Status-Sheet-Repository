import React, { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { projectService } from "@/lib/services/project";
import { UserMinus, UserPlus, Users } from "lucide-react";

interface Editor {
  user_id: string;
  full_name: string | null;
  email: string | null;
  granted_by: string | null;
  created_at: string;
}

interface ApprovedUser {
  id: string | null;
  full_name: string | null;
  email: string | null;
  department: string | null;
  hasAccount: boolean;
}

interface ProjectEditorsProps {
  projectId: string;
  ownerId: string | null;
}

const ProjectEditors: React.FC<ProjectEditorsProps> = ({ projectId, ownerId }) => {
  const { toast } = useToast();
  const [editors, setEditors] = useState<Editor[]>([]);
  const [allUsers, setAllUsers] = useState<ApprovedUser[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const editorIds = new Set(editors.map((e) => e.user_id));

  const loadEditors = useCallback(async () => {
    setLoading(true);
    const [editorsData, usersData] = await Promise.all([
      projectService.getProjectEditors(projectId),
      projectService.getApprovedUsers(),
    ]);
    setEditors(editorsData);
    setAllUsers(usersData);
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    loadEditors();
  }, [loadEditors]);

  const handleAdd = async (user: ApprovedUser) => {
    if (!user.id) {
      toast({ title: "Cannot add editor", description: `${user.full_name ?? user.email} hasn't logged into the app yet. They can be added after their first login.`, variant: "destructive" });
      return;
    }
    setAdding(true);
    const ok = await projectService.addProjectEditor(projectId, user.id);
    if (ok) {
      toast({ title: "Editor added", description: "User can now edit this project." });
      await loadEditors();
    } else {
      toast({ title: "Error", description: "Could not add editor.", variant: "destructive" });
    }
    setAdding(false);
    setSearch("");
  };

  const handleRemove = async (userId: string, name: string | null) => {
    const ok = await projectService.removeProjectEditor(projectId, userId);
    if (ok) {
      toast({ title: "Editor removed", description: `${name ?? "User"} can no longer edit this project.` });
      setEditors((prev) => prev.filter((e) => e.user_id !== userId));
    } else {
      toast({ title: "Error", description: "Could not remove editor.", variant: "destructive" });
    }
  };

  const candidates = allUsers.filter(
    (u) =>
      u.id !== ownerId &&
      !editorIds.has(u.id ?? "") &&
      (search === "" ||
        u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        u.email?.toLowerCase().includes(search.toLowerCase())),
  );

  if (loading) return <div className="text-sm text-muted-foreground">Loading editors…</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Users className="h-4 w-4" />
        Designated Editors
      </div>

      {editors.length === 0 ? (
        <p className="text-sm text-muted-foreground">No additional editors. Only you can edit this project.</p>
      ) : (
        <ul className="space-y-2">
          {editors.map((e) => (
            <li key={e.user_id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
              <div>
                <span className="font-medium">{e.full_name ?? e.email ?? e.user_id}</span>
                {e.email && <span className="ml-2 text-muted-foreground">{e.email}</span>}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRemove(e.user_id, e.full_name)}
                className="text-destructive hover:text-destructive"
              >
                <UserMinus className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-2" ref={searchContainerRef}>
        <Input
          placeholder="Search users to add…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="text-sm"
        />
        {search && (
          <ul className="max-h-40 overflow-y-auto rounded-md border divide-y text-sm">
            {candidates.length === 0 ? (
              <li className="px-3 py-2 text-muted-foreground">No matching users</li>
            ) : (
              candidates.slice(0, 10).map((u) => (
                <li key={u.email} className="flex items-center justify-between px-3 py-2 hover:bg-muted">
                  <div>
                    <span className={`font-medium ${!u.hasAccount ? "text-muted-foreground" : ""}`}>{u.full_name ?? u.email}</span>
                    {u.department && <span className="ml-2 text-muted-foreground text-xs">{u.department}</span>}
                    {!u.hasAccount && <span className="ml-2 text-xs text-amber-600">hasn't logged in yet</span>}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={adding || !u.hasAccount}
                    onClick={() => handleAdd(u)}
                  >
                    <UserPlus className={`h-4 w-4 ${!u.hasAccount ? "opacity-40" : ""}`} />
                  </Button>
                </li>
              ))
            )}
          </ul>
        )}
      </div>
    </div>
  );
};

export default ProjectEditors;
