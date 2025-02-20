import ExcelJS from "exceljs";
import { ProjectWithRelations } from "./project";

export const exportProjectsToExcel = async (
  projects: ProjectWithRelations[],
  username?: string,
) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = username || "System";
  workbook.created = new Date();

  // Projects Overview Sheet
  const overviewSheet = workbook.addWorksheet("Projects Overview");

  // Add conditional formatting with priority
  overviewSheet.addConditionalFormatting({
    ref: `D2:D${projects.length + 1}`,
    rules: [
      {
        type: "containsText",
        operator: "containsText",
        text: "ACTIVE",
        priority: 1,
        style: {
          fill: {
            type: "pattern",
            pattern: "solid",
            bgColor: { argb: "FFE2F0D9" },
          },
        },
      },
      // Add other rules with priority...
    ],
  });

  // Generate and save the file
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `Projects_${username || "export"}_${
    new Date().toISOString().split("T")[0]
  }.xlsx`;
  link.click();
  window.URL.revokeObjectURL(url);
};
