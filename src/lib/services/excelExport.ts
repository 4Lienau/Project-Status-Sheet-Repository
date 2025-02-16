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
  const overviewColumns = [
    { header: "Project Title", key: "title", width: 30 },
    { header: "Description", key: "description", width: 40 },
    { header: "Status", key: "status", width: 15 },
    { header: "Overall Complete", key: "overall_complete", width: 15 },
    { header: "Total Budget", key: "budget_total", width: 15 },
    { header: "Actuals", key: "budget_actuals", width: 15 },
    { header: "Forecast", key: "budget_forecast", width: 15 },
    { header: "Budget Variance", key: "variance", width: 15 },
    { header: "Charter Link", key: "charter_link", width: 30 },
    { header: "Sponsors", key: "sponsors", width: 20 },
    { header: "Business Leads", key: "business_leads", width: 20 },
    { header: "Project Manager", key: "project_manager", width: 20 },
    { header: "Created At", key: "created_at", width: 15 },
    { header: "Updated At", key: "updated_at", width: 15 },
    { header: "Milestone Count", key: "milestone_count", width: 15 },
    { header: "Risk Count", key: "risk_count", width: 15 },
  ];

  overviewSheet.columns = overviewColumns;

  // Add data and apply formatting
  projects.forEach((project) => {
    const overallComplete = project.milestones?.length
      ? Math.round(
          project.milestones.reduce((acc, m) => acc + m.completion, 0) /
            project.milestones.length,
        )
      : 0;

    const row = overviewSheet.addRow({
      title: project.title,
      description: project.description || "",
      status: (project.status || "active").toUpperCase(),
      overall_complete: overallComplete,
      budget_total: project.budget_total,
      budget_actuals: project.budget_actuals,
      budget_forecast: project.budget_forecast,
      variance: project.budget_total - project.budget_forecast,
      charter_link: project.charter_link,
      sponsors: project.sponsors,
      business_leads: project.business_leads,
      project_manager: project.project_manager,
      created_at: new Date(project.created_at || "").toLocaleDateString(),
      updated_at: new Date(project.updated_at || "").toLocaleDateString(),
      milestone_count: project.milestones?.length || 0,
      risk_count: project.risks?.length || 0,
    });

    // Style all cells in the row
    row.eachCell((cell, colNumber) => {
      // Default vertical middle alignment
      cell.alignment = { vertical: "middle" };

      // Format percentage column (Overall Complete)
      if (colNumber === 4) {
        cell.numFmt = '0"%"';
        cell.alignment = { vertical: "middle", horizontal: "center" };
      }

      // Format budget columns (5, 6, 7, 8)
      if (colNumber >= 5 && colNumber <= 8) {
        cell.numFmt = '"$"#,##0.00';
        cell.alignment = { vertical: "middle", horizontal: "right" };
      }

      // Bold and left-align project title
      if (colNumber === 1) {
        cell.font = { bold: true };
        cell.alignment = { vertical: "middle", horizontal: "left" };
      }

      // Text wrap for description
      if (colNumber === 2) {
        cell.alignment = { vertical: "middle", wrapText: true };
      }

      // Center milestone and risk counts
      if (colNumber === 15 || colNumber === 16) {
        cell.alignment = { vertical: "middle", horizontal: "center" };
      }

      // Make charter link clickable
      if (colNumber === 9 && cell.value) {
        const url = cell.value.toString();
        cell.value = { text: url, hyperlink: url };
        cell.font = { color: { argb: "FF0000FF" }, underline: true };
      }
    });
  });

  // Add conditional formatting for status column
  overviewSheet.addConditionalFormatting({
    ref: `C2:C${projects.length + 1}`,
    rules: [
      {
        type: "containsText",
        operator: "containsText",
        text: "ACTIVE",
        style: {
          fill: {
            type: "pattern",
            pattern: "solid",
            bgColor: { argb: "FFE2F0D9" },
          },
        },
      },
      {
        type: "containsText",
        operator: "containsText",
        text: "ON HOLD",
        style: {
          fill: {
            type: "pattern",
            pattern: "solid",
            bgColor: { argb: "FFFFF2CC" },
          },
        },
      },
      {
        type: "containsText",
        operator: "containsText",
        text: "COMPLETED",
        style: {
          fill: {
            type: "pattern",
            pattern: "solid",
            bgColor: { argb: "FFD9E1F2" },
          },
        },
      },
      {
        type: "containsText",
        operator: "containsText",
        text: "CANCELLED",
        style: {
          fill: {
            type: "pattern",
            pattern: "solid",
            bgColor: { argb: "FFFCE4D6" },
          },
        },
      },
    ],
  });

  // Add table formatting
  overviewSheet.addTable({
    name: "ProjectsOverview",
    ref: "A1",
    headerRow: true,
    totalsRow: false,
    style: {
      theme: "TableStyleMedium16",
      showRowStripes: true,
    },
    columns: overviewColumns.map((col) => ({ name: col.header })),
    rows: projects.map((project) => [
      project.title,
      project.description || "",
      (project.status || "active").toUpperCase(),
      project.milestones?.length
        ? Math.round(
            project.milestones.reduce((acc, m) => acc + m.completion, 0) /
              project.milestones.length,
          )
        : 0,
      project.budget_total,
      project.budget_actuals,
      project.budget_forecast,
      project.budget_total - project.budget_forecast,
      project.charter_link,
      project.sponsors,
      project.business_leads,
      project.project_manager,
      new Date(project.created_at || "").toLocaleDateString(),
      new Date(project.updated_at || "").toLocaleDateString(),
      project.milestones?.length || 0,
      project.risks?.length || 0,
    ]),
  });

  // Milestones Sheet
  if (projects.some((p) => p.milestones?.length > 0)) {
    const milestonesSheet = workbook.addWorksheet("Detailed Milestones");
    const milestoneColumns = [
      { header: "Project", key: "project", width: 30 },
      { header: "Milestone", key: "milestone", width: 40 },
      { header: "Owner", key: "owner", width: 20 },
      { header: "Date", key: "date", width: 15 },
      { header: "Completion %", key: "completion", width: 15 },
      { header: "Status", key: "status", width: 15 },
    ];

    milestonesSheet.columns = milestoneColumns;

    // Add milestone data
    const milestonesData = projects.flatMap(
      (project) =>
        project.milestones?.map((m) => ({
          project: project.title,
          milestone: m.milestone,
          owner: m.owner,
          date: m.date,
          completion: m.completion,
          status: m.status.toUpperCase(),
        })) || [],
    );

    milestonesData.forEach((milestone) => {
      const row = milestonesSheet.addRow(milestone);
      row.eachCell((cell, colNumber) => {
        // Default vertical middle alignment
        cell.alignment = { vertical: "middle" };

        // Format completion percentage
        if (colNumber === 5) {
          cell.numFmt = '0"%"';
          cell.alignment = { vertical: "middle", horizontal: "center" };
        }

        // Center status column
        if (colNumber === 6) {
          cell.alignment = { vertical: "middle", horizontal: "center" };
        }
      });
    });

    // Add conditional formatting for milestone status
    milestonesSheet.addConditionalFormatting({
      ref: `F2:F${milestonesData.length + 1}`,
      rules: [
        {
          type: "containsText",
          operator: "containsText",
          text: "GREEN",
          style: {
            fill: {
              type: "pattern",
              pattern: "solid",
              bgColor: { argb: "FFE2F0D9" },
            },
          },
        },
        {
          type: "containsText",
          operator: "containsText",
          text: "YELLOW",
          style: {
            fill: {
              type: "pattern",
              pattern: "solid",
              bgColor: { argb: "FFFFF2CC" },
            },
          },
        },
        {
          type: "containsText",
          operator: "containsText",
          text: "RED",
          style: {
            fill: {
              type: "pattern",
              pattern: "solid",
              bgColor: { argb: "FFFCE4D6" },
            },
          },
        },
      ],
    });

    // Add table formatting
    milestonesSheet.addTable({
      name: "MilestonesTable",
      ref: "A1",
      headerRow: true,
      totalsRow: false,
      style: {
        theme: "TableStyleMedium16",
        showRowStripes: true,
      },
      columns: milestoneColumns.map((col) => ({ name: col.header })),
      rows: milestonesData.map((m) => [
        m.project,
        m.milestone,
        m.owner,
        m.date,
        m.completion,
        m.status,
      ]),
    });
  }

  // Status Summary Sheet
  const summarySheet = workbook.addWorksheet("Status Summary");
  const summaryColumns = [
    { header: "Status", key: "status", width: 15 },
    { header: "Project Count", key: "count", width: 15 },
    { header: "Total Budget", key: "budget", width: 20 },
    { header: "Total Actuals", key: "actuals", width: 20 },
  ];

  summarySheet.columns = summaryColumns;

  // Add summary data
  const statuses = ["active", "on_hold", "completed", "cancelled"];
  const summaryData = statuses.map((status) => ({
    status: status.toUpperCase().replace("_", " "),
    count: projects.filter((p) => p.status === status).length,
    budget: projects
      .filter((p) => p.status === status)
      .reduce((sum, p) => sum + (p.budget_total || 0), 0),
    actuals: projects
      .filter((p) => p.status === status)
      .reduce((sum, p) => sum + (p.budget_actuals || 0), 0),
  }));

  summaryData.forEach((data) => {
    const row = summarySheet.addRow(data);
    row.eachCell((cell, colNumber) => {
      // Default vertical middle alignment
      cell.alignment = { vertical: "middle" };

      // Center status and project count
      if (colNumber === 1 || colNumber === 2) {
        cell.alignment = { vertical: "middle", horizontal: "center" };
      }

      // Format budget columns
      if (colNumber >= 3) {
        cell.numFmt = '"$"#,##0.00';
        cell.alignment = { vertical: "middle", horizontal: "right" };
      }
    });
  });

  // Add conditional formatting for status column in summary
  summarySheet.addConditionalFormatting({
    ref: `A2:A${summaryData.length + 1}`,
    rules: [
      {
        type: "containsText",
        operator: "containsText",
        text: "ACTIVE",
        style: {
          fill: {
            type: "pattern",
            pattern: "solid",
            bgColor: { argb: "FFE2F0D9" },
          },
        },
      },
      {
        type: "containsText",
        operator: "containsText",
        text: "ON HOLD",
        style: {
          fill: {
            type: "pattern",
            pattern: "solid",
            bgColor: { argb: "FFFFF2CC" },
          },
        },
      },
      {
        type: "containsText",
        operator: "containsText",
        text: "COMPLETED",
        style: {
          fill: {
            type: "pattern",
            pattern: "solid",
            bgColor: { argb: "FFD9E1F2" },
          },
        },
      },
      {
        type: "containsText",
        operator: "containsText",
        text: "CANCELLED",
        style: {
          fill: {
            type: "pattern",
            pattern: "solid",
            bgColor: { argb: "FFFCE4D6" },
          },
        },
      },
    ],
  });

  // Add table formatting
  summarySheet.addTable({
    name: "SummaryTable",
    ref: "A1",
    headerRow: true,
    totalsRow: false,
    style: {
      theme: "TableStyleMedium16",
      showRowStripes: true,
    },
    columns: summaryColumns.map((col) => ({ name: col.header })),
    rows: summaryData.map((d) => [d.status, d.count, d.budget, d.actuals]),
  });

  // Auto-fit columns for all worksheets
  workbook.worksheets.forEach((worksheet) => {
    worksheet.columns.forEach((column) => {
      let maxLength = 0;
      column.eachCell({ includeEmpty: true }, (cell) => {
        let columnLength = 0;
        if (cell.value) {
          if (cell.value.richText) {
            columnLength = cell.value.richText.reduce(
              (l, t) => l + t.text.length,
              0,
            );
          } else if (cell.value.text) {
            columnLength = cell.value.text.length;
          } else if (cell.value.hyperlink) {
            columnLength = cell.value.text
              ? cell.value.text.length
              : cell.value.hyperlink.length;
          } else if (typeof cell.value === "number") {
            columnLength = cell.text.length;
          } else {
            columnLength = cell.value.toString().length;
          }
        }
        // Add extra width for numbers and dates
        if (cell.numFmt) {
          columnLength *= 1.2;
        }
        if (columnLength > maxLength) {
          maxLength = columnLength;
        }
      });
      // Add extra padding for headers
      const headerLength = column.header ? column.header.length : 0;
      maxLength = Math.max(maxLength, headerLength);

      // Set minimum and maximum widths
      column.width = Math.max(8, Math.min(maxLength + 2, 100));
    });
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
