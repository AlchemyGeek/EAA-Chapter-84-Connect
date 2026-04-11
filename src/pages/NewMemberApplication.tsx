import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { ExternalLink, CheckCircle2 } from "lucide-react";
import chapterLogo from "@/assets/chapter-logo.jpg";

interface ChapterFee {
  id: string;
  name: string;
  amount: number;
  payment_url: string | null;
  sort_order: number;
}

function getCurrentQuarterLabel(): string {
  const month = new Date().getMonth(); // 0-indexed
  if (month < 3) return "Q1";
  if (month < 6) return "Q2";
  if (month < 9) return "Q3";
  return "Q4";
}

function getQuarterDisplayName(q: string): string {
  switch (q) {
    case "Q1": return "January – March";
    case "Q2": return "April – June";
    case "Q3": return "July – September";
    case "Q4": return "October – December";
    default: return q;
  }
}

export default function NewMemberApplication() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [eaaNumber, setEaaNumber] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const currentQuarter = useMemo(() => getCurrentQuarterLabel(), []);

  const { data: fees = [] } = useQuery({
    queryKey: ["chapter-fees-public"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chapter_fees" as any)
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return (data as any[]) as ChapterFee[];
    },
  });

  const currentFee = useMemo(() => {
    return fees.find((f) => f.name.toUpperCase().includes(currentQuarter));
  }, [fees, currentQuarter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const { error } = await supabase.from("new_member_applications" as any).insert({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        eaa_number: eaaNumber.trim(),
        email: email.trim(),
        address: address.trim(),
        city: city.trim(),
        state: state.trim(),
        zip_code: zipCode.trim(),
        quarter_applied: currentQuarter,
        fee_amount: currentFee?.amount ?? 0,
      } as any);

      if (error) throw error;

      setSubmitted(true);
      toast({ title: "Application submitted successfully!" });

      // Notify Membership Coordinator(s) — fire-and-forget
      supabase.functions.invoke("new-member-notify", {
        body: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          eaa_number: eaaNumber.trim(),
          email: email.trim(),
          city: city.trim(),
          state: state.trim(),
        },
      }).catch((err) => console.error("Notification failed:", err));
    } catch (err: any) {
      toast({
        title: "Error submitting application",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card className="max-w-lg w-full text-center">
          <CardContent className="py-12 space-y-4">
            <CheckCircle2 className="h-16 w-16 text-[hsl(var(--success))] mx-auto" />
            <h2 className="text-2xl font-bold text-foreground">Application Submitted!</h2>
            <p className="text-muted-foreground">
              Thank you for your interest in joining EAA Chapter 84. We'll review your application shortly.
            </p>
            {currentFee && (
              <div className="pt-4 space-y-3">
                <p className="text-sm font-medium text-foreground">
                  Next: Complete your dues payment of{" "}
                  <span className="font-bold">${Number(currentFee.amount).toFixed(2)}</span>
                </p>
                {currentFee.payment_url && (
                  <Button asChild>
                    <a href={currentFee.payment_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Pay Dues Online
                    </a>
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-10 space-y-8">
        {/* Branding Header */}
        <div className="flex items-center gap-4">
          <img
            src={chapterLogo}
            alt="EAA Chapter 84"
            className="h-14 w-14 rounded-full ring-2 ring-border"
          />
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
              EAA Chapter 84
            </h1>
            <p className="text-sm text-muted-foreground">Join as a New Member</p>
          </div>
        </div>

        {/* Intro text */}
        <p className="text-muted-foreground leading-relaxed">
          Become part of our vibrant community of aviation enthusiasts, builders, and pilots.
        </p>

        {/* Step 1 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-foreground">
              Step 1: Submit Your Membership Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-sm text-muted-foreground leading-relaxed">
              All Chapter 84 members are required to hold an active membership with the national
              Experimental Aircraft Association (EAA). Please provide your EAA membership number
              when completing the new member application form.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first-name">First Name</Label>
                  <Input
                    id="first-name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    maxLength={100}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last-name">Last Name</Label>
                  <Input
                    id="last-name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    maxLength={100}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="eaa-number">EAA Membership Number</Label>
                <Input
                  id="eaa-number"
                  value={eaaNumber}
                  onChange={(e) => setEaaNumber(e.target.value)}
                  maxLength={20}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  maxLength={255}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  maxLength={200}
                  required
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    maxLength={100}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    maxLength={2}
                    required
                  />
                </div>
                <div className="space-y-2 col-span-2 sm:col-span-1">
                  <Label htmlFor="zip">Zip Code</Label>
                  <Input
                    id="zip"
                    value={zipCode}
                    onChange={(e) => setZipCode(e.target.value)}
                    maxLength={10}
                    required
                  />
                </div>
              </div>

              <div className="pt-2">
                <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
                  {submitting ? "Submitting..." : "Submit Application"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Step 2 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-foreground">
              Step 2: Pay Your Chapter Dues
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Dues for New Members are pro-rated by quarter. If you are joining EAA Chapter 84 for
              the first time, your annual membership fee is pro-rated based on the quarter you join.
              Dues are reset each January, and renewals are $20 annually regardless of when you
              joined.
            </p>

            {currentFee ? (
              <div className="rounded-lg border border-border bg-muted/40 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Current Quarter: {currentQuarter} ({getQuarterDisplayName(currentQuarter)})
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Pro-rated new member dues
                    </p>
                  </div>
                  <span className="text-2xl font-bold text-foreground tabular-nums">
                    ${Number(currentFee.amount).toFixed(2)}
                  </span>
                </div>
                {currentFee.payment_url && (
                  <Button asChild variant="default" className="w-full sm:w-auto">
                    <a href={currentFee.payment_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Pay with Square
                    </a>
                  </Button>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                Fee information is not yet available. Please contact the chapter for details.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
