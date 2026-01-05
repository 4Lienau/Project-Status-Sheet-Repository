import ExcelJS from "exceljs";
import {
  ProjectWithRelations,
  calculateProjectHealthStatusColor,
} from "./project";

// Helper function to strip HTML tags from text
const stripHtmlTags = (text: string | null | undefined): string => {
  if (!text) return "";
  return text.replace(/<[^>]*>/g, "");
};

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
    { header: "Project ID", key: "project_id", width: 15 },
    { header: "Project Title", key: "title", width: 30 },
    { header: "Description", key: "description", width: 80 },
    { header: "Value Statement", key: "value_statement", width: 80 },
    { header: "Status", key: "status", width: 15 },
    { header: "Health Status", key: "health_status", width: 18 },
    { header: "Overall Complete", key: "overall_complete", width: 15 },
    { header: "Total Budget", key: "budget_total", width: 15 },
    { header: "Actuals", key: "budget_actuals", width: 15 },
    { header: "Forecast", key: "budget_forecast", width: 15 },
    { header: "Budget Variance", key: "variance", width: 15 },
    { header: "Budget Remaining", key: "budget_remaining", width: 15 },
    { header: "Charter Link", key: "charter_link", width: 30 },
    { header: "Sponsors", key: "sponsors", width: 20 },
    { header: "Business Leads", key: "business_leads", width: 20 },
    { header: "Project Manager", key: "project_manager", width: 20 },
    {
      header: "Working Days Remaining",
      key: "working_days_remaining",
      width: 20,
    },
    { header: "Total Days Remaining", key: "total_days_remaining", width: 20 },
    { header: "Total Duration (Days)", key: "total_days", width: 20 },
    { header: "Working Days Duration", key: "working_days", width: 20 },
    {
      header: "Calculated Start Date",
      key: "calculated_start_date",
      width: 18,
    },
    { header: "Calculated End Date", key: "calculated_end_date", width: 18 },
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

    // Calculate health status
    const healthStatusColor = calculateProjectHealthStatusColor(project);
    const healthStatusText =
      project.status === "cancelled"
        ? "Cancelled"
        : healthStatusColor === "green"
          ? "Green (On Track)"
          : healthStatusColor === "yellow"
            ? "Yellow (At Risk)"
            : "Red (Critical)";

    const row = overviewSheet.addRow({
      project_id: project.project_id || "",
      title: stripHtmlTags(project.title),
      description: stripHtmlTags(project.description || ""),
      value_statement: stripHtmlTags(project.value_statement || ""),
      status: (project.status || "active").toUpperCase(),
      health_status: healthStatusText,
      overall_complete: overallComplete,
      budget_total: project.budget_total,
      budget_actuals: project.budget_actuals,
      budget_forecast: project.budget_forecast,
      variance: project.budget_total - project.budget_forecast,
      budget_remaining: project.budget_total - (project.budget_actuals || 0),
      charter_link: project.charter_link,
      sponsors: stripHtmlTags(project.sponsors || ""),
      business_leads: stripHtmlTags(project.business_leads || ""),
      project_manager: stripHtmlTags(project.project_manager || ""),
      working_days_remaining: project.working_days_remaining || null,
      total_days_remaining: project.total_days_remaining || null,
      total_days: project.total_days || null,
      working_days: project.working_days || null,
      calculated_start_date: project.calculated_start_date
        ? new Date(project.calculated_start_date).toLocaleDateString()
        : null,
      calculated_end_date: project.calculated_end_date
        ? new Date(project.calculated_end_date).toLocaleDateString()
        : null,
      created_at: new Date(project.created_at || "").toLocaleDateString(),
      updated_at: new Date(project.updated_at || "").toLocaleDateString(),
      milestone_count: project.milestones?.length || 0,
      risk_count: project.risks?.length || 0,
    });

    // Style all cells in the row
    row.eachCell((cell, colNumber) => {
      // Default vertical middle alignment
      cell.alignment = { vertical: "middle" };

      // Format percentage column (Overall Complete) - now column 7
      if (colNumber === 7) {
        cell.numFmt = '0"%"';
        cell.alignment = { vertical: "middle", horizontal: "center" };
      }

      // Format budget columns (8, 9, 10, 11, 12)
      if (colNumber >= 8 && colNumber <= 12) {
        cell.numFmt = '"$"#,##0.00';
        cell.alignment = { vertical: "middle", horizontal: "right" };
      }

      // Center health status column (6)
      if (colNumber === 6) {
        cell.alignment = { vertical: "middle", horizontal: "center" };
      }

      // Bold and left-align project title
      if (colNumber === 2) {
        cell.font = { bold: true };
        cell.alignment = { vertical: "middle", horizontal: "left" };
      }

      // Text wrap for description and value statement
      if (colNumber === 3 || colNumber === 4) {
        cell.alignment = { vertical: "middle", wrapText: true };
      }

      // Center project ID
      if (colNumber === 1) {
        cell.alignment = { vertical: "middle", horizontal: "center" };
        cell.font = { bold: true };
      }

      // Format duration columns (17, 18, 19, 20) - center align numbers
      if (colNumber >= 17 && colNumber <= 20) {
        cell.alignment = { vertical: "middle", horizontal: "center" };
      }

      // Format date columns (21, 22, 23, 24)
      if (colNumber >= 21 && colNumber <= 24) {
        cell.alignment = { vertical: "middle", horizontal: "center" };
      }

      // Center milestone and risk counts
      if (colNumber === 25 || colNumber === 26) {
        cell.alignment = { vertical: "middle", horizontal: "center" };
      }

      // Make charter link clickable
      if (colNumber === 13 && cell.value) {
        const url = cell.value.toString();
        cell.value = { text: url, hyperlink: url };
        cell.font = { color: { argb: "FF0000FF" }, underline: true };
      }
    });
  });

  // Add conditional formatting for status column
  overviewSheet.addConditionalFormatting({
    ref: `E2:E${projects.length + 1}`,
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

  // Add conditional formatting for health status column
  overviewSheet.addConditionalFormatting({
    ref: `F2:F${projects.length + 1}`,
    rules: [
      {
        type: "containsText",
        operator: "containsText",
        text: "Green",
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
        text: "Yellow",
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
        text: "Red",
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
        text: "Cancelled",
        style: {
          fill: {
            type: "pattern",
            pattern: "solid",
            bgColor: { argb: "FFF0F0F0" },
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
      const healthStatusColor = calculateProjectHealthStatusColor(project);
      const healthStatusText =
        project.status === "cancelled"
          ? "Cancelled"
          : healthStatusColor === "green"
            ? "Green (On Track)"
            : healthStatusColor === "yellow"
              ? "Yellow (At Risk)"
              : "Red (Critical)";

      const overallCompletion = project.milestones?.length
        ? Math.round(
            project.milestones.reduce((acc, m) => acc + m.completion, 0) /
              project.milestones.length,
          )
        : 0;

      const budgetVariance = project.budget_total - project.budget_forecast;
      const budgetRemaining =
        project.budget_total - (project.budget_actuals || 0);

      return [
        project.project_id || "",
        stripHtmlTags(project.title),
        stripHtmlTags(project.description || ""),
        stripHtmlTags(project.value_statement || ""),
        (project.status || "active").toUpperCase(),
        healthStatusText,
        overallCompletion,
        project.budget_total,
        project.budget_actuals,
        project.budget_forecast,
        budgetVariance,
        budgetRemaining,
        project.charter_link,
        stripHtmlTags(project.sponsors || ""),
        stripHtmlTags(project.business_leads || ""),
        stripHtmlTags(project.project_manager || ""),
        project.working_days_remaining || null,
        project.total_days_remaining || null,
        project.total_days || null,
        project.working_days || null,
        project.calculated_start_date
          ? new Date(project.calculated_start_date).toLocaleDateString()
          : null,
        project.calculated_end_date
          ? new Date(project.calculated_end_date).toLocaleDateString()
          : null,
        new Date(project.created_at || "").toLocaleDateString(),
        new Date(project.updated_at || "").toLocaleDateString(),
        project.milestones?.length || 0,
        project.risks?.length || 0,
      ];
    }),
  });

  // Milestones Sheet
  const milestonesSheet = workbook.addWorksheet("Milestones");
  const milestonesColumns = [
    { header: "Project ID", key: "project_id", width: 15 },
    { header: "Project", key: "project", width: 30 },
    { header: "Start Date", key: "date", width: 15 },
    { header: "End Date", key: "end_date", width: 15 },
    { header: "Milestone", key: "milestone", width: 40 },
    { header: "Owner", key: "owner", width: 20 },
    { header: "Completion", key: "completion", width: 15 },
    { header: "Status", key: "status", width: 15 },
  ];

  milestonesSheet.columns = milestonesColumns;

  // Add milestones data
  const allMilestones = [];
  projects.forEach((project) => {
    project.milestones?.forEach((milestone) => {
      allMilestones.push({
        project_id: project.project_id || "",
        project: stripHtmlTags(project.title),
        date: milestone.date,
        end_date: milestone.end_date || "",
        milestone: stripHtmlTags(milestone.milestone || ""),
        owner: stripHtmlTags(milestone.owner || ""),
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
      if (colNumber === 7) {
        cell.numFmt = '0"%"';
        cell.alignment = { vertical: "middle", horizontal: "center" };
      }

      // Format status column
      if (colNumber === 8) {
        cell.alignment = { vertical: "middle", horizontal: "center" };
      }

      // Center project ID
      if (colNumber === 1) {
        cell.alignment = { vertical: "middle", horizontal: "center" };
        cell.font = { bold: true };
      }
    });
  });

  // Add conditional formatting for status column
  milestonesSheet.addConditionalFormatting({
    ref: `H2:H${allMilestones.length + 1}`,
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
      m.project_id,
      m.project,
      m.date,
      m.end_date,
      m.milestone,
      m.owner,
      m.completion,
      m.status,
    ]),
  });

  // Budget Details Sheet
  const budgetSheet = workbook.addWorksheet("Budget Details");
  const budgetColumns = [
    { header: "Project ID", key: "project_id", width: 15 },
    { header: "Project", key: "project", width: 30 },
    { header: "Status", key: "status", width: 15 },
    { header: "Total Budget", key: "budget_total", width: 20 },
    { header: "Actuals", key: "budget_actuals", width: 20 },
    { header: "Forecast", key: "budget_forecast", width: 20 },
    { header: "Variance", key: "variance", width: 20 },
    { header: "% Budget Used", key: "budget_used", width: 15 },
    { header: "% Budget Forecast", key: "budget_forecast_pct", width: 15 },
    { header: "Budget Remaining", key: "budget_remaining", width: 20 },
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

    const row = budgetSheet.addRow({
      project_id: project.project_id || "",
      project: stripHtmlTags(project.title),
      status: (project.status || "active").toUpperCase(),
      budget_total: project.budget_total,
      budget_actuals: project.budget_actuals,
      budget_forecast: project.budget_forecast,
      variance: variance,
      budget_used: budgetUsed,
      budget_forecast_pct: budgetForecast,
      budget_remaining: project.budget_total - (project.budget_actuals || 0),
    });

    row.eachCell((cell, colNumber) => {
      cell.alignment = { vertical: "middle" };

      // Center project ID
      if (colNumber === 1) {
        cell.alignment = { vertical: "middle", horizontal: "center" };
        cell.font = { bold: true };
      }

      // Format currency columns (including budget remaining)
      if ((colNumber >= 4 && colNumber <= 7) || colNumber === 10) {
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
        project.project_id || "",
        stripHtmlTags(project.title),
        (project.status || "active").toUpperCase(),
        project.budget_total,
        project.budget_actuals,
        project.budget_forecast,
        variance,
        budgetUsed,
        budgetForecast,
        project.budget_total - (project.budget_actuals || 0),
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
  link.download = `Projects_${username || "export"}_${
    new Date().toISOString().split("T")[0]
  }.xlsx`;
  link.click();
  window.URL.revokeObjectURL(url);
};
