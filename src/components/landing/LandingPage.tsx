import { Card } from "@/components/ui/card";
import { Toaster } from "@/components/ui/toaster";
import AuthForm from "../auth/AuthForm";

const LandingPage = () => {
  return (
    <Layout>
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full space-y-8 text-center mb-8">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900">
            Project Status Dashboard
          </h1>
          <p className="text-lg text-gray-600">
            Welcome! Sign in to manage your project status sheets and track
            progress efficiently.
          </p>
        </div>
        <AuthForm />
        <Toaster />
      </div>
    </Layout>
  );
};

export default LandingPage;
