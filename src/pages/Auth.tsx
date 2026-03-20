import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import chapterLogo from "@/assets/chapter-logo.jpg";
import { useToast } from "@/hooks/use-toast";

type AuthMode = "signin" | "signin-otp" | "signup" | "signup-otp";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [eaaNumber, setEaaNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [mode, setMode] = useState<AuthMode>("signin");
  const [rosterError, setRosterError] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const isOtpStep = mode === "signin-otp" || mode === "signup-otp";

  const sendOtp = async () => {
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) throw error;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === "signin") {
        await sendOtp();
        toast({ title: "Code sent!", description: "Check your email for an 8-digit code." });
        setMode("signin-otp");
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
        await sendOtp();
        toast({ title: "Code sent!", description: "Check your email for an 8-digit code." });
        setMode("signup-otp");
      } else if (isOtpStep) {
        const { error } = await supabase.auth.verifyOtp({
          email,
          token: otp,
          type: "email",
        });
        if (error) throw error;
        navigate("/home");
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setLoading(true);
    try {
      await sendOtp();
      toast({ title: "Code resent!", description: "Check your email for a new 8-digit code." });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setOtp("");
    if (mode === "signin-otp") setMode("signin");
    if (mode === "signup-otp") setMode("signup");
  };

  const title = isOtpStep
    ? "Enter your code"
    : mode === "signup"
      ? "Create an account"
      : "Sign in to continue";

  const buttonLabel = isOtpStep ? "Verify Code" : "Send Code";

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
          {isOtpStep && (
            <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
              We sent a 6-digit code to <span className="font-medium text-foreground">{email}</span>. Enter it below to continue.
            </p>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isOtpStep && (
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
            )}
            {mode === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="eaa-number">EAA Membership Number</Label>
                <Input id="eaa-number" type="text" placeholder="123456" value={eaaNumber} onChange={(e) => setEaaNumber(e.target.value)} required />
              </div>
            )}
            {isOtpStep && (
              <div className="flex flex-col items-center space-y-2">
                <Label>Verification code</Label>
                <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
            )}
            <Button type="submit" className="w-full" disabled={loading || (isOtpStep && otp.length < 6)}>
              {loading ? "Loading..." : buttonLabel}
            </Button>
          </form>
          {isOtpStep && (
            <div className="mt-4 flex justify-between text-sm">
              <button type="button" className="text-muted-foreground underline hover:text-foreground" onClick={handleBack}>
                Back
              </button>
              <button type="button" className="text-muted-foreground underline hover:text-foreground" onClick={handleResend} disabled={loading}>
                Resend code
              </button>
            </div>
          )}
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
          {!isOtpStep && (
            <div className="mt-4 text-center text-sm text-muted-foreground">
              {mode === "signin" && (
                <button type="button" className="underline hover:text-foreground" onClick={() => setMode("signup")}>
                  Need an account? Sign up
                </button>
              )}
              {mode === "signup" && (
                <button type="button" className="underline hover:text-foreground" onClick={() => setMode("signin")}>
                  Already have an account? Sign in
                </button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
