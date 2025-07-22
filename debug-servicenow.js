// Debug script to analyze ServiceNow Enhancements project
// Run this in the browser console on the application page

async function debugServiceNowProject() {
  console.log("🔍 Starting ServiceNow Enhancements project analysis...");

  try {
    // Import the debugging service
    const { projectHealthDebugger } = await import(
      "./src/lib/services/projectHealthDebugger.ts"
    );

    // Analyze the ServiceNow Enhancements project
    const result = await projectHealthDebugger.analyzeProjectByTitle(
      "ServiceNow Enhancements",
    );

    if (!result.project) {
      console.log("❌ Project not found!");
      console.log("Available projects:");
      const allProjects =
        await projectHealthDebugger.listAllProjectsHealthStatus();
      allProjects.forEach((p) => {
        console.log(
          `  - "${p.title}" (${p.calculatedStatusColor.toUpperCase()})`,
        );
      });
      return;
    }

    const { project, analysis } = result;

    console.log("\n📊 PROJECT ANALYSIS RESULTS");
    console.log("=".repeat(50));
    console.log(`Project: "${project.title}"`);
    console.log(`ID: ${project.id}`);
    console.log(`Status: ${analysis.projectStatus}`);
    console.log("");

    console.log("🎯 HEALTH STATUS CALCULATION");
    console.log("-".repeat(30));
    console.log(`Health Calculation Type: ${analysis.healthCalculationType}`);
    console.log(`Manual Status Color: ${analysis.manualStatusColor || "None"}`);
    console.log(
      `Computed Status Color: ${analysis.computedStatusColor || "None"}`,
    );
    console.log(
      `Calculated Status Color: ${analysis.calculatedStatusColor.toUpperCase()}`,
    );
    console.log("");

    console.log("📈 PROJECT METRICS");
    console.log("-".repeat(20));
    console.log(`Milestones Count: ${analysis.milestonesCount}`);
    console.log(`Weighted Completion: ${analysis.weightedCompletion}%`);
    console.log(
      `Time Remaining: ${analysis.timeRemainingPercentage !== null ? analysis.timeRemainingPercentage + "%" : "N/A"}`,
    );
    console.log(`Total Days: ${analysis.totalDays || "N/A"}`);
    console.log(
      `Total Days Remaining: ${analysis.totalDaysRemaining !== null ? analysis.totalDaysRemaining : "N/A"}`,
    );
    console.log(
      `Working Days Remaining: ${analysis.workingDaysRemaining !== null ? analysis.workingDaysRemaining : "N/A"}`,
    );
    console.log("");

    console.log("🧠 CALCULATION LOGIC");
    console.log("-".repeat(20));
    console.log(`Reason: ${analysis.calculationReason}`);
    console.log("");

    if (project.milestones && project.milestones.length > 0) {
      console.log("📋 MILESTONES BREAKDOWN");
      console.log("-".repeat(25));
      project.milestones.forEach((milestone, index) => {
        const dueDate = new Date(milestone.date);
        const today = new Date();
        const daysUntilDue = Math.ceil(
          (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
        );
        const status =
          daysUntilDue < 0
            ? "🔴 OVERDUE"
            : daysUntilDue <= 7
              ? "🟡 DUE SOON"
              : "🟢 ON TRACK";

        console.log(`${index + 1}. ${milestone.milestone}`);
        console.log(`   Completion: ${milestone.completion}%`);
        console.log(`   Weight: ${milestone.weight || 3}`);
        console.log(
          `   Due: ${milestone.date} (${daysUntilDue} days) ${status}`,
        );
        console.log(`   Owner: ${milestone.owner}`);
        console.log("");
      });
    }

    console.log("💡 RECOMMENDATIONS");
    console.log("-".repeat(20));
    if (analysis.recommendations.length > 0) {
      analysis.recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. ${rec}`);
      });
    } else {
      console.log("No specific recommendations.");
    }

    console.log("");
    console.log("✅ Analysis complete!");

    // Return the full result for further inspection
    return result;
  } catch (error) {
    console.error("❌ Error during analysis:", error);
    throw error;
  }
}

// Auto-run the analysis
debugServiceNowProject().catch(console.error);
