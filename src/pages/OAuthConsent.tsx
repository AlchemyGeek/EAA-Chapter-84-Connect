import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ShieldCheck, ShieldX } from "lucide-react";

interface AuthorizationDetails {
  client?: {
    name?: string;
    website?: string;
  } | null;
  redirect_url?: string;
  redirect_to?: string;
}

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<AuthorizationDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) {
        setError("Missing authorization request.");
        return;
      }
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = "/auth?next=" + encodeURIComponent(next);
        return;
      }
      const oauth = supabase.auth.oauth as any;
      if (!oauth?.getAuthorizationDetails) {
        setError("OAuth consent is not available in this client.");
        return;
      }
      const { data, error } = await oauth.getAuthorizationDetails(authorizationId);
      if (!active) return;
      if (error) {
        setError(error.message);
        return;
      }
      const immediate = data?.redirect_url ?? data?.redirect_to;
      if (immediate && !data?.client) {
        window.location.href = immediate;
        return;
      }
      setDetails(data);
    })();
    return () => { active = false; };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    setBusy(true);
    const oauth = supabase.auth.oauth as any;
    if (!oauth?.approveAuthorization || !oauth?.denyAuthorization) {
      setError("OAuth consent actions are not available.");
      setBusy(false);
      return;
    }
    const { data, error } = approve
      ? await oauth.approveAuthorization(authorizationId)
      : await oauth.denyAuthorization(authorizationId);
    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("No redirect returned by the authorization server.");
      return;
    }
    window.location.href = target;
  }

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <Card className="w-full max-w-md border-[0.5px] border-border rounded-xl">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <ShieldX className="w-5 h-5 text-destructive" />
              Authorization request failed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (!details) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <Card className="w-full max-w-md border-[0.5px] border-border rounded-xl">
          <CardContent className="py-12 flex flex-col items-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading authorization request…</p>
          </CardContent>
        </Card>
      </main>
    );
  }

  const clientName = details.client?.name ?? "An external app";

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-background">
      <Card className="w-full max-w-md border-[0.5px] border-border rounded-xl">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <ShieldCheck className="w-5 h-5 text-primary" />
            Connect {clientName}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-sm text-foreground">
            <strong className="font-medium">{clientName}</strong> wants to access your EAA Chapter 84 Connect account as you.
          </p>
          <p className="text-sm text-muted-foreground">
            This lets the connected agent or app read your profile, directory, classifieds, Hangar Talk, volunteering opportunities, and Briefing Room news according to your membership permissions.
          </p>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              className="flex-1 rounded-lg border-[0.5px]"
              disabled={busy}
              onClick={() => decide(false)}
            >
              Deny
            </Button>
            <Button
              className="flex-1 rounded-lg"
              disabled={busy}
              onClick={() => decide(true)}
            >
              {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Approve
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
