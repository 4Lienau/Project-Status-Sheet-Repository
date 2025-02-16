import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/lib/hooks/useAuth";
import { Plus, FileText, BarChart3, Users2 } from "lucide-react";

const WelcomePage = ({ onGetStarted }: { onGetStarted: () => void }) => {
  const { user } = useAuth();

  return (
    <div className="max-w-5xl mx-auto p-8 space-y-8">
      {/* Hero Section */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">
          Welcome to the Project Status Dashboard
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Your central hub for tracking project progress, managing milestones,
          and sharing updates with stakeholders.
        </p>
      </div>

      {/* Feature Cards */}
      <div className="grid md:grid-cols-2 gap-6 py-8">
        <Card className="p-6 space-y-4 bg-gradient-to-br from-purple-50 to-white">
          <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
            <FileText className="h-6 w-6 text-purple-600" />
          </div>
          <h3 className="text-xl font-semibold">Status Sheets</h3>
          <p className="text-muted-foreground">
            Create and manage comprehensive project status sheets with key
            metrics, milestones, and progress indicators.
          </p>
        </Card>

        <Card className="p-6 space-y-4 bg-gradient-to-br from-blue-50 to-white">
          <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
            <BarChart3 className="h-6 w-6 text-blue-600" />
          </div>
          <h3 className="text-xl font-semibold">Progress Tracking</h3>
          <p className="text-muted-foreground">
            Monitor project health, budget utilization, and milestone completion
            with visual indicators and real-time updates.
          </p>
        </Card>

        <Card className="p-6 space-y-4 bg-gradient-to-br from-green-50 to-white">
          <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
            <Users2 className="h-6 w-6 text-green-600" />
          </div>
          <h3 className="text-xl font-semibold">Team Collaboration</h3>
          <p className="text-muted-foreground">
            Assign roles, track responsibilities, and keep everyone aligned with
            clear ownership and communication.
          </p>
        </Card>

        <Card className="p-6 space-y-4 bg-gradient-to-br from-orange-50 to-white">
          <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center">
            <img
              src="https://api.dicebear.com/7.x/icons/svg?seed=project&backgroundColor=orange"
              alt="Project icon"
              className="h-6 w-6"
            />
          </div>
          <h3 className="text-xl font-semibold">Version History</h3>
          <p className="text-muted-foreground">
            Keep track of project evolution with automatic version control and
            historical snapshots of status sheets.
          </p>
        </Card>
      </div>

      {/* Getting Started Section */}
      <Card className="p-8 bg-gradient-to-r from-purple-500 to-blue-500 text-white">
        <div className="max-w-2xl mx-auto text-center space-y-6">
          <h2 className="text-2xl font-semibold">Ready to get started?</h2>
          <p className="text-lg opacity-90">
            Sign in to start managing your projects and tracking progress
            effectively.
          </p>
          <Button
            onClick={onGetStarted}
            size="lg"
            variant="secondary"
            className="bg-white text-purple-600 hover:bg-white/90"
          >
            Login to Get Started
          </Button>
        </div>
      </Card>

      {/* Quick Tips */}
      <div className="rounded-lg border bg-card p-6">
        <h3 className="text-lg font-semibold mb-4">Quick Tips:</h3>
        <ul className="space-y-2 list-disc list-inside text-muted-foreground">
          <li>Start by creating a new project with basic information</li>
          <li>Add key milestones and assign team members</li>
          <li>Track progress using the visual status indicators</li>
          <li>Update accomplishments and next steps regularly</li>
          <li>Export status sheets for stakeholder communications</li>
        </ul>
      </div>
    </div>
  );
};

export default WelcomePage;
