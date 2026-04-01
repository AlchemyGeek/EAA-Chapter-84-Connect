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

type AuthStep = "email" | "otp";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [eaaNumber, setEaaNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<AuthStep>("email");
  const [needsEaa, setNeedsEaa] = useState(false);
  const [rosterError, setRosterError] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const sendOtp = async () => {
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) throw error;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (step === "email") {
        // Check if user already exists by trying to see if email is in roster
        // For first-time users, we need EAA number verification
        if (!needsEaa) {
          // First attempt: try sending OTP directly
          // If user exists in auth, this works. If not, Supabase auto-creates.
          // But we need roster verification for new users.
          // Check if email exists in roster first
          const { data: inRoster } = await supabase.rpc("check_email_in_roster", { _email: email });
          
          if (!inRoster) {
            setLoading(false);
            setRosterError(true);
            return;
          }

          setRosterError(false);

          // Check if this is a first-time user by requiring EAA number
          // We'll ask for EAA number to verify identity
          setNeedsEaa(true);
          setLoading(false);
          return;
        }

        // Verify email + EAA number match
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
        toast({ title: "Code sent!", description: "Check your email for a 6-digit code." });
        setStep("otp");
      } else {
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
      toast({ title: "Code resent!", description: "Check your email for a new 6-digit code." });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (step === "otp") {
      setOtp("");
      setStep("email");
    } else if (needsEaa) {
      setNeedsEaa(false);
      setEaaNumber("");
      setRosterError(false);
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
          <CardDescription>
            {step === "otp" ? "Enter your code" : "Sign in to continue"}
          </CardDescription>
          {step === "email" && !needsEaa && (
            <p className="text-sm text-muted-foreground mt-3 text-left leading-relaxed">
              Please use the email address you use for chapter communications. If you are not certain which email you use, please contact{" "}
              <a href="mailto:membership@eaa84.org" className="text-primary underline hover:text-primary/80">membership@eaa84.org</a>.
            </p>
          )}
          {step === "email" && needsEaa && (
            <p className="text-sm text-muted-foreground mt-3 text-left leading-relaxed">
              To verify your identity, please enter your EAA Membership Number.
            </p>
          )}
          {step === "otp" && (
            <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
              We sent a 6-digit code to <span className="font-medium text-foreground">{email}</span>. Enter it below to continue.
            </p>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {step === "email" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setRosterError(false); }}
                    required
                    disabled={needsEaa}
                  />
                </div>
                {needsEaa && (
                  <div className="space-y-2">
                    <Label htmlFor="eaa-number">EAA Membership Number</Label>
                    <Input
                      id="eaa-number"
                      type="text"
                      placeholder="123456"
                      value={eaaNumber}
                      onChange={(e) => { setEaaNumber(e.target.value); setRosterError(false); }}
                      required
                    />
                  </div>
                )}
              </>
            )}
            {step === "otp" && (
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
            <Button type="submit" className="w-full" disabled={loading || (step === "otp" && otp.length < 6)}>
              {loading ? "Loading..." : step === "otp" ? "Verify Code" : needsEaa ? "Send Code" : "Continue"}
            </Button>
          </form>
          {step === "otp" && (
            <div className="mt-4 flex justify-between text-sm">
              <button type="button" className="text-muted-foreground underline hover:text-foreground" onClick={handleBack}>
                Back
              </button>
              <button type="button" className="text-muted-foreground underline hover:text-foreground" onClick={handleResend} disabled={loading}>
                Resend code
              </button>
            </div>
          )}
          {needsEaa && step === "email" && (
            <div className="mt-4 text-center">
              <button type="button" className="text-sm text-muted-foreground underline hover:text-foreground" onClick={handleBack}>
                Use a different email
              </button>
            </div>
          )}
          {rosterError && (
            <div className="mt-4 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              <p>
                {needsEaa
                  ? "The email and EAA membership number you entered do not match our records. Please verify your information and try again."
                  : "This email address was not found in our chapter records."
                }
                {" "}If you believe this is an error, please contact{" "}
                <a href="mailto:membership@eaa84.org" className="underline font-medium hover:text-destructive/80">membership@eaa84.org</a>.
              </p>
              <p className="mt-2">
                If you are not yet a member and would like to join the chapter, please complete the{" "}
                <a href="/join" className="underline font-medium hover:text-destructive/80">New Member Application</a>.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
