import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import chapterLogo from "@/assets/chapter-logo.jpg";
import { useToast } from "@/hooks/use-toast";

type AuthMode = "signin" | "signup" | "forgot";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [eaaNumber, setEaaNumber] = useState("");
  const [mode, setMode] = useState<AuthMode>("signin");
  const [rosterError, setRosterError] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast({ title: "Check your email", description: "We sent you a password reset link." });
      } else if (mode === "signup") {
        const { data: matchFound, error: rpcError } = await supabase.rpc("check_email_and_eaa_in_roster", {
          _email: email,
          _eaa_number: eaaNumber,
        });
        if (rpcError) throw rpcError;

        if (!matchFound) {
          setLoading(false);
          setRosterError(true);
          return;
        }

        setRosterError(false);
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        toast({ title: "Account created!", description: "You can now sign in with your credentials." });
        setMode("signin");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate("/home");
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const title = mode === "forgot" ? "Reset password" : mode === "signup" ? "Create an account" : "Sign in to continue";
  const buttonLabel = mode === "forgot" ? "Send Reset Link" : mode === "signup" ? "Sign Up" : "Sign In";

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <img src={chapterLogo} alt="EAA Chapter 84 logo" className="h-16 w-16 rounded-full" />
          </div>
          <CardTitle className="text-2xl">Chapter 84 Connect</CardTitle>
          <CardDescription>{title}</CardDescription>
          {mode === "signup" && (
            <p className="text-sm text-muted-foreground mt-3 text-left leading-relaxed">
              Chapter 84 Connect is the services portal for our chapter. To sign up, use the email address you have registered with the chapter and your EAA Membership number. If you don't remember which email you used, or if you did not provide one, please contact{" "}
              <a href="mailto:membership@eaa84.org" className="text-primary underline hover:text-primary/80">membership@eaa84.org</a>{" "}
              for assistance. If you are not yet a chapter member, please use the{" "}
              <a href="/join" className="text-primary underline hover:text-primary/80">New Member Application</a>{" "}
              to join.
            </p>
          )}
          {mode === "forgot" && (
            <p className="text-sm text-muted-foreground mt-3 text-left leading-relaxed">
              Enter your email address and we'll send you a link to reset your password.
            </p>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            {mode === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="eaa-number">EAA Membership Number</Label>
                <Input id="eaa-number" type="text" placeholder="123456" value={eaaNumber} onChange={(e) => setEaaNumber(e.target.value)} required />
              </div>
            )}
            {mode !== "forgot" && (
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
              </div>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Loading..." : buttonLabel}
            </Button>
          </form>
          {rosterError && mode === "signup" && (
            <div className="mt-4 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              <p>
                The email and EAA membership number you entered do not match our records. Please verify your information and try again. If you believe this is an error, please contact{" "}
                <a href="mailto:membership@eaa84.org" className="underline font-medium hover:text-destructive/80">membership@eaa84.org</a>{" "}
                for assistance.
              </p>
              <p className="mt-2">
                If you are not yet a member and would like to join the chapter, please complete the{" "}
                <a href="/join" className="underline font-medium hover:text-destructive/80">New Member Application</a>.
              </p>
            </div>
          )}
          <div className="mt-4 text-center text-sm text-muted-foreground space-y-1">
            {mode === "signin" && (
              <>
                <button type="button" className="block w-full underline hover:text-foreground min-h-0 min-w-0" onClick={() => setMode("forgot")}>
                  Forgot your password?
                </button>
                <button type="button" className="block w-full underline hover:text-foreground min-h-0 min-w-0" onClick={() => setMode("signup")}>
                  Need an account? Sign up
                </button>
              </>
            )}
            {mode === "signup" && (
              <button type="button" className="underline hover:text-foreground min-h-0 min-w-0" onClick={() => setMode("signin")}>
                Already have an account? Sign in
              </button>
            )}
            {mode === "forgot" && (
              <button type="button" className="underline hover:text-foreground min-h-0 min-w-0" onClick={() => setMode("signin")}>
                Back to sign in
              </button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
