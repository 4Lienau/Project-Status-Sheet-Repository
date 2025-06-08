// Debug script to identify the source of >100% time remaining calculations
// Run this in the browser console on your application page

async function debugTimeRemainingIssue() {
  console.log("🔍 Starting time remaining percentage debug analysis...");

  try {
    // Import the services
    const { projectService } = await import("./src/lib/services/project.ts");
    const { projectHealthAnalyzer } = await import(
      "./src/lib/services/projectHealthAnalyzer.ts"
    );

    // Get all projects
    const allProjects = await projectService.getAllProjects();
    console.log(`📊 Found ${allProjects.length} projects to analyze`);

    const issuesFound = [];

    for (const project of allProjects) {
      console.log(`\n🔍 Analyzing project: "${project.title}"`);
      console.log("Project data:", {
        id: project.id,
        total_days: project.total_days,
        total_days_remaining: project.total_days_remaining,
        calculated_start_date: project.calculated_start_date,
        calculated_end_date: project.calculated_end_date,
      });

      // Check for potential issues
      if (
        project.total_days &&
        project.total_days_remaining !== null &&
        project.total_days_remaining !== undefined
      ) {
        const rawPercentage = Math.round(
          (project.total_days_remaining / project.total_days) * 100,
        );

        console.log(`Raw calculation: ${rawPercentage}%`);

        if (rawPercentage > 100) {
          const issue = {
            projectId: project.id,
            projectTitle: project.title,
            totalDays: project.total_days,
            remainingDays: project.total_days_remaining,
            rawPercentage,
            startDate: project.calculated_start_date,
            endDate: project.calculated_end_date,
            issue: `Raw calculation shows ${rawPercentage}% time remaining`,
          };

          issuesFound.push(issue);
          console.log("❌ ISSUE FOUND:", issue);

          // Analyze why this is happening
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          const startDate = project.calculated_start_date
            ? new Date(project.calculated_start_date)
            : null;
          const endDate = project.calculated_end_date
            ? new Date(project.calculated_end_date)
            : null;

          if (startDate && endDate) {
            const projectDuration = Math.ceil(
              (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
            );
            const daysFromTodayToEnd = Math.ceil(
              (endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
            );

            console.log("📅 Date analysis:", {
              today: today.toDateString(),
              startDate: startDate.toDateString(),
              endDate: endDate.toDateString(),
              projectDuration,
              daysFromTodayToEnd,
              startsInFuture: startDate > today,
              explanation:
                daysFromTodayToEnd > projectDuration
                  ? "Days from today to end > project duration (future project)"
                  : "Normal project timeline",
            });
          }
        } else {
          console.log(`✅ Normal percentage: ${rawPercentage}%`);
        }
      } else {
        console.log("⚠️ Missing duration data");
      }
    }

    console.log("\n📋 SUMMARY OF ISSUES FOUND:");
    console.log("=".repeat(50));

    if (issuesFound.length === 0) {
      console.log("✅ No projects with >100% time remaining found!");
    } else {
      console.log(
        `❌ Found ${issuesFound.length} projects with >100% time remaining:`,
      );
      issuesFound.forEach((issue, index) => {
        console.log(`\n${index + 1}. "${issue.projectTitle}"`);
        console.log(`   - Total Days: ${issue.totalDays}`);
        console.log(`   - Remaining Days: ${issue.remainingDays}`);
        console.log(`   - Raw Percentage: ${issue.rawPercentage}%`);
        console.log(`   - Start Date: ${issue.startDate}`);
        console.log(`   - End Date: ${issue.endDate}`);
        console.log(`   - Issue: ${issue.issue}`);
      });

      console.log("\n💡 RECOMMENDED FIXES:");
      console.log(
        "1. The calculateTimeRemainingPercentage function should cap at 100%",
      );
      console.log("2. All UI components should use this standardized function");
      console.log(
        "3. Future projects need special handling in duration calculations",
      );
    }

    console.log("\n✅ Analysis complete!");
    return issuesFound;
  } catch (error) {
    console.error("❌ Error during analysis:", error);
    throw error;
  }
}

// Auto-run the analysis
debugTimeRemainingIssue().catch(console.error);

// Make function globally available
window.debugTimeRemainingIssue = debugTimeRemainingIssue;

console.log("\n🚀 Time Remaining Issue Debugger loaded!");
console.log("Usage: debugTimeRemainingIssue()");
