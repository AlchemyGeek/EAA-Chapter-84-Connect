import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { Navigate, Link, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, HandHelping, Users, CheckCircle2, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useTrackEngagement } from "@/hooks/useTrackEngagement";

const STATUS_COLORS: Record<string, string> = {
  Active: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  Completed: "bg-muted text-muted-foreground",
};

export default function MemberVolunteering() {
  const { user, loading: authLoading, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const viewAsKeyId = searchParams.get("viewAs");
  const [applyingOpportunityId, setApplyingOpportunityId] = useState<string | null>(null);
  useTrackEngagement("service_page");

  if (!authLoading && !user) return <Navigate to="/auth" replace />;

  // Get my member record (the logged-in user)
  const { data: myMember } = useQuery({
    queryKey: ["my-member-vol", user?.email],
    enabled: !!user?.email,
    queryFn: async () => {
      const { data } = await supabase
        .from("roster_members")
        .select("key_id, first_name, last_name, email, cell_phone, home_phone")
        .eq("email", user!.email!)
        .maybeSingle();
      return data;
    },
  });

  // Get impersonated member record if viewing as another member (admin only)
  const { data: viewAsMember } = useQuery({
    queryKey: ["view-as-member-vol", viewAsKeyId],
    enabled: !!viewAsKeyId && isAdmin,
    queryFn: async () => {
      const { data } = await supabase
        .from("roster_members")
        .select("key_id, first_name, last_name, email, cell_phone, home_phone")
        .eq("key_id", Number(viewAsKeyId))
        .maybeSingle();
      return data;
    },
  });

  // Determine which member to display data for
  // Also check if we're *trying* to impersonate (viewAsKeyId present) even if data hasn't loaded
  const isImpersonating = !!viewAsKeyId && isAdmin && !!viewAsMember;
  const isPendingImpersonation = !!viewAsKeyId && isAdmin && !viewAsMember;
  const displayMember = isImpersonating ? viewAsMember : myMember;

  // Fetch all opportunities
  const { data: opportunities, isLoading } = useQuery({
    queryKey: ["member-vol-opportunities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("volunteering_opportunities")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch contacts for all opportunities
  const { data: allContacts } = useQuery({
    queryKey: ["member-vol-contacts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("volunteering_opportunity_contacts")
        .select("*");
      if (error) throw error;
      return data;
    },
  });

  // Fetch contact member names
  const contactKeyIds = allContacts?.map((c) => c.key_id) ?? [];
  const { data: contactMembers } = useQuery({
    queryKey: ["member-vol-contact-names", contactKeyIds],
    enabled: contactKeyIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("roster_members")
        .select("key_id, first_name, last_name")
        .in("key_id", contactKeyIds);
      if (error) throw error;
      return data;
    },
  });

  const contactNameMap = new Map(
    (contactMembers ?? []).map((m) => [m.key_id, `${m.first_name ?? ""} ${m.last_name ?? ""}`.trim()])
  );

  // Fetch applications for the displayed member (impersonated or self)
  const { data: displayedApplications } = useQuery({
    queryKey: ["display-vol-applications", displayMember?.key_id],
    enabled: !!displayMember?.key_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("volunteering_applications")
        .select("*")
        .eq("key_id", displayMember!.key_id);
      if (error) throw error;
      return data;
    },
  });

  const appliedIds = new Set((displayedApplications ?? []).map((a) => a.opportunity_id));

  // Track which opportunity is currently being applied to
  const [applyingOpportunityId, setApplyingOpportunityId] = useState<string | null>(null);

  // Apply mutation
  const applyMutation = useMutation({
    mutationFn: async (opportunityId: string) => {
      setApplyingOpportunityId(opportunityId);
      const session = (await supabase.auth.getSession()).data.session;
      const body: Record<string, string | number> = { opportunity_id: opportunityId };
      // If impersonating, pass the impersonated member's key_id so the edge function applies on their behalf
      if (isImpersonating && displayMember) {
        body.on_behalf_of_key_id = displayMember.key_id;
      }
      const { data, error } = await supabase.functions.invoke("volunteer-apply", {
        body,
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["display-vol-applications"] });
      toast({
        title: "Application submitted!",
        description: isImpersonating
          ? `Application submitted on behalf of ${displayMember?.first_name ?? "the member"}.`
          : "The opportunity contacts have been notified of your interest.",
      });
    },
    onError: (e: any) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  // Split opportunities: all active, then up to 3 closed/completed
  const active = (opportunities ?? []).filter((o) => o.status === "Active");
  const closedOrCompleted = (opportunities ?? [])
    .filter((o) => o.status === "Closed" || o.status === "Completed")
    .slice(0, 3);

  const displayOpportunities = [...active, ...closedOrCompleted];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Impersonation indicator */}
        {isImpersonating && viewAsMember && (
          <div className="rounded-md bg-accent/10 border border-accent/30 px-3 py-2 text-xs text-accent font-medium flex items-center justify-between">
            <span>Viewing as: {viewAsMember.first_name} {viewAsMember.last_name}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSearchParams({})}
              className="h-6 px-2 text-xs text-accent hover:text-foreground"
            >
              <X className="h-3 w-3 mr-1" /> Reset
            </Button>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center gap-3">
          <Link to="/home">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <HandHelping className="h-5 w-5 text-accent" />
              Chapter Volunteering Opportunities
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Browse and apply for chapter volunteering opportunities
            </p>
          </div>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground text-sm">Loading...</p>
        ) : displayOpportunities.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No volunteering opportunities available at this time.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {/* Active section */}
            {active.length > 0 && (
              <>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Active Opportunities
                </h2>
                {active.map((opp) => (
                  <OpportunityCard
                    key={opp.id}
                    opp={opp}
                    contacts={allContacts ?? []}
                    contactNameMap={contactNameMap}
                    hasApplied={appliedIds.has(opp.id)}
                    onApply={() => applyMutation.mutate(opp.id)}
                    applying={applyMutation.isPending}
                    canApply={!!displayMember && !isPendingImpersonation}
                    isImpersonating={isImpersonating}
                  />
                ))}
              </>
            )}

            {/* Closed/Completed section */}
            {closedOrCompleted.length > 0 && (
              <>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mt-6">
                  RECENTLY COMPLETED
                </h2>
                {closedOrCompleted.map((opp) => (
                  <OpportunityCard
                    key={opp.id}
                    opp={opp}
                    contacts={allContacts ?? []}
                    contactNameMap={contactNameMap}
                    hasApplied={appliedIds.has(opp.id)}
                    onApply={() => {}}
                    applying={false}
                    canApply={false}
                    isImpersonating={isImpersonating}
                  />
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

type OpportunityCardProps = {
  opp: any;
  contacts: any[];
  contactNameMap: Map<number, string>;
  hasApplied: boolean;
  onApply: () => void;
  applying: boolean;
  canApply: boolean;
  isImpersonating: boolean;
};

function OpportunityCard({ opp, contacts, contactNameMap, hasApplied, onApply, applying, canApply, isImpersonating }: OpportunityCardProps) {
  const oppContacts = contacts.filter((c) => c.opportunity_id === opp.id);
  const isActive = opp.status === "Active";

  return (
    <Card className={!isActive ? "opacity-70" : ""}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base">{opp.title}</CardTitle>
            <CardDescription className="text-xs mt-1">
              Posted by {opp.created_by_name} · {new Date(opp.created_at).toLocaleDateString()}
            </CardDescription>
          </div>
          <Badge className={STATUS_COLORS[opp.status] ?? ""}>{opp.status}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {opp.description && (
          <p className="text-sm text-muted-foreground">{opp.description}</p>
        )}
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {opp.num_volunteers} volunteer{opp.num_volunteers !== 1 ? "s" : ""} needed
          </span>
        </div>
        {oppContacts.length > 0 && (
          <div className="text-xs">
            <span className="text-muted-foreground">Contact: </span>
            {oppContacts.map((c, i) => (
              <span key={c.id}>
                {contactNameMap.get(c.key_id) ?? `Member #${c.key_id}`}
                {i < oppContacts.length - 1 ? ", " : ""}
              </span>
            ))}
          </div>
        )}

        {/* Apply button */}
        {isActive && (
          <div className="pt-1">
            {hasApplied ? (
              <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
                <CheckCircle2 className="h-4 w-4" />
                {isImpersonating ? "This member has applied" : "You have applied for this opportunity"}
              </div>
            ) : canApply ? (
              <Button size="sm" onClick={onApply} disabled={applying}>
                <HandHelping className="h-4 w-4 mr-1.5" />
                {applying ? "Applying..." : isImpersonating ? "Apply on Behalf" : "Apply to Volunteer"}
              </Button>
            ) : null}
          </div>
        )}

        {!isActive && hasApplied && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {isImpersonating ? "This member applied" : "You applied for this opportunity"}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
