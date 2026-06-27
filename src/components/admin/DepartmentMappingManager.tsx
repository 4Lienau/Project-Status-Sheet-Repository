import React, { useState, useEffect, useCallback } from "react";
import { adminService } from "@/lib/services/adminService";
import { useAuth } from "@/lib/hooks/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

interface Mapping {
  id: string;
  ad_name: string;
  master_dept_id: string | null;
  is_excluded: boolean;
  exclusion_reason: string | null;
  departments: { name: string } | null;
}

interface Department {
  id: string;
  name: string;
}

const DepartmentMappingManager: React.FC = () => {
  const { toast } = useToast();
  const { profile, isAdmin, isDirector } = useAuth();
  const [mappings, setMappings] = useState<Mapping[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [exclusionReasons, setExclusionReasons] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const [mappingData, deptData] = await Promise.all([
      adminService.getDepartmentMappings(),
      adminService.getMasterDepartments(),
    ]);
    setMappings(mappingData as Mapping[]);
    setDepartments(deptData);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Directors can only see/assign their own department
  const allowedDeptIds = isAdmin
    ? new Set(departments.map((d) => d.id))
    : new Set(departments.filter((d) => d.name === profile?.department).map((d) => d.id));

  const canManageMapping = (mapping: Mapping) => {
    if (isAdmin) return true;
    if (!isDirector) return false;
    // Directors can map unmapped entries to their own dept, or modify entries already in their dept
    if (mapping.master_dept_id && !allowedDeptIds.has(mapping.master_dept_id)) return false;
    return true;
  };

  const handleAssign = async (adName: string, masterDeptId: string) => {
    setSaving(adName);
    const ok = await adminService.upsertDepartmentMapping(adName, masterDeptId, false);
    if (ok) {
      toast({ title: "Mapping saved", description: `${adName} → ${departments.find((d) => d.id === masterDeptId)?.name}` });
      await load();
    } else {
      toast({ title: "Error", description: "Could not save mapping.", variant: "destructive" });
    }
    setSaving(null);
  };

  const handleExclude = async (adName: string) => {
    setSaving(adName);
    const reason = exclusionReasons[adName] ?? "";
    const ok = await adminService.upsertDepartmentMapping(adName, null, true, reason);
    if (ok) {
      toast({ title: "Excluded", description: `${adName} marked as excluded.` });
      await load();
    } else {
      toast({ title: "Error", description: "Could not exclude entry.", variant: "destructive" });
    }
    setSaving(null);
  };

  const handleRestore = async (adName: string) => {
    setSaving(adName);
    const ok = await adminService.upsertDepartmentMapping(adName, null, false);
    if (ok) {
      toast({ title: "Restored", description: `${adName} moved back to unmapped.` });
      await load();
    } else {
      toast({ title: "Error", description: "Could not restore entry.", variant: "destructive" });
    }
    setSaving(null);
  };

  if (loading) return <div className="text-sm text-muted-foreground">Loading department mappings…</div>;

  const mapped = mappings.filter((m) => m.master_dept_id && !m.is_excluded);
  const unmapped = mappings.filter((m) => !m.master_dept_id && !m.is_excluded);
  const excluded = mappings.filter((m) => m.is_excluded);

  const visibleDepts = isAdmin
    ? departments
    : departments.filter((d) => d.name === profile?.department);

  const Section = ({ title, count, children }: { title: string; count: number; children: React.ReactNode }) => (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <h3 className="font-medium text-sm">{title}</h3>
        <Badge variant="secondary">{count}</Badge>
      </div>
      <div className="rounded-md border divide-y">{children}</div>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Unmapped */}
      {(isAdmin || isDirector) && unmapped.length > 0 && (
        <Section title="Unmapped — needs attention" count={unmapped.length}>
          {unmapped.map((m) => (
            <div key={m.id} className="flex flex-wrap items-center gap-2 px-3 py-2">
              <span className="text-sm font-medium w-48 shrink-0">{m.ad_name}</span>
              <Select
                disabled={saving === m.ad_name}
                onValueChange={(val) => handleAssign(m.ad_name, val)}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Assign to department…" />
                </SelectTrigger>
                <SelectContent>
                  {visibleDepts.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isAdmin && (
                <>
                  <Input
                    placeholder="Exclusion reason (optional)"
                    className="w-48 text-sm"
                    value={exclusionReasons[m.ad_name] ?? ""}
                    onChange={(e) =>
                      setExclusionReasons((prev) => ({ ...prev, [m.ad_name]: e.target.value }))
                    }
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={saving === m.ad_name}
                    onClick={() => handleExclude(m.ad_name)}
                  >
                    Exclude
                  </Button>
                </>
              )}
            </div>
          ))}
        </Section>
      )}

      {/* Mapped */}
      <Section title="Mapped" count={mapped.length}>
        {mapped.map((m) => (
          <div key={m.id} className="flex flex-wrap items-center gap-2 px-3 py-2">
            <span className="text-sm font-medium w-48 shrink-0">{m.ad_name}</span>
            <span className="text-sm text-muted-foreground">→</span>
            {canManageMapping(m) ? (
              <Select
                defaultValue={m.master_dept_id ?? undefined}
                disabled={saving === m.ad_name}
                onValueChange={(val) => handleAssign(m.ad_name, val)}
              >
                <SelectTrigger className="w-48">
                  <SelectValue>{m.departments?.name}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {visibleDepts.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Badge variant="secondary">{m.departments?.name}</Badge>
            )}
            {isAdmin && canManageMapping(m) && (
              <Button
                variant="ghost"
                size="sm"
                disabled={saving === m.ad_name}
                onClick={() => handleExclude(m.ad_name)}
                className="text-muted-foreground"
              >
                Exclude
              </Button>
            )}
          </div>
        ))}
      </Section>

      {/* Excluded */}
      {isAdmin && (
        <Section title="Excluded" count={excluded.length}>
          {excluded.map((m) => (
            <div key={m.id} className="flex flex-wrap items-center gap-2 px-3 py-2">
              <span className="text-sm font-medium w-48 shrink-0 text-muted-foreground line-through">
                {m.ad_name}
              </span>
              {m.exclusion_reason && (
                <span className="text-xs text-muted-foreground italic">{m.exclusion_reason}</span>
              )}
              <Button
                variant="ghost"
                size="sm"
                disabled={saving === m.ad_name}
                onClick={() => handleRestore(m.ad_name)}
              >
                Restore to Unmapped
              </Button>
            </div>
          ))}
        </Section>
      )}
    </div>
  );
};

export default DepartmentMappingManager;
