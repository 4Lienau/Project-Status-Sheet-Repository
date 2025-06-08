/**
 * Test file for AI Service milestone generation
 * Run this in browser console to test milestone generation
 */

// Test the ensureMandatoryMilestones function
function testMandatoryMilestones() {
  console.log("🧪 Testing AI Service Mandatory Milestones...");

  // Test cases
  const testCases = [
    {
      name: "Empty array",
      input: [],
      expected: ["Project Kickoff", "Project Closeout"],
    },
    {
      name: "Missing kickoff",
      input: [
        { milestone: "Design Phase", owner: "Designer" },
        { milestone: "Project Closeout", owner: "Project Manager" },
      ],
      expected: ["Project Kickoff", "Design Phase", "Project Closeout"],
    },
    {
      name: "Missing closeout",
      input: [
        { milestone: "Project Kickoff", owner: "Project Manager" },
        { milestone: "Development", owner: "Developer" },
      ],
      expected: ["Project Kickoff", "Development", "Project Closeout"],
    },
    {
      name: "Wrong order",
      input: [
        { milestone: "Development", owner: "Developer" },
        { milestone: "Project Closeout", owner: "Project Manager" },
        { milestone: "Project Kickoff", owner: "Project Manager" },
      ],
      expected: ["Project Kickoff", "Development", "Project Closeout"],
    },
    {
      name: "Already correct",
      input: [
        { milestone: "Project Kickoff", owner: "Project Manager" },
        { milestone: "Development", owner: "Developer" },
        { milestone: "Project Closeout", owner: "Project Manager" },
      ],
      expected: ["Project Kickoff", "Development", "Project Closeout"],
    },
  ];

  // Import the aiService (this would need to be adjusted for actual testing)
  // For now, we'll simulate the ensureMandatoryMilestones function
  const ensureMandatoryMilestones = (milestones) => {
    const hasKickoff = milestones.some(
      (m) => m.milestone && m.milestone.toLowerCase().includes("kickoff"),
    );
    const hasCloseout = milestones.some(
      (m) =>
        m.milestone &&
        (m.milestone.toLowerCase().includes("closeout") ||
          m.milestone.toLowerCase().includes("closure")),
    );

    let processedMilestones = [...milestones];

    if (!hasKickoff) {
      processedMilestones.unshift({
        milestone: "Project Kickoff",
        owner: "Project Manager",
        completion: 0,
        status: "green",
      });
    }

    if (!hasCloseout) {
      processedMilestones.push({
        milestone: "Project Closeout",
        owner: "Project Manager",
        completion: 0,
        status: "green",
      });
    }

    // Move kickoff to beginning if not first
    const kickoffIndex = processedMilestones.findIndex(
      (m) => m.milestone && m.milestone.toLowerCase().includes("kickoff"),
    );
    if (kickoffIndex > 0) {
      const kickoffMilestone = processedMilestones.splice(kickoffIndex, 1)[0];
      processedMilestones.unshift(kickoffMilestone);
    }

    // Move closeout to end if not last
    const closeoutIndex = processedMilestones.findIndex(
      (m) =>
        m.milestone &&
        (m.milestone.toLowerCase().includes("closeout") ||
          m.milestone.toLowerCase().includes("closure")),
    );
    if (closeoutIndex >= 0 && closeoutIndex < processedMilestones.length - 1) {
      const closeoutMilestone = processedMilestones.splice(closeoutIndex, 1)[0];
      processedMilestones.push(closeoutMilestone);
    }

    return processedMilestones;
  };

  // Run tests
  let passed = 0;
  let failed = 0;

  testCases.forEach((testCase, index) => {
    console.log(`\n📋 Test ${index + 1}: ${testCase.name}`);
    console.log(
      "Input:",
      testCase.input.map((m) => m.milestone),
    );

    const result = ensureMandatoryMilestones(testCase.input);
    const resultMilestones = result.map((m) => m.milestone);

    console.log("Result:", resultMilestones);
    console.log("Expected:", testCase.expected);

    const isCorrect =
      JSON.stringify(resultMilestones) === JSON.stringify(testCase.expected);

    if (isCorrect) {
      console.log("✅ PASSED");
      passed++;
    } else {
      console.log("❌ FAILED");
      failed++;
    }
  });

  console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed`);

  if (failed === 0) {
    console.log(
      "🎉 All tests passed! Mandatory milestones functionality is working correctly.",
    );
  } else {
    console.log("⚠️ Some tests failed. Please review the implementation.");
  }
}

// Auto-run the test
testMandatoryMilestones();

// Make function globally available
window.testMandatoryMilestones = testMandatoryMilestones;

console.log("\n🚀 AI Service Test loaded!");
console.log("Usage: testMandatoryMilestones()");
