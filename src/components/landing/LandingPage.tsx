import { Card } from "@/components/ui/card";
import { Toaster } from "@/components/ui/toaster";
import AuthForm from "../auth/AuthForm";
import Layout from "../layout/Layout";

const LandingPage = () => {
  return (
    <Layout>
      <div className="container mx-auto flex-1 flex flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 space-y-8">
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold tracking-tight">
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
