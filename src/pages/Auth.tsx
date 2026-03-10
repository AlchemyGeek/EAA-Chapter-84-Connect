import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import chapterLogo from "@/assets/chapter-logo.jpg";
import { useToast } from "@/hooks/use-toast";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [rosterError, setRosterError] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        // Check email against roster first
        const { data: emailExists, error: rpcError } = await supabase.rpc("check_email_in_roster", { _email: email });
        if (rpcError) throw rpcError;

        if (!emailExists) {
          setLoading(false);
          setRosterError(true);
          return;
        }

        setRosterError(false);
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        toast({ title: "Check your email", description: "We sent you a confirmation link." });
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

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <img src={chapterLogo} alt="EAA Chapter 84 logo" className="h-16 w-16 rounded-full" />
          </div>
          <CardTitle className="text-2xl">Chapter 84 Connect</CardTitle>
          <CardDescription>{isSignUp ? "Create an account" : "Sign in to continue"}</CardDescription>
          {isSignUp && (
            <p className="text-sm text-muted-foreground mt-3 text-left leading-relaxed">
              Chapter 84 Connect is the services portal for our chapter. To sign up, use the email address you have registered with the chapter. If you don't remember which email you used, or if you did not provide one, please contact{" "}
              <a href="mailto:membership@eaa84.org" className="text-primary underline hover:text-primary/80">membership@eaa84.org</a>{" "}
              for assistance. If you are not yet a chapter member, please use the{" "}
              <a href="/join" className="text-primary underline hover:text-primary/80">New Member Application</a>{" "}
              to join.
            </p>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Loading..." : isSignUp ? "Sign Up" : "Sign In"}
            </Button>
          </form>
          {rosterError && isSignUp && (
            <div className="mt-4 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              <p>
                We could not find your email in our member roster. If you believe this is an error, please contact{" "}
                <a href="mailto:membership@eaa84.org" className="underline font-medium hover:text-destructive/80">membership@eaa84.org</a>{" "}
                and we will be happy to help.
              </p>
              <p className="mt-2">
                If you are not yet a member and would like to join the chapter, please complete the{" "}
                <a href="/join" className="underline font-medium hover:text-destructive/80">New Member Application</a>.
              </p>
            </div>
          )}
          <div className="mt-4 text-center text-sm text-muted-foreground">
            <button type="button" className="underline hover:text-foreground min-h-0 min-w-0" onClick={() => setIsSignUp(!isSignUp)}>
              {isSignUp ? "Already have an account? Sign in" : "Need an account? Sign up"}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
