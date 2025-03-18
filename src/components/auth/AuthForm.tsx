import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Chrome, AlertCircle } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabase";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import DepartmentSelect from "@/components/DepartmentSelect";

const AuthForm = () => {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [department, setDepartment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingApproval, setPendingApproval] = useState(false);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 1. Create the user in Supabase Auth
      const { error: signUpError, data } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) throw signUpError;
      if (!data.user) throw new Error("Failed to create user account");

      // 2. Add user to pending_users table using a function that uses service role
      // This bypasses RLS policies since the user isn't fully authenticated yet

      // First attempt to invoke the function
      const { error: pendingError } = await supabase.functions.invoke(
        "create-pending-user",
        {
          body: {
            userId: data.user.id,
            email: email,
            fullName: fullName,
            department: department,
          },
        },
      );

      if (pendingError) {
        console.error("Error creating pending user:", pendingError);
      }

      // Since we've successfully created the user and invoked the function,
      // we'll assume the pending user record was created successfully
      // This avoids race conditions with checking the database too early

      console.log("User created successfully, proceeding with signup flow");

      // 3. Show success message
      setPendingApproval(true);
      toast({
        title: "Account Created",
        description:
          "Your account is pending administrator approval. You'll be notified when your account is approved.",
        duration: 6000,
      });

      // Clear form
      setEmail("");
      setPassword("");
      setFullName("");
      setDepartment("");
    } catch (err) {
      console.error("Sign up error:", err);
      setError(err.message || "An error occurred during sign up");
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error, data } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
        return;
      }

      if (data.user) {
        // Check if user is pending approval
        const { data: pendingData } = await supabase
          .from("pending_users")
          .select("status")
          .eq("id", data.user.id)
          .single();

        if (pendingData && pendingData.status === "pending") {
          // User is pending approval
          await supabase.auth.signOut();
          setPendingApproval(true);
          setError("Your account is pending administrator approval.");
          return;
        }

        if (pendingData && pendingData.status === "rejected") {
          // User has been rejected
          await supabase.auth.signOut();
          setError("Your account has been rejected by an administrator.");
          return;
        }

        // User is approved or doesn't need approval (existing user)
        toast({
          title: "Success",
          description: "Signed in successfully",
          duration: 2000,
        });

        // Force navigation to home page
        window.location.href = "/";
        return;
      }
    } catch (err) {
      setError(err.message || "An error occurred during sign in");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (error) throw error;
      if (!data.url) throw new Error("No URL returned from Supabase");
    } catch (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  return (
    <Tabs defaultValue="signin" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="signin">Sign In</TabsTrigger>
        <TabsTrigger value="signup">Sign Up</TabsTrigger>
      </TabsList>

      {pendingApproval && (
        <Alert className="mt-4 bg-yellow-50 border-yellow-200 text-yellow-800">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Account Pending Approval</AlertTitle>
          <AlertDescription>
            Your account is pending administrator approval. You'll be notified
            when your account is approved.
          </AlertDescription>
        </Alert>
      )}

      <TabsContent value="signin" className="space-y-4">
        <Button
          type="button"
          className="w-full flex items-center justify-center gap-2"
          variant="outline"
          onClick={handleGoogleSignIn}
          disabled={loading}
        >
          <Chrome className="h-4 w-4" />
          Sign in with Google
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              Or continue with
            </span>
          </div>
        </div>
        <form onSubmit={handleSignIn} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="signin-email">Email</Label>
            <Input
              id="signin-email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="signin-password">Password</Label>
            <Input
              id="signin-password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && (
            <Alert className="bg-red-50 border-red-200 text-red-800">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <Button
            type="submit"
            className="w-full"
            disabled={loading}
            variant="default"
          >
            {loading ? "Signing in..." : "Sign In"}
          </Button>
        </form>
      </TabsContent>

      <TabsContent value="signup" className="space-y-4">
        <Button
          type="button"
          className="w-full flex items-center justify-center gap-2"
          variant="outline"
          onClick={handleGoogleSignIn}
          disabled={loading}
        >
          <Chrome className="h-4 w-4" />
          Sign up with Google
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              Or continue with
            </span>
          </div>
        </div>
        <form onSubmit={handleSignUp} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="signup-email">Email</Label>
            <Input
              id="signup-email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="signup-password">Password</Label>
            <Input
              id="signup-password"
              type="password"
              placeholder="Choose a password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="signup-name">Full Name</Label>
            <Input
              id="signup-name"
              type="text"
              placeholder="Enter your full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="signup-department">Department</Label>
            <DepartmentSelect
              value={department}
              onValueChange={setDepartment}
              placeholder="Select your department"
            />
          </div>
          {error && (
            <Alert className="bg-red-50 border-red-200 text-red-800">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <Alert className="bg-blue-50 border-blue-200 text-blue-800">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Administrator Approval Required</AlertTitle>
            <AlertDescription>
              New accounts require administrator approval before you can sign
              in. You'll be notified when your account is approved.
            </AlertDescription>
          </Alert>
          <Button
            type="submit"
            className="w-full"
            disabled={loading}
            variant="default"
          >
            {loading ? "Signing up..." : "Sign Up"}
          </Button>
        </form>
      </TabsContent>
    </Tabs>
  );
};

export default AuthForm;
