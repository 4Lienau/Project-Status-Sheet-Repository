import { Card } from "@/components/ui/card";
import { Toaster } from "@/components/ui/toaster";
import AuthForm from "../auth/AuthForm";
import Layout from "../layout/Layout";

const LandingPage = () => {
  return (
    <Layout>
      <div className="container mx-auto flex-1 flex flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 space-y-8 relative overflow-hidden">
          {/* Subtle background logo watermark */}
          <div className="absolute top-4 right-4 opacity-5">
            <img
              src="/images/rewa-logo-color.png"
              alt="ReWa Logo"
              className="h-32 w-auto"
            />
          </div>

          <div className="text-center space-y-6 relative z-10">
            {/* Logo at top of card */}
            <div className="flex justify-center mb-4">
              <img
                src="/images/rewa-logo-color.png"
                alt="ReWa Logo"
                className="h-16 w-auto"
              />
            </div>

            <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              ReWa Project Status Sheet Repository
            </h1>
            <p className="text-lg text-muted-foreground">
              Welcome! Sign in to manage your project status sheets and track
              progress efficiently.
            </p>
          </div>
          <AuthForm />
        </Card>
        <Toaster />
      </div>
    </Layout>
  );
};

export default LandingPage;
