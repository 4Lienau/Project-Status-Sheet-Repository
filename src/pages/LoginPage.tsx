import AuthForm from "@/components/auth/AuthForm";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

const LoginPage = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <Card className="bg-card border-border shadow-lg">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-4">
              <img
                src="/images/rewa-logo-color.png"
                alt="ReWa Logo"
                className="h-16 w-auto"
              />
            </div>
            <CardTitle className="text-2xl font-bold text-foreground">
              Welcome Back
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Sign in to your account to continue
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AuthForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;