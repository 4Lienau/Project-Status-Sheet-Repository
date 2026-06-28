export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Revoke on next tick so the download has started.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function reportFileName(title: string, ext: "pdf" | "docx"): string {
  const safe = (title || "project-report")
    .replace(/<[^>]*>/g, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .slice(0, 60) || "project-report";
  return `${safe}-report.${ext}`;
}
