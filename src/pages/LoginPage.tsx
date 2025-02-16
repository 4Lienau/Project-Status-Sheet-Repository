import Layout from "@/components/layout/Layout";
import AuthForm from "@/components/auth/AuthForm";
import { Card } from "@/components/ui/card";

const LoginPage = () => {
  return (
    <Layout>
      <div className="container mx-auto flex-1 flex flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 space-y-8">
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold tracking-tight">
              Sign in to your account
            </h1>
            <p className="text-lg text-muted-foreground">
              Welcome back! Please sign in to continue managing your projects.
            </p>
          </div>
          <AuthForm />
        </Card>
      </div>
    </Layout>
  );
};

export default LoginPage;
