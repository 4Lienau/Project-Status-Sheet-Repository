import React, { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/components/ui/use-toast";
import { projectService, type ProjectWithRelations } from "@/lib/services/project";
import { createPortal } from "react-dom";
import { buildReportModel, defaultReportOptions } from "@/lib/services/reportModel";
import { generateDocx } from "@/lib/services/reportDocx";
import { downloadBlob, reportFileName } from "@/lib/report/download";
import ProjectReportPreview from "./ProjectReportPreview";
import { DEFAULT_SECTION_ORDER, SECTION_LABELS, type ReportOptions, type ReportSectionKey } from "@/types/report";
import { Loader2, FileText, FileType } from "lucide-react";

// Print-isolation CSS for "Save as PDF". The report preview is also rendered
// into a body-level portal (#report-print-root); when printing we hide the rest
// of the app and show only that, so the PDF matches the on-screen preview. The
// color-adjust rules force the brand bands/table headers to print (browsers
// drop background colors otherwise).
const PRINT_CSS = `
@media screen {
  #report-print-root { display: none; }
}
@media print {
  body * { visibility: hidden !important; }
  #report-print-root, #report-print-root * {
    visibility: visible !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  #report-print-root { position: absolute; left: 0; top: 0; width: 100%; }
  #report-print-root > div { width: auto !important; min-height: 0 !important; padding: 0 !important; box-shadow: none !important; margin: 0 !important; }
  thead { display: table-header-group; }
  tr { break-inside: avoid; }
  @page { size: letter; margin: 0.6in; }
}
`;

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

  const onExportDocx = async () => {
    if (!model) return;
    setExporting("docx");
    try {
      const blob = await generateDocx(model);
      downloadBlob(blob, reportFileName(model.header.title, "docx"));
    } catch (e) {
      toast({ title: "Failed to export Word", variant: "destructive" });
    } finally {
      setExporting(null);
    }
  };

  // PDF export prints the on-screen preview via the browser's native engine
  // (Save as PDF). It renders the exact same component the user sees, so the
  // output matches the page — and it needs no WASM/worker/Buffer, so it works
  // under the app's strict Content-Security-Policy (unlike @react-pdf/renderer).
  const onPrintPdf = () => {
    if (!model) return;
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-[95vw] h-[92vh] p-0 gap-0 flex flex-col">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-lg font-semibold">Project Report</h2>
          <div className="flex items-center gap-2">
            <Button variant="outline" disabled={!model || exporting !== null} onClick={onExportDocx}>
              {exporting === "docx" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              <span className="ml-2">Export Word</span>
            </Button>
            <Button disabled={!model} onClick={onPrintPdf}>
              <FileType className="h-4 w-4" />
              <span className="ml-2">Save as PDF</span>
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
      {model && createPortal(
        <>
          <style>{PRINT_CSS}</style>
          <div id="report-print-root">
            <ProjectReportPreview model={model} />
          </div>
        </>,
        document.body,
      )}
    </Dialog>
  );
};

export default ProjectReportDialog;
