import React, { useState, useEffect } from "react";
import { adminService } from "@/lib/services/adminService";
import { useToast } from "@/components/ui/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

type Role = "project_manager" | "department_director" | "admin";

interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  department: string | null;
  role: string;
  is_approved: boolean | null;
}

const ROLE_LABELS: Record<Role, string> = {
  project_manager: "Project Manager",
  department_director: "Department Director",
  admin: "Admin",
};

const ROLE_BADGE_VARIANT: Record<Role, "default" | "secondary" | "destructive"> = {
  project_manager: "secondary",
  department_director: "default",
  admin: "destructive",
};

const RoleManager: React.FC = () => {
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const data = await adminService.getAllProfiles();
      setProfiles(data as Profile[]);
      setLoading(false);
    };
    load();
  }, []);

  const handleRoleChange = async (userId: string, role: Role) => {
    setUpdating(userId);
    const ok = await adminService.updateUserRole(userId, role);
    if (ok) {
      setProfiles((prev) =>
        prev.map((p) => (p.id === userId ? { ...p, role } : p)),
      );
      toast({ title: "Role updated", description: `User role changed to ${ROLE_LABELS[role]}.` });
    } else {
      toast({ title: "Error", description: "Failed to update role.", variant: "destructive" });
    }
    setUpdating(null);
  };

  const filtered = profiles.filter(
    (p) =>
      search === "" ||
      p.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      p.email?.toLowerCase().includes(search.toLowerCase()) ||
      p.department?.toLowerCase().includes(search.toLowerCase()),
  );

  if (loading) return <div className="text-sm text-muted-foreground">Loading users…</div>;

  return (
    <div className="space-y-4">
      <Input
        placeholder="Search by name, email, or department…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="w-[200px]">Change Role</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.full_name ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{p.email ?? "—"}</TableCell>
                <TableCell className="text-sm">{p.department ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant={ROLE_BADGE_VARIANT[p.role as Role] ?? "secondary"}>
                    {ROLE_LABELS[p.role as Role] ?? p.role}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Select
                    value={p.role}
                    onValueChange={(value) => handleRoleChange(p.id, value as Role)}
                    disabled={updating === p.id}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="project_manager">Project Manager</SelectItem>
                      <SelectItem value="department_director">Department Director</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                  No users found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default RoleManager;
