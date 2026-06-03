import { useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, Copy, Send, Users } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type AudienceKey =
  | "active_all"
  | "active_good"
  | "active_overdue"
  | "inactive"
  | "active_good_unsigned_proxy_2026";

const AUDIENCES: { value: AudienceKey; label: string; description: string }[] = [
  {
    value: "active_all",
    label: "All active members",
    description: "Every member whose roster standing is Active, regardless of dues status.",
  },
  {
    value: "active_good",
    label: "Active members in good standing",
    description: "Active members whose chapter dues are current (expiration date is today or later).",
  },
  {
    value: "active_overdue",
    label: "Active members not in good standing",
    description: "Active members whose chapter dues have expired.",
  },
  {
    value: "inactive",
    label: "Inactive members",
    description: "Members whose roster standing is anything other than Active.",
  },
  {
    value: "active_good_unsigned_proxy_2026",
    label: "Active + in good standing, proxy NOT signed (June 9, 2026)",
    description:
      "Active members in good standing whose latest 2026 Bylaws proxy action is not 'signed'.",
  },
];

const MAILTO_MAX = 1800;

export default function EmailListBuilder() {
  const { user, loading: authLoading, isOfficerOrAbove } = useAuth();
  const [audience, setAudience] = useState<AudienceKey>("active_all");
  const [separator, setSeparator] = useState<"comma" | "semicolon">("comma");

  const { data: emails = [], isLoading } = useQuery({
    queryKey: ["email-audience", audience],
    enabled: !!user && isOfficerOrAbove,
    staleTime: 0,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("officer_email_audience", {
        _audience: audience,
      });
      if (error) throw error;
      return (data ?? []).map((r: { email: string }) => r.email).filter(Boolean);
    },
  });

  const joined = useMemo(() => {
    const sep = separator === "comma" ? ", " : "; ";
    return emails.join(sep);
  }, [emails, separator]);

  const mailtoHref = useMemo(() => {
    // mailto BCC: use commas per RFC 6068 (most clients also accept semicolons but commas are spec)
    return `mailto:?bcc=${encodeURIComponent(emails.join(","))}`;
  }, [emails]);

  const mailtoTooLong = mailtoHref.length > MAILTO_MAX;

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  }
  if (!user) return <Navigate to="/auth" replace />;
  if (!isOfficerOrAbove) return <Navigate to="/home" replace />;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(joined);
      toast({ title: "Copied", description: `${emails.length} email address${emails.length === 1 ? "" : "es"} copied.` });
    } catch {
      toast({ title: "Copy failed", description: "Select the text and copy manually.", variant: "destructive" });
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <Mail className="h-6 w-6 text-accent" />
        <div>
          <h1 className="text-2xl font-semibold">Email List Builder</h1>
          <p className="text-sm text-muted-foreground">
            Generate a list of member email addresses to copy or BCC from your mail client.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Choose an audience</CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={audience}
            onValueChange={(v) => setAudience(v as AudienceKey)}
            className="space-y-1"
          >
            {AUDIENCES.map((a) => (
              <label
                key={a.value}
                htmlFor={`aud-${a.value}`}
                className="flex items-start gap-2.5 rounded px-2 py-1.5 cursor-pointer hover:bg-muted/40"
              >
                <RadioGroupItem id={`aud-${a.value}`} value={a.value} className="mt-1 h-3.5 w-3.5" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium leading-tight">{a.label}</div>
                  <div className="text-xs text-muted-foreground leading-snug">{a.description}</div>
                </div>
              </label>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            {isLoading ? "Loading…" : `${emails.length} recipient${emails.length === 1 ? "" : "s"}`}
          </CardTitle>
          <Tabs value={separator} onValueChange={(v) => setSeparator(v as "comma" | "semicolon")}>
            <TabsList>
              <TabsTrigger value="comma">Comma</TabsTrigger>
              <TabsTrigger value="semicolon">Semicolon (Outlook)</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="email-list" className="text-xs text-muted-foreground">
              Email addresses
            </Label>
            <Textarea
              id="email-list"
              value={joined}
              readOnly
              rows={10}
              className="font-mono text-xs"
              placeholder={isLoading ? "Loading…" : "No matching members."}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={handleCopy}
              disabled={emails.length === 0}
              className="min-h-[44px]"
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy {separator === "comma" ? "comma" : "semicolon"} list
            </Button>
            <Button
              asChild={!mailtoTooLong}
              variant="outline"
              disabled={emails.length === 0 || mailtoTooLong}
              className="min-h-[44px]"
              title={mailtoTooLong ? "List too long for mailto — use Copy instead." : undefined}
            >
              {mailtoTooLong ? (
                <span>
                  <Send className="h-4 w-4 mr-2" />
                  Open in mail client (BCC)
                </span>
              ) : (
                <a href={mailtoHref}>
                  <Send className="h-4 w-4 mr-2" />
                  Open in mail client (BCC)
                </a>
              )}
            </Button>
            {mailtoTooLong && (
              <p className="text-xs text-muted-foreground self-center">
                List too long for mailto — use Copy instead.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
