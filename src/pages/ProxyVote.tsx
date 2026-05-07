import { useMemo } from "react";
import { Navigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import chapterLogo from "@/assets/chapter-logo.jpg";

const PROXY_DEADLINE = new Date("2026-06-10T00:00:00");

function fmtDateTime(iso: string) {
  const d = new Date(iso);
  const date = `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}/${d.getFullYear()}`;
  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${date} at ${String(h).padStart(2, "0")}:${m} ${ampm}`;
}

export default function ProxyVote() {
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  const isWindowOpen = new Date() < PROXY_DEADLINE;

  const { data: member, isLoading: memberLoading } = useQuery({
    queryKey: ["my-member-proxy", user?.email],
    enabled: !!user?.email,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("roster_members")
        .select("key_id, first_name, last_name, nickname, current_standing, expiration_date, email")
        .ilike("email", user!.email!.trim())
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: votes, isLoading: votesLoading } = useQuery({
    queryKey: ["my-proxy-votes", member?.key_id],
    enabled: !!member?.key_id,
    staleTime: 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("proxy_votes_2026")
        .select("action, created_at")
        .eq("key_id", member!.key_id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const memberName = useMemo(() => {
    if (!member) return "";
    return `${member.first_name ?? ""} ${member.last_name ?? ""}`.trim();
  }, [member]);

  const latest = votes?.[0];
  const isSigned = latest?.action === "signed";

  const signMutation = useMutation({
    mutationFn: async (action: "signed" | "revoked") => {
      const { error } = await supabase.from("proxy_votes_2026").insert({
        key_id: member!.key_id,
        member_name: memberName,
        action,
      });
      if (error) throw error;
    },
    onSuccess: (_, action) => {
      queryClient.invalidateQueries({ queryKey: ["my-proxy-votes", member?.key_id] });
      toast({
        title: action === "signed" ? "Proxy signed" : "Proxy revoked",
        description: action === "signed" ? "Your proxy vote has been recorded." : "Your proxy vote has been revoked.",
      });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  if (authLoading || memberLoading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  }
  if (!user) return <Navigate to="/auth" replace />;

  const isActive = member?.current_standing === "Active";
  const duesExpired = !!member?.expiration_date && new Date(member.expiration_date) < new Date();
  const inGoodStanding = isActive && !duesExpired;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link to="/home" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground min-h-[44px]">
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back to Home</span>
          </Link>
          <img src={chapterLogo} alt="EAA Chapter 84" className="h-8 w-8 ml-auto rounded" />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        {!isActive ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              This form is available to active EAA Chapter 84 members only.
            </CardContent>
          </Card>
        ) : !inGoodStanding ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground space-y-2">
              <p className="font-medium text-foreground">Your 2026 chapter dues must be paid to participate in the Bylaws Vote.</p>
              <p>Please renew your chapter dues, then return here to sign the proxy form.</p>
            </CardContent>
          </Card>
        ) : !isWindowOpen ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              The proxy voting period has closed. Thank you to all members who participated.
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="bg-white mb-6">
              <CardContent className="p-6 sm:p-8 space-y-4">
                <p className="text-sm leading-relaxed">
                  EAA Chapter 84 will hold a vote at the regular Tuesday, June 9 meeting to approve updates to our Bylaws. The Board asks that all members please review the proposed changes in advance.
                </p>
                <p className="text-sm leading-relaxed">
                  These updates primarily incorporate EAA National&apos;s 2025 revisions to the pro-forma Bylaws provided to chapters, along with additional changes reflecting how our chapter has evolved since the Bylaws were last updated in 2017.
                </p>
                <p className="text-sm leading-relaxed">
                  If you are unable to attend in person, please use the proxy form below to authorize your vote.
                </p>
                <div>
                  <p className="text-sm font-medium mb-2">Review the proposed changes before signing:</p>
                  <ul className="space-y-2">
                    <li>
                      <a
                        href="https://us.list-manage.com/10I2z9StXxZ?e=4a3df9b63a&c2id=60b576756fc8e9f077a31a3a4b5f6874"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline min-h-[44px] inline-flex items-center"
                      >
                        EAA Chapter 84 Bylaws (2026 Rev C)
                      </a>
                    </li>
                    <li>
                      <a
                        href="https://us.list-manage.com/TkSq78Fah1n?e=4a3df9b63a&c2id=60b576756fc8e9f077a31a3a4b5f6874"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline min-h-[44px] inline-flex items-center"
                      >
                        EAA Chapter 84 Bylaws (2026 Rev C) — Change Log
                      </a>
                    </li>
                    <li>
                      <a
                        href="https://us.list-manage.com/12skuCcnBWJ?e=4a3df9b63a&c2id=60b576756fc8e9f077a31a3a4b5f6874"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline min-h-[44px] inline-flex items-center"
                      >
                        2025 Bylaws Revision Matrix — Final Review
                      </a>
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white">
              <CardContent className="p-6 sm:p-10 space-y-6">
                <h1 className="text-center text-lg sm:text-xl font-bold tracking-wide uppercase">
                  EAA Chapter 84 Voting Proxy Form
                </h1>
                <p className="text-center text-xs text-muted-foreground -mt-4">(Washington Nonprofit)</p>

                <div className="space-y-4 text-sm leading-relaxed">
                  <FormRow prefix="I," value={memberName} suffix="(Member Name)" />
                  <FormRow prefix="appoint" value="Michael Zyskowski" suffix="(Proxy Name)" />
                  <FormRow label="Organization" value="EAA Chapter 84" />
                  <FormRow label="Meeting Date" value="06/09/2026" />
                </div>

                <div className="border-t border-b py-4 italic text-sm space-y-2">
                  <p><strong className="not-italic">Limited Proxy</strong> — My proxy may vote only as follows: To vote on changing of the EAA Chapter 84 Bylaws.</p>
                  <p>This proxy is valid for this meeting and any adjournment unless revoked by me.</p>
                </div>

                <div className="space-y-4 text-sm">
                  <div>
                    <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Member Signature</div>
                    <div className="border-b border-foreground/40 pb-1 min-h-[3rem] flex items-end">
                      <span
                        className="text-3xl"
                        style={{ fontFamily: "'Dancing Script', 'Caveat', cursive" }}
                      >
                        {isSigned ? memberName : ""}
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Date</div>
                    <div className="border-b border-foreground/40 pb-1 min-h-[2rem] flex items-end">
                      <span style={{ fontFamily: "'JetBrains Mono', 'Courier New', ui-monospace, monospace" }}>
                        {isSigned && latest ? new Date(latest.created_at).toLocaleDateString("en-US") : ""}
                      </span>
                    </div>
                  </div>
                </div>

                {votesLoading ? null : isSigned ? (
                  <>
                    <div className="rounded-md border border-green-300 bg-green-50 dark:bg-green-950/30 p-4 flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-700 shrink-0 mt-0.5" />
                      <p className="text-sm text-green-900 dark:text-green-100">
                        Your proxy vote has been recorded on {fmtDateTime(latest!.created_at)}.
                      </p>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" className="w-full sm:w-auto border-destructive/40 text-destructive hover:bg-destructive/5 min-h-[44px]">
                          Revoke My Proxy Vote
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Revoke proxy vote?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to revoke your proxy vote? This action will be recorded.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => signMutation.mutate("revoked")}>
                            Yes, revoke
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                ) : latest?.action === "revoked" ? (
                  <>
                    <div className="rounded-md border bg-muted p-4 text-sm">
                      Your proxy vote has been revoked as of {fmtDateTime(latest.created_at)}. You may re-sign if the voting period is still open.
                    </div>
                    <Button
                      onClick={() => signMutation.mutate("signed")}
                      disabled={signMutation.isPending}
                      className="w-full sm:w-auto min-h-[44px]"
                    >
                      ✍️ Click Here to Sign Proxy
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={() => signMutation.mutate("signed")}
                    disabled={signMutation.isPending}
                    className="w-full sm:w-auto min-h-[44px]"
                  >
                    ✍️ Click Here to Sign Proxy
                  </Button>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}

function FormRow({ prefix, label, value, suffix }: { prefix?: string; label?: string; value: string; suffix?: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {prefix && <span>{prefix}</span>}
      {label && <span className="font-medium">{label}:</span>}
      <span
        className="inline-block min-w-[12rem] flex-1 rounded bg-muted/60 border px-3 py-1.5"
        style={{ fontFamily: "'JetBrains Mono', 'Courier New', ui-monospace, monospace" }}
      >
        {value}
      </span>
      {suffix && <span className="text-xs text-muted-foreground">{suffix}</span>}
    </div>
  );
}
