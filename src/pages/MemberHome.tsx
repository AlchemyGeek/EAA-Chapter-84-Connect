import { useState } from "react"; // refreshed
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { StatusDashboard } from "@/components/member/StatusDashboard";
import { ReadOnlySection } from "@/components/member/ReadOnlySection";
import { EditableSection } from "@/components/member/EditableSection";
import type { EditableFieldDef } from "@/components/member/EditableSection";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LogOut, Shield, Upload, Download, FileText, Users,
  Plane, Phone, Award, ChevronRight, Bug, X, Settings, AlertTriangle, BarChart3, CircleDollarSign,
  UserCog, BadgeCheck, HandHelping, UserPlus, Mail, Heart, MessageSquare, Activity, Newspaper,
  ClipboardList,
} from "lucide-react";
import { useIsOfficer } from "@/hooks/useIsOfficer";
import { useTrackEngagement } from "@/hooks/useTrackEngagement";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MemberImageGallery } from "@/components/member/MemberImageGallery";
import chapterLogo from "@/assets/chapter-logo.jpg";
import { Navigate, Link } from "react-router-dom";
import { exportProxyVoteResults } from "@/lib/exportProxyVotes";

export default function MemberHome() {
  const { user, loading: authLoading, isAdmin, isOfficerOrAbove, signOut } = useAuth();
  const queryClient = useQueryClient();
  const [impersonateKeyId, setImpersonateKeyId] = useState<string | null>(null);
  const [debugOpen, setDebugOpen] = useState(false);

  // Fetch all members for admin impersonation dropdown
  const { data: allMembers } = useQuery({
    queryKey: ["all-members-list"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("roster_members")
        .select("key_id, first_name, last_name, email, eaa_number")
        .order("last_name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch the logged-in user's own member record
  const { data: myMember, isLoading: myLoading } = useQuery({
    queryKey: ["my-member", user?.email],
    enabled: !!user?.email,
    queryFn: async () => {
      const authEmail = user?.email?.trim();
      if (!authEmail) return null;

      const { data, error } = await supabase
        .from("roster_members")
        .select("*")
        .ilike("email", authEmail)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Fetch impersonated member record
  const { data: impersonatedMember, isLoading: impLoading } = useQuery({
    queryKey: ["impersonate-member", impersonateKeyId],
    enabled: !!impersonateKeyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("roster_members")
        .select("*")
        .eq("key_id", Number(impersonateKeyId))
        .single();
      if (error) throw error;
      return data;
    },
  });

  // Fetch site links
  const { data: siteLinks = [] } = useQuery({
    queryKey: ["site-links"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_links")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  // Fetch chapter fees for renewal payment URL
  const { data: chapterFees = [] } = useQuery({
    queryKey: ["chapter-fees"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chapter_fees")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  // Fetch the prospect's original new-member application (for quarter-based fee selection)
  const { data: prospectApplication } = useQuery({
    queryKey: ["my-application", user?.email],
    enabled: !!user?.email,
    queryFn: async () => {
      const authEmail = user?.email?.trim();
      if (!authEmail) return null;
      const { data, error } = await (supabase as any)
        .from("new_member_applications")
        .select("quarter_applied, fee_amount, created_at")
        .ilike("email", authEmail)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as { quarter_applied: string | null; fee_amount: number | null; created_at: string } | null;
    },
  });

  const { data: activeVolCount = 0 } = useQuery({
    queryKey: ["active-vol-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("volunteering_opportunities")
        .select("*", { count: "exact", head: true })
        .eq("status", "Active");
      if (error) throw error;
      return count ?? 0;
    },
  });

  // Fetch pending new member applications count
  const { data: pendingAppCount = 0 } = useQuery({
    queryKey: ["pending-app-count"],
    enabled: isOfficerOrAbove || isAdmin,
    staleTime: 0,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("new_member_applications")
        .select("*", { count: "exact", head: true })
        .eq("processed", false);
      if (error) throw error;
      return count ?? 0;
    },
  });

  // Fetch member chapter data (for directory visibility)
  const activeKeyId = impersonateKeyId ? Number(impersonateKeyId) : myMember?.key_id;
  const { data: chapterData } = useQuery({
    queryKey: ["member-chapter-data", activeKeyId],
    enabled: !!activeKeyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("member_chapter_data")
        .select("*")
        .eq("key_id", activeKeyId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const toggleVisibility = useMutation({
    mutationFn: async ({ field, visible }: { field: "contact_visible_in_directory" | "aviation_visible_in_directory" | "volunteering_visible_in_directory"; visible: boolean }) => {
      if (chapterData) {
        const { error } = await supabase
          .from("member_chapter_data")
          .update({ [field]: visible } as any)
          .eq("key_id", activeKeyId!);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("member_chapter_data")
          .insert({ key_id: activeKeyId!, [field]: visible } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["member-chapter-data", activeKeyId] });
    },
  });

  const { isOfficer, role: officerRole } = useIsOfficer(activeKeyId);
  useTrackEngagement("login");

  // Look up the impersonated member's app role (from user_roles via their email)
  const impersonatedEmail = impersonatedMember?.email;
  const { data: impersonatedUserId } = useQuery({
    queryKey: ["impersonate-user-id", impersonatedEmail],
    enabled: !!impersonatedEmail && !!impersonateKeyId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_user_id_by_email", {
        _email: impersonatedEmail!,
      });
      if (error) throw error;
      return data as string | null;
    },
  });
  const { data: impersonatedRoles = [] } = useQuery({
    queryKey: ["impersonate-roles", impersonatedUserId],
    enabled: !!impersonatedUserId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", impersonatedUserId!);
      if (error) throw error;
      return data;
    },
  });

  // Proxy vote status for the active viewing member (banner gating)
  const viewKeyIdForProxy = impersonateKeyId ? Number(impersonateKeyId) : myMember?.key_id;
  const { data: myProxyVotes } = useQuery({
    queryKey: ["my-proxy-votes-banner", viewKeyIdForProxy],
    enabled: !!viewKeyIdForProxy,
    staleTime: 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("proxy_votes_2026")
        .select("action, created_at")
        .eq("key_id", viewKeyIdForProxy!)
        .order("created_at", { ascending: false })
        .limit(1);
      if (error) throw error;
      return data;
    },
  });
  const proxySigned = myProxyVotes?.[0]?.action === "signed";
  const proxyWindowOpen = new Date() < new Date("2026-06-09T00:00:00");

  // Compute effective view permissions (real admin's role when not impersonating, impersonated member's role when impersonating)
  const isImpersonating = !!impersonateKeyId && !!impersonatedMember;
  const viewRoles = isImpersonating
    ? (impersonatedRoles ?? []).map((r) => r.role)
    : null;
  const viewIsAdmin = isImpersonating ? (viewRoles?.includes("admin") ?? false) : isAdmin;
  const viewIsOfficerOrAbove = isImpersonating
    ? (viewRoles?.includes("admin") || viewRoles?.includes("officer") || isOfficer)
    : isOfficerOrAbove;

  const isLoading = authLoading || myLoading || (impersonateKeyId && impLoading);

  if (authLoading || myLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  const member = impersonateKeyId ? impersonatedMember : myMember;

  // Inactive = standing is not Active (expiration date no longer factors in)
  const isInactive = !!member && member.current_standing !== "Active";
  const isProspect = !!member && (member.member_type || "").toLowerCase() === "prospect";

  // Dues reminder for active members whose expiration has passed or is within 60 days
  const needsDuesReminder = (() => {
    if (!member || isInactive || isProspect) return false;
    if (!member.expiration_date) return false;
    const exp = new Date(member.expiration_date);
    const now = new Date();
    if (exp < now) return true;
    const daysUntil = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntil <= 60;
  })();
  const duesExpired = !!member?.expiration_date && new Date(member.expiration_date) < new Date();
  // Active but overdue = active standing with expired dues (prospects excluded)
  const isOverdue = !!member && !isInactive && !isProspect && duesExpired;
  const isRestricted = isInactive || isOverdue || isProspect;

  // Find renewal/payment link from chapter fees.
  // For Prospects, prefer the fee matching their original application quarter (e.g., "Q2").
  // Otherwise fall back to the annual/renewal fee or a configured site link.
  const renewalFee = (() => {
    if (isProspect && prospectApplication?.quarter_applied) {
      const q = prospectApplication.quarter_applied.toUpperCase();
      const match = chapterFees.find((f) => f.name.toUpperCase().includes(q));
      if (match) return match;
    }
    return chapterFees.find(
      (f) => f.name.toLowerCase().includes("annual") || f.name.toLowerCase().includes("renewal") || f.name.toLowerCase().includes("renew")
    );
  })();
  const renewalUrl = renewalFee?.payment_url || siteLinks.find(
    (l) => l.name.toLowerCase().includes("renewal") || l.name.toLowerCase().includes("renew")
  )?.url;

  const contactFieldDefs: EditableFieldDef[] = [
    { label: "Nickname", key: "nickname" },
    { label: "Email", key: "email" },
    { label: "Cell Phone", key: "cell_phone" },
    { label: "Home Phone", key: "home_phone" },
    { label: "Street Address 1", key: "street_address_1" },
    { label: "Street Address 2", key: "street_address_2" },
    { label: "City", key: "preferred_city" },
    { label: "State", key: "preferred_state" },
    { label: "Zip", key: "zip_code" },
    { label: "Country", key: "country" },
  ];

  const aviationFieldDefs: EditableFieldDef[] = [
    { label: "Ratings", key: "ratings" },
    { label: "Aircraft Owned", key: "aircraft_owned" },
    { label: "Aircraft Project", key: "aircraft_project" },
    { label: "Aircraft Built", key: "aircraft_built" },
  ];

  const volunteerFieldDefs: EditableFieldDef[] = [
    { label: "Young Eagle Pilot", key: "young_eagle_pilot", type: "boolean" },
    { label: "Young Eagle Volunteer", key: "young_eagle_volunteer", type: "boolean" },
    { label: "Eagle Pilot", key: "eagle_pilot", type: "boolean" },
    { label: "Eagle Flight Volunteer", key: "eagle_flight_volunteer", type: "boolean" },
  ];


  const handleSave = async (updates: Record<string, any>) => {
    if (isAdmin) {
      // Admins use direct update (allowed by admin RLS policy)
      const { error } = await supabase
        .from("roster_members")
        .update(updates as any)
        .eq("key_id", member!.key_id);
      if (error) throw error;
    } else {
      // Members use the restricted RPC function
      const rpcParams: Record<string, any> = { _key_id: member!.key_id };
      const allowedFields = [
        'email', 'cell_phone', 'home_phone', 'street_address_1', 'street_address_2',
        'preferred_city', 'preferred_state', 'zip_code', 'country', 'nickname', 'spouse',
        'ratings', 'aircraft_owned', 'aircraft_project', 'aircraft_built', 'other_info',
        'cell_phone_private', 'home_phone_private', 'address_private', 'email_private',
        'young_eagle_pilot', 'young_eagle_volunteer', 'eagle_pilot', 'eagle_flight_volunteer',
      ];
      for (const [key, value] of Object.entries(updates)) {
        if (allowedFields.includes(key)) {
          rpcParams[`_${key}`] = value;
        }
      }
      const { error } = await supabase.rpc('member_update_own_record', rpcParams as any);
      if (error) throw error;
    }
    queryClient.invalidateQueries({ queryKey: ["my-member"] });
    queryClient.invalidateQueries({ queryKey: ["impersonate-member"] });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero header */}
      <div className="bg-primary text-primary-foreground">
        <div className="max-w-2xl mx-auto px-4 pt-6 pb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <img
                src={chapterLogo}
                alt="EAA Chapter 84"
                className="h-10 w-10 rounded-full ring-2 ring-primary-foreground/20"
              />
              <span className="font-semibold text-sm opacity-90 hidden sm:inline">Chapter 84 Connect</span>
            </div>
            <div className="flex items-center gap-1">
              <a
                href="mailto:membership@eaa84.org"
                className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10 inline-flex items-center rounded-md px-3 text-sm font-medium h-9 min-h-[44px]"
                title="Contact Us"
              >
                <Mail className="h-4 w-4 sm:mr-1.5" />
                <span className="hidden sm:inline">Contact Us</span>
              </a>
              <Button
                variant="ghost"
                size="sm"
                onClick={signOut}
                className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10 min-h-[44px]"
                title="Sign Out"
              >
                <LogOut className="h-4 w-4 sm:mr-1.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </div>
          </div>

          {member ? (
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                Welcome, {member.first_name}{member.nickname?.trim() ? ` (${member.nickname.trim()})` : ""}
              </h1>
              <p className="text-primary-foreground/70 text-sm mt-1">
                EAA #{member.eaa_number} · {member.chapter_name}
              </p>
            </div>
          ) : (
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                Welcome
              </h1>
              <p className="text-primary-foreground/70 text-sm mt-1">
                {user.email}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 -mt-4 pb-8 space-y-4">
        {/* Impersonation indicator */}
        {isImpersonating && (
          <div className="rounded-md bg-accent/10 border border-accent/30 px-3 py-2 text-xs text-accent font-medium">
            Viewing as: {impersonatedMember.first_name} {impersonatedMember.last_name} (EAA #{impersonatedMember.eaa_number})
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setImpersonateKeyId(null)}
              className="ml-2 h-6 px-2 text-xs text-accent hover:text-foreground"
            >
              <X className="h-3 w-3 mr-1" /> Reset
            </Button>
          </div>
        )}

        {/* Status Dashboard */}
        {member ? (
          <StatusDashboard
            currentStanding={member.current_standing}
            expirationDate={member.expiration_date}
            eaaExpiration={member.eaa_expiration}
            memberType={member.member_type}
            eaaNumber={member.eaa_number}
            officerRole={officerRole}
          />
        ) : (
          <Card className="border-amber-200">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">
                We couldn't find a membership record linked to <strong>{user.email}</strong>.
                Please contact your chapter coordinator if this is unexpected.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Prospect (application pending) CTA */}
        {member && isProspect && (
          <Card className="border-2 border-amber-300/60 bg-amber-50/50 dark:bg-amber-900/10 dark:border-amber-700/40 shadow-md">
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-amber-100 dark:bg-amber-900/30 p-2 shrink-0">
                  <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground leading-relaxed">
                    Welcome! Your Chapter 84 membership application is being processed.
                    Please log back in in a few days to access full member features.
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    If you haven't yet paid your dues, please use the link below to complete your payment.
                    If you have already paid, thank you — we may not have processed it yet.
                  </p>
                  {renewalUrl && (
                    <a href={renewalUrl} target="_blank" rel="noopener noreferrer">
                      <Button className="mt-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold">
                        Pay Membership Dues
                      </Button>
                    </a>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Renewal CTA for inactive (lapsed, non-prospect) members */}
        {member && isInactive && !isProspect && (
          <Card className="border-2 border-destructive/40 bg-destructive/5 shadow-md">
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-destructive/10 p-2 shrink-0">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground leading-relaxed">
                    Your Chapter 84 membership appears to be inactive. We'd love to have you back
                    — please renew your subscription using the link below to continue participating
                    in chapter programs and events.
                  </p>
                  {renewalUrl ? (
                    <a href={renewalUrl} target="_blank" rel="noopener noreferrer">
                      <Button className="mt-1 bg-destructive hover:bg-destructive/90 text-destructive-foreground font-semibold">
                        Renew Membership
                      </Button>
                    </a>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Please contact your chapter coordinator for renewal information.
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Dues reminder for active members with expired/expiring dues */}
        {member && !isInactive && needsDuesReminder && (
          <Card className="border-2 border-amber-300/60 bg-amber-50/50 dark:bg-amber-900/10 dark:border-amber-700/40 shadow-md">
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-amber-100 dark:bg-amber-900/30 p-2 shrink-0">
                  <CircleDollarSign className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground leading-relaxed">
                    {duesExpired
                      ? "Your chapter dues have expired. Please renew to keep enjoying all chapter programs and events!"
                      : "Your chapter dues are expiring soon. Renew now to stay current!"}
                  </p>
                  {renewalUrl ? (
                    <a href={renewalUrl} target="_blank" rel="noopener noreferrer">
                      <Button className="mt-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold">
                        Renew Membership
                      </Button>
                    </a>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Please contact your chapter coordinator for renewal information.
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Editable & read-only sections */}
        {member && (
          <div className="space-y-2">
            <EditableSection
              title="Contact Information"
              icon={Phone}
              fields={contactFieldDefs}
              data={member}
              onSave={handleSave}
              disabled={false}
              directoryVisible={chapterData?.contact_visible_in_directory ?? false}
              onDirectoryVisibleChange={(checked) =>
                toggleVisibility.mutate({ field: "contact_visible_in_directory", visible: checked })
              }
              directoryToggleDisabled={toggleVisibility.isPending}
            />
            <EditableSection
              title="Aviation & Aircraft"
              icon={Plane}
              fields={aviationFieldDefs}
              data={member}
              onSave={handleSave}
              disabled={false}
              directoryVisible={chapterData?.aviation_visible_in_directory ?? false}
              onDirectoryVisibleChange={(checked) =>
                toggleVisibility.mutate({ field: "aviation_visible_in_directory", visible: checked })
              }
              directoryToggleDisabled={toggleVisibility.isPending}
            />
            <EditableSection
              title="EAA Volunteering"
              icon={Award}
              fields={volunteerFieldDefs}
              data={member}
              onSave={handleSave}
              disabled={false}
              directoryVisible={chapterData?.volunteering_visible_in_directory ?? false}
              onDirectoryVisibleChange={(checked) =>
                toggleVisibility.mutate({ field: "volunteering_visible_in_directory", visible: checked })
              }
              directoryToggleDisabled={toggleVisibility.isPending}
            />
            <MemberImageGallery keyId={member.key_id} editable={!isImpersonating || isAdmin} />
          </div>
        )}

        {/* 2026 Bylaws Proxy Vote banner */}
        {proxyWindowOpen && !isRestricted && member && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="text-2xl shrink-0">📋</div>
            <div className="flex-1 space-y-1">
              <h3 className="text-base font-bold text-amber-950 dark:text-amber-100">
                EAA Chapter 84 — Changes to Bylaws: Voting Proxy Form
              </h3>
              <p className="text-sm text-amber-900 dark:text-amber-200">
                If you will not be available in person to vote on the bylaw change at the June 2026 chapter meeting, please consider signing the proxy vote form.
              </p>
              <p className="text-xs text-amber-800/80 dark:text-amber-300/80">
                Proxy form available through June 8, 2026.{proxySigned ? " ✅ Proxy signed." : ""}
              </p>
            </div>
            <Link to="/proxy-vote">
              <Button className="bg-amber-600 hover:bg-amber-700 text-white min-h-[44px] whitespace-nowrap">
                {proxySigned ? "View / Manage Proxy" : "Open Proxy Form →"}
              </Button>
            </Link>
          </div>
        )}

        {/* Member Services */}
        <Card className={isRestricted ? "opacity-60 relative" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Member Services</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {isRestricted ? (
              <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-3 text-sm text-muted-foreground">
                <Shield className="h-4 w-4 shrink-0" />
                <span>Renew your membership to access chapter services and resources.</span>
              </div>
            ) : (
              <>
                <AdminLink to="/members" icon={Users} label="Member Directory" />
                <AdminLink 
                  to={impersonateKeyId ? `/member-volunteering?viewAs=${impersonateKeyId}` : "/member-volunteering"} 
                  icon={HandHelping} 
                  label={`Chapter Volunteering Opportunities${activeVolCount > 0 ? ` (${activeVolCount})` : ""}`} 
                />
                <AdminLink to="/newsletters" icon={Newspaper} label="Newsletter Archive" />
                {/* <AdminLink to={impersonateKeyId ? `/hangar-talk?viewAs=${impersonateKeyId}` : "/hangar-talk"} icon={MessageSquare} label="Hangar Talk" /> */}
              </>
            )}
          </CardContent>
        </Card>

        {/* Officer Services */}
        {viewIsOfficerOrAbove && !isRestricted && (
          <Card className="border-accent/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-accent" />
                Officer Services
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground px-1">Chapter Operations</p>
                <AdminLink to="/dues-payment" icon={CircleDollarSign} label="Membership Dues" />
                <AdminLink to="/membership-badges" icon={BadgeCheck} label="2026 Membership Badges" />
                <AdminLink to="/volunteering-opportunities" icon={HandHelping} label="Chapter Volunteering" />
                <AdminLink to="/newsletters-admin" icon={Newspaper} label="Newsletters" />
                <button
                  type="button"
                  onClick={() => exportProxyVoteResults().catch(() => {})}
                  className="flex items-center gap-2 w-full text-left px-3 py-2.5 rounded-md hover:bg-muted/60 transition-colors min-h-[44px] text-sm"
                >
                  <ClipboardList className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="flex-1">2026 Bylaws Proxy Vote Results</span>
                  <Download className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground px-1">New Members</p>
                <AdminLink to="/new-member-applications" icon={UserPlus} label={`Applications${pendingAppCount > 0 ? ` (${pendingAppCount})` : ""}`} />
                <AdminLink to="/buddy-program" icon={Heart} label="Buddy Program" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground px-1">Insights</p>
                <AdminLink to="/membership-stats" icon={BarChart3} label="Membership Statistics" />
                <AdminLink to="/member-engagement" icon={Activity} label="Member Engagement" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Admin tools */}
        {viewIsAdmin && !isRestricted && (
          <Card className="border-secondary/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Shield className="h-4 w-4 text-secondary" />
                Admin Tools
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <AdminLink to="/import" icon={Upload} label="Import Roster" />
              <AdminLink to="/imports" icon={FileText} label="Import History" />
              <AdminLink to="/export" icon={Download} label="Export Data" />
              <AdminLink to="/site-config" icon={Settings} label="Website Configuration" />
              <AdminLink to="/user-roles" icon={UserCog} label="User Roles" />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Floating debug button */}
      {isAdmin && (
        <Dialog open={debugOpen} onOpenChange={setDebugOpen}>
          <Button
            onClick={() => setDebugOpen(true)}
            size="icon"
            className="fixed bottom-6 right-6 h-12 w-12 rounded-full shadow-lg bg-accent text-accent-foreground hover:bg-accent/90 z-50"
          >
            <Bug className="h-5 w-5" />
          </Button>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Bug className="h-4 w-4" />
                View as Member
              </DialogTitle>
            </DialogHeader>
            <Select
              value={impersonateKeyId ?? ""}
              onValueChange={(val) => {
                setImpersonateKeyId(val || null);
                setDebugOpen(false);
              }}
            >
              <SelectTrigger className="h-10 text-sm">
                <SelectValue placeholder="Select a member..." />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {allMembers?.map((m) => (
                  <SelectItem key={m.key_id} value={String(m.key_id)}>
                    {m.last_name}, {m.first_name} — EAA #{m.eaa_number}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isImpersonating && (
              <Button
                variant="outline"
                onClick={() => {
                  setImpersonateKeyId(null);
                  setDebugOpen(false);
                }}
                className="w-full"
              >
                <X className="h-4 w-4 mr-2" /> Reset to My View
              </Button>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}


function AdminLink({ to, icon: Icon, label }: { to: string; icon: typeof Users; label: string }) {
  return (
    <Link
      to={to}
      className="flex items-center justify-between rounded-md px-3 py-2.5 text-sm transition-colors hover:bg-muted min-h-[44px]"
    >
      <span className="flex items-center gap-2.5">
        <Icon className="h-4 w-4 text-muted-foreground" />
        {label}
      </span>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </Link>
  );
}
