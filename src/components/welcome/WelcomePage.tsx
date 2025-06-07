import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const WelcomePage = ({ onGetStarted }: { onGetStarted: () => void }) => {
  return (
    <div className="max-w-5xl mx-auto p-8 space-y-8">
      <div className="text-center space-y-6">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <img
            src="/images/rewa-logo-color.png"
            alt="ReWa Logo"
            className="h-16 w-auto"
          />
        </div>

        <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
          Welcome to the ReWa Project Status Dashboard
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Your central hub for tracking project progress, managing milestones,
          and sharing updates with stakeholders.
        </p>
      </div>

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
    </div>
  );
};

export default WelcomePage;
