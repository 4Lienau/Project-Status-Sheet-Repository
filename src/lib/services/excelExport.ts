import ExcelJS from "exceljs";
import type { ProjectWithRelations } from "./project";

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
    { header: "Description", key: "description", width: 80 },
    { header: "Value Statement", key: "value_statement", width: 80 },
    { header: "Status", key: "status", width: 15 },
    { header: "Priority", key: "priority", width: 15 },
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
    const overallComplete =
      project.milestones.length > 0
        ? Math.round(
            project.milestones.reduce((acc, m) => acc + m.completion, 0) /
              project.milestones.length,
          )
        : 0;

    interface RowData extends Record<string, string | number> {
      title: string;
      description: string;
      value_statement: string;
      status: string;
      priority: string;
      overall_complete: number;
      budget_total: number;
      budget_actuals: number;
      budget_forecast: number;
      variance: number;
      charter_link: string;
      sponsors: string;
      business_leads: string;
      project_manager: string;
      created_at: string;
      updated_at: string;
      milestone_count: number;
      risk_count: number;
    }

    const rowData: RowData = {
      title: project.title,
      description: project.description || "",
      value_statement: project.value_statement || "",
      status: (project.status || "active").toUpperCase(),
      priority: project.priority?.toUpperCase() || "MEDIUM",
      overall_complete: overallComplete,
      budget_total: project.budget_total,
      budget_actuals: project.budget_actuals,
      budget_forecast: project.budget_forecast,
      variance: project.budget_total - project.budget_forecast,
      charter_link: project.charter_link,
      sponsors: project.sponsors,
      business_leads: project.business_leads,
      project_manager: project.project_manager,
      created_at: project.created_at
        ? new Date(project.created_at).toLocaleDateString()
        : "",
      updated_at: project.updated_at
        ? new Date(project.updated_at).toLocaleDateString()
        : "",
      milestone_count: project.milestones.length,
      risk_count: project.risks.length,
    };

    const row = overviewSheet.addRow(rowData);

    // Style all cells in the row
    row.eachCell((cell, colNumber) => {
      cell.alignment = { vertical: "middle" };

      // Format percentage column (Overall Complete)
      if (colNumber === 6) {
        cell.numFmt = '0"%"';
        cell.alignment = { vertical: "middle", horizontal: "center" };
      }

      // Format budget columns (7, 8, 9, 10)
      if (colNumber >= 7 && colNumber <= 10) {
        cell.numFmt = '"$"#,##0.00';
        cell.alignment = { vertical: "middle", horizontal: "right" };
      }

      // Bold and left-align project title
      if (colNumber === 1) {
        cell.font = { bold: true };
        cell.alignment = { vertical: "middle", horizontal: "left" };
      }

      // Text wrap for description and value statement
      if (colNumber === 2 || colNumber === 3) {
        cell.alignment = { vertical: "middle", wrapText: true };
      }

      // Center milestone and risk counts
      if (colNumber === 17 || colNumber === 18) {
        cell.alignment = { vertical: "middle", horizontal: "center" };
      }

      // Make charter link clickable
      if (colNumber === 11 && cell.value) {
        const url = cell.value.toString();
        cell.value = { text: url, hyperlink: url };
        cell.font = { color: { argb: "FF0000FF" }, underline: true };
      }
    });
  });

  // Add conditional formatting for status column
  overviewSheet.addConditionalFormatting({
    ref: `D2:D${projects.length + 1}`,
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
      {
        type: "containsText",
        operator: "containsText",
        text: "DRAFT",
        style: {
          fill: {
            type: "pattern",
            pattern: "solid",
            bgColor: { argb: "FFFFF2CC" },
          },
        },
      },
    ],
  });

  // Add conditional formatting for priority column
  overviewSheet.addConditionalFormatting({
    ref: `E2:E${projects.length + 1}`,
    rules: [
      {
        type: "containsText",
        operator: "containsText",
        text: "HIGH",
        style: {
          fill: {
            type: "pattern",
            pattern: "solid",
            bgColor: { argb: "FFFCE4D6" },
          },
        },
      },
      {
        type: "containsText",
        operator: "containsText",
        text: "MEDIUM",
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
        text: "LOW",
        style: {
          fill: {
            type: "pattern",
            pattern: "solid",
            bgColor: { argb: "FFE2F0D9" },
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
    rows: projects.map((project) => {
      const overallComplete =
        project.milestones.length > 0
          ? Math.round(
              project.milestones.reduce((acc, m) => acc + m.completion, 0) /
                project.milestones.length,
            )
          : 0;

      return [
        project.title,
        project.description || "",
        project.value_statement || "",
        (project.status || "active").toUpperCase(),
        project.priority?.toUpperCase() || "MEDIUM",
        overallComplete,
        project.budget_total,
        project.budget_actuals,
        project.budget_forecast,
        project.budget_total - project.budget_forecast,
        project.charter_link,
        project.sponsors,
        project.business_leads,
        project.project_manager,
        project.created_at
          ? new Date(project.created_at).toLocaleDateString()
          : "",
        project.updated_at
          ? new Date(project.updated_at).toLocaleDateString()
          : "",
        project.milestones.length,
        project.risks.length,
      ];
    }),
  });

  // Milestones Sheet
  const milestonesSheet = workbook.addWorksheet("Milestones");
  const milestonesColumns = [
    { header: "Project", key: "project", width: 30 },
    { header: "Date", key: "date", width: 15 },
    { header: "Milestone", key: "milestone", width: 40 },
    { header: "Owner", key: "owner", width: 20 },
    { header: "Completion", key: "completion", width: 15 },
    { header: "Status", key: "status", width: 15 },
  ];

  milestonesSheet.columns = milestonesColumns;

  // Add milestones data
  const allMilestones = [];
  projects.forEach((project) => {
    project.milestones.forEach((milestone) => {
      allMilestones.push({
        project: project.title,
        date: milestone.date,
        milestone: milestone.milestone,
        owner: milestone.owner,
        completion: milestone.completion,
        status: milestone.status.toUpperCase(),
      });
    });
  });

  allMilestones.forEach((milestone) => {
    const row = milestonesSheet.addRow(milestone);
    row.eachCell((cell, colNumber) => {
      cell.alignment = { vertical: "middle" };

      // Format completion percentage
      if (colNumber === 5) {
        cell.numFmt = '0"%"';
        cell.alignment = { vertical: "middle", horizontal: "center" };
      }

      // Format status column
      if (colNumber === 6) {
        cell.alignment = { vertical: "middle", horizontal: "center" };
      }
    });
  });

  // Add conditional formatting for status column
  milestonesSheet.addConditionalFormatting({
    ref: `F2:F${allMilestones.length + 1}`,
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

  // Add table formatting to milestones
  milestonesSheet.addTable({
    name: "MilestonesTable",
    ref: "A1",
    headerRow: true,
    totalsRow: false,
    style: {
      theme: "TableStyleMedium16",
      showRowStripes: true,
    },
    columns: milestonesColumns.map((col) => ({ name: col.header })),
    rows: allMilestones.map((m) => [
      m.project,
      m.date,
      m.milestone,
      m.owner,
      m.completion,
      m.status,
    ]),
  });

  // Budget Details Sheet
  const budgetSheet = workbook.addWorksheet("Budget Details");
  const budgetColumns = [
    { header: "Project", key: "project", width: 30 },
    { header: "Status", key: "status", width: 15 },
    { header: "Priority", key: "priority", width: 15 },
    { header: "Total Budget", key: "budget_total", width: 20 },
    { header: "Actuals", key: "budget_actuals", width: 20 },
    { header: "Forecast", key: "budget_forecast", width: 20 },
    { header: "Variance", key: "variance", width: 20 },
    { header: "% Budget Used", key: "budget_used", width: 15 },
    { header: "% Budget Forecast", key: "budget_forecast_pct", width: 15 },
  ];

  budgetSheet.columns = budgetColumns;

  // Add budget data
  projects.forEach((project) => {
    const budgetUsed = project.budget_total
      ? (project.budget_actuals / project.budget_total) * 100
      : 0;
    const budgetForecast = project.budget_total
      ? (project.budget_forecast / project.budget_total) * 100
      : 0;
    const variance = project.budget_total - project.budget_forecast;

    type BudgetRowData = {
      project: string;
      status: string;
      priority: string;
      budget_total: number;
      budget_actuals: number;
      budget_forecast: number;
      variance: number;
      budget_used: number;
      budget_forecast_pct: number;
    };

    const row = budgetSheet.addRow({
      project: project.title,
      status: (project.status || "active").toUpperCase(),
      priority: project.priority?.toUpperCase() || "MEDIUM",
      budget_total: project.budget_total,
      budget_actuals: project.budget_actuals,
      budget_forecast: project.budget_forecast,
      variance: variance,
      budget_used: budgetUsed,
      budget_forecast_pct: budgetForecast,
    } as BudgetRowData);

    row.eachCell((cell, colNumber) => {
      cell.alignment = { vertical: "middle" };

      // Format currency columns
      if (colNumber >= 4 && colNumber <= 7) {
        cell.numFmt = '"$"#,##0.00';
        cell.alignment = { vertical: "middle", horizontal: "right" };
      }

      // Format percentage columns
      if (colNumber === 8 || colNumber === 9) {
        cell.numFmt = '0.0"%"';
        cell.alignment = { vertical: "middle", horizontal: "center" };
      }

      // Add conditional formatting for variance
      if (colNumber === 7) {
        if (cell.value < 0) {
          cell.font = { color: { argb: "FFFF0000" } }; // Red for negative variance
        } else if (cell.value > 0) {
          cell.font = { color: { argb: "FF008000" } }; // Green for positive variance
        }
      }
    });
  });

  // Add conditional formatting for status column
  budgetSheet.addConditionalFormatting({
    ref: `B2:B${projects.length + 1}`,
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
      {
        type: "containsText",
        operator: "containsText",
        text: "DRAFT",
        style: {
          fill: {
            type: "pattern",
            pattern: "solid",
            bgColor: { argb: "FFFFF2CC" },
          },
        },
      },
    ],
  });

  // Add conditional formatting for priority column
  budgetSheet.addConditionalFormatting({
    ref: `C2:C${projects.length + 1}`,
    rules: [
      {
        type: "containsText",
        operator: "containsText",
        text: "HIGH",
        style: {
          fill: {
            type: "pattern",
            pattern: "solid",
            bgColor: { argb: "FFFCE4D6" },
          },
        },
      },
      {
        type: "containsText",
        operator: "containsText",
        text: "MEDIUM",
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
        text: "LOW",
        style: {
          fill: {
            type: "pattern",
            pattern: "solid",
            bgColor: { argb: "FFE2F0D9" },
          },
        },
      },
    ],
  });

  // Add table formatting to budget details
  budgetSheet.addTable({
    name: "BudgetDetailsTable",
    ref: "A1",
    headerRow: true,
    totalsRow: true,
    style: {
      theme: "TableStyleMedium16",
      showRowStripes: true,
    },
    columns: budgetColumns.map((col) => ({ name: col.header })),
    rows: projects.map((project) => {
      const budgetUsed = project.budget_total
        ? (project.budget_actuals / project.budget_total) * 100
        : 0;
      const budgetForecast = project.budget_total
        ? (project.budget_forecast / project.budget_total) * 100
        : 0;
      const variance = project.budget_total - project.budget_forecast;
      return [
        project.title,
        (project.status || "active").toUpperCase(),
        project.priority?.toUpperCase() || "MEDIUM",
        project.budget_total,
        project.budget_actuals,
        project.budget_forecast,
        variance,
        budgetUsed,
        budgetForecast,
      ];
    }),
  });

  // Generate and save the file
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `Projects_${username || "export"}_${new Date().toISOString().split("T")[0]}.xlsx`;
  link.click();
  window.URL.revokeObjectURL(url);
};
