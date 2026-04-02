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
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<AuthStep>("email");
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
    setOtp("");
    setStep("email");
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
          {step === "email" && (
            <p className="text-sm text-muted-foreground mt-3 text-left leading-relaxed">
              Please use the email address you have on file with the chapter. If you're not sure which email you used, contact{" "}
              <a href="mailto:membership@eaa84.org" className="text-primary underline hover:text-primary/80">membership@eaa84.org</a>.
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
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
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
              {loading ? "Loading..." : step === "otp" ? "Verify Code" : "Send Code"}
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
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
