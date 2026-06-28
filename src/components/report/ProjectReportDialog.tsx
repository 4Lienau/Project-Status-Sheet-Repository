import React, { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/components/ui/use-toast";
import { projectService, type ProjectWithRelations } from "@/lib/services/project";
import { buildReportModel, defaultReportOptions } from "@/lib/services/reportModel";
import ProjectReportPreview from "./ProjectReportPreview";
import { DEFAULT_SECTION_ORDER, SECTION_LABELS, type ReportOptions, type ReportSectionKey } from "@/types/report";
import { Loader2, FileText, FileType } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  projectId: string;
}

const ProjectReportDialog: React.FC<Props> = ({ open, onOpenChange, projectId }) => {
  const { toast } = useToast();
  const [project, setProject] = useState<ProjectWithRelations | null>(null);
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<ReportOptions>(defaultReportOptions());
  const [exporting, setExporting] = useState<null | "pdf" | "docx">(null);

  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true);
    projectService
      .getProject(projectId)
      .then((p) => { if (active) setProject(p); })
      .catch(() => toast({ title: "Could not load project", variant: "destructive" }))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [open, projectId, toast]);

  const model = useMemo(
    () => (project ? buildReportModel(project, options) : null),
    [project, options],
  );

  const toggle = (key: ReportSectionKey) =>
    setOptions((o) => ({ ...o, sections: { ...o.sections, [key]: !o.sections[key] } }));

  // Placeholder export handlers — replaced in Tasks 7 (PDF) and 8 (Word).
  const onExport = (fmt: "pdf" | "docx") => {
    setExporting(fmt);
    setTimeout(() => setExporting(null), 300);
    toast({ title: `${fmt.toUpperCase()} export coming soon` });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-[95vw] h-[92vh] p-0 gap-0 flex flex-col">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-lg font-semibold">Project Report</h2>
          <div className="flex items-center gap-2">
            <Button variant="outline" disabled={!model || exporting !== null} onClick={() => onExport("docx")}>
              {exporting === "docx" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              <span className="ml-2">Export Word</span>
            </Button>
            <Button disabled={!model || exporting !== null} onClick={() => onExport("pdf")}>
              {exporting === "pdf" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileType className="h-4 w-4" />}
              <span className="ml-2">Export PDF</span>
            </Button>
          </div>
        </div>
        <div className="flex flex-1 min-h-0">
          {/* Section toggle rail */}
          <div className="w-64 border-r p-4 overflow-y-auto">
            <div className="text-xs font-semibold text-muted-foreground uppercase mb-2">Sections</div>
            {DEFAULT_SECTION_ORDER.map((key) => (
              <label key={key} className="flex items-center gap-2 py-1.5 text-sm cursor-pointer">
                <Checkbox checked={options.sections[key]} onCheckedChange={() => toggle(key)} />
                {SECTION_LABELS[key]}
              </label>
            ))}
            <p className="text-xs text-muted-foreground mt-4">
              Showing <strong>saved</strong> data. Save your changes first to include recent edits.
            </p>
          </div>
          {/* Preview */}
          <ScrollArea className="flex-1 bg-gray-100">
            <div className="p-6">
              {loading && <div className="flex items-center justify-center h-64 text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading…</div>}
              {!loading && model && <ProjectReportPreview model={model} />}
              {!loading && !model && <div className="text-center text-muted-foreground h-64 flex items-center justify-center">No project data found.</div>}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProjectReportDialog;
