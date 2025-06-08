// Debug script to analyze project health calculations
// Run this in the browser console on your application page

async function debugProjectHealth(projectTitle = null) {
  console.log("🔍 Starting project health analysis...");

  try {
    // Import the analyzer service
    const { projectHealthAnalyzer } = await import(
      "./src/lib/services/projectHealthAnalyzer.ts"
    );
    const { projectService } = await import("./src/lib/services/project.ts");

    let projectToAnalyze = null;

    if (projectTitle) {
      // Find project by title
      const allProjects = await projectService.getAllProjects();
      projectToAnalyze = allProjects.find((p) =>
        p.title.toLowerCase().includes(projectTitle.toLowerCase()),
      );

      if (!projectToAnalyze) {
        console.log(
          `❌ Project with title containing "${projectTitle}" not found!`,
        );
        console.log("Available projects:");
        allProjects.forEach((p, index) => {
          console.log(`  ${index + 1}. "${p.title}"`);
        });
        return;
      }
    } else {
      // List all projects and let user choose
      const allProjects = await projectService.getAllProjects();
      console.log("📋 Available projects:");
      allProjects.forEach((p, index) => {
        console.log(`  ${index + 1}. "${p.title}" (ID: ${p.id})`);
      });
      console.log(
        "\n💡 To analyze a specific project, call: debugProjectHealth('project title')\n",
      );
      return;
    }

    console.log(`\n🎯 Analyzing project: "${projectToAnalyze.title}"`);
    console.log("=".repeat(60));

    // Perform detailed analysis
    const analysis = await projectHealthAnalyzer.analyzeProject(
      projectToAnalyze.id,
    );

    if (!analysis.project) {
      console.log("❌ Failed to analyze project");
      return;
    }

    const {
      healthStatus,
      calculationType,
      reasoning,
      metrics,
      recommendations,
      debugInfo,
    } = analysis.analysis;
    const statusEmoji =
      healthStatus === "green" ? "🟢" : healthStatus === "yellow" ? "🟡" : "🔴";

    // Display results
    console.log(
      `\n${statusEmoji} HEALTH STATUS: ${healthStatus.toUpperCase()}`,
    );
    console.log(`📊 Calculation Type: ${calculationType}`);
    console.log(`💭 Reasoning: ${reasoning}`);
    console.log("");

    console.log("📈 PROJECT METRICS:");
    console.log("-".repeat(20));
    console.log(`• Weighted Completion: ${metrics.weightedCompletion}%`);
    console.log(
      `• Time Remaining: ${metrics.timeRemainingPercentage || "N/A"}%`,
    );
    console.log(`• Total Days: ${metrics.totalDays || "N/A"}`);
    console.log(`• Days Remaining: ${metrics.totalDaysRemaining || "N/A"}`);
    console.log(
      `• Working Days Remaining: ${metrics.workingDaysRemaining || "N/A"}`,
    );
    console.log(`• Start Date: ${metrics.startDate || "N/A"}`);
    console.log(`• End Date: ${metrics.endDate || "N/A"}`);
    console.log(
      `• Starts in Future: ${metrics.projectStartsInFuture ? "Yes" : "No"}`,
    );
    console.log(`• Is Overdue: ${metrics.isOverdue ? "Yes" : "No"}`);
    console.log("");

    if (debugInfo.milestoneCount > 0) {
      console.log("🎯 MILESTONE DETAILS:");
      console.log("-".repeat(25));
      debugInfo.milestoneDetails.forEach((milestone, index) => {
        const statusEmoji =
          milestone.status === "green"
            ? "🟢"
            : milestone.status === "yellow"
              ? "🟡"
              : "🔴";
        const daysText =
          milestone.daysFromToday < 0
            ? `${Math.abs(milestone.daysFromToday)} days overdue`
            : milestone.daysFromToday === 0
              ? "Due today"
              : `${milestone.daysFromToday} days remaining`;

        console.log(`${index + 1}. ${milestone.milestone}`);
        console.log(
          `   ${statusEmoji} ${milestone.completion}% complete (weight: ${milestone.weight})`,
        );
        console.log(`   📅 Due: ${milestone.date} (${daysText})`);
        console.log("");
      });
    }

    if (recommendations.length > 0) {
      console.log("💡 RECOMMENDATIONS:");
      console.log("-".repeat(20));
      recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. ${rec}`);
      });
      console.log("");
    }

    console.log("✅ Analysis complete!");
    console.log(
      "\n💡 To analyze another project, call: debugProjectHealth('project title')",
    );

    // Return the analysis for further inspection
    return analysis;
  } catch (error) {
    console.error("❌ Error during analysis:", error);
    throw error;
  }
}

// Auto-run to show available projects
debugProjectHealth().catch(console.error);

// Make function globally available
window.debugProjectHealth = debugProjectHealth;

console.log("\n🚀 Project Health Debugger loaded!");
console.log("Usage: debugProjectHealth('project title')");
console.log("Example: debugProjectHealth('ServiceNow')");
