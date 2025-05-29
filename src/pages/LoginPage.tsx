import AuthForm from "@/components/auth/AuthForm";
import { Card } from "@/components/ui/card";

const LoginPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-transparent to-indigo-900/20"></div>
      <div className="absolute top-0 left-0 w-full h-full">
        <div className="absolute top-10 left-10 w-72 h-72 bg-blue-400/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-indigo-400/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-purple-400/5 rounded-full blur-3xl"></div>
      </div>

      {/* Main content */}
      <div className="relative z-10 w-full max-w-md">
        {/* Logo/Brand section */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-3 drop-shadow-lg tracking-wide">
            ReWa Project Status Sheet Repository
          </h1>
          <p className="text-blue-100 text-2xl font-semibold drop-shadow-md">
            For Standardized Project Reporting
          </p>
        </div>

        {/* Login card */}
        <Card className="bg-white/95 backdrop-blur-xl border-0 shadow-2xl shadow-black/20 p-8">
          <div className="text-center space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Sign in to your account
              </h2>
              <p className="text-gray-600">
                Welcome back! Please sign in to continue managing your projects.
              </p>
            </div>
            <AuthForm />
          </div>
        </Card>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-blue-100/60 text-sm">
            © 2024 ReWa. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
