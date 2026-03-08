import { useState } from "react";
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
  UserCog,
} from "lucide-react";
import { useIsOfficer } from "@/hooks/useIsOfficer";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MemberImageGallery } from "@/components/member/MemberImageGallery";
import chapterLogo from "@/assets/chapter-logo.jpg";
import { Navigate, Link } from "react-router-dom";

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
      const { data, error } = await supabase
        .from("roster_members")
        .select("*")
        .eq("email", user!.email!)
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
    mutationFn: async ({ field, visible }: { field: "contact_visible_in_directory" | "aviation_visible_in_directory"; visible: boolean }) => {
      if (chapterData) {
        const { error } = await supabase
          .from("member_chapter_data")
          .update({ [field]: visible })
          .eq("key_id", activeKeyId!);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("member_chapter_data")
          .insert({ key_id: activeKeyId!, [field]: visible });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["member-chapter-data", activeKeyId] });
    },
  });

  const { isOfficer, role: officerRole } = useIsOfficer(activeKeyId);
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
  const isImpersonating = !!impersonateKeyId && !!impersonatedMember;

  // Determine if member is inactive/lapsed
  const isInactive = (() => {
    if (!member) return false;
    if (member.current_standing !== "Active") return true;
    if (member.expiration_date && new Date(member.expiration_date) < new Date()) return true;
    return false;
  })();

  // Find renewal link from site_links
  const renewalLink = siteLinks.find(
    (l) => l.name.toLowerCase().includes("renewal") || l.name.toLowerCase().includes("renew")
  );

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

  const volunteerFields = member
    ? [
        { label: "Young Eagle Pilot", value: member.young_eagle_pilot },
        { label: "Young Eagle Volunteer", value: member.young_eagle_volunteer },
        { label: "Eagle Pilot", value: member.eagle_pilot },
        { label: "Eagle Flight Volunteer", value: member.eagle_flight_volunteer },
        { label: "IMC Club", value: member.imc },
        { label: "VMC Club", value: member.vmc },
      ]
    : [];


  const handleSave = async (updates: Record<string, any>) => {
    const { error } = await supabase
      .from("roster_members")
      .update(updates)
      .eq("key_id", member!.key_id);
    if (error) throw error;
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
              <span className="font-semibold text-sm opacity-90">Chapter 84 Connect</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={signOut}
              className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10 min-h-[44px]"
            >
              <LogOut className="h-4 w-4 mr-1.5" />
              Sign Out
            </Button>
          </div>

          {member ? (
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                Welcome, {member.first_name}{member.nickname ? ` (${member.nickname})` : ""}
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

        {/* Renewal CTA for inactive members */}
        {member && isInactive && (
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
                  {renewalLink ? (
                    <a href={renewalLink.url} target="_blank" rel="noopener noreferrer">
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
              directoryVisible={chapterData?.contact_visible_in_directory ?? true}
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
              directoryVisible={chapterData?.aviation_visible_in_directory ?? true}
              onDirectoryVisibleChange={(checked) =>
                toggleVisibility.mutate({ field: "aviation_visible_in_directory", visible: checked })
              }
              directoryToggleDisabled={toggleVisibility.isPending}
            />
            <ReadOnlySection title="Volunteering" icon={Award} fields={volunteerFields} />
            <MemberImageGallery keyId={member.key_id} editable={!isImpersonating} />
          </div>
        )}

        {/* Member Services */}
        <Card className={isInactive ? "opacity-60 relative" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Member Services</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {isInactive ? (
              <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-3 text-sm text-muted-foreground">
                <Shield className="h-4 w-4 shrink-0" />
                <span>Renew your membership to access chapter services and resources.</span>
              </div>
            ) : (
              <AdminLink to="/members" icon={Users} label="Member Directory" />
            )}
          </CardContent>
        </Card>

        {/* Officer Services */}
        {(isOfficer || isOfficerOrAbove) && !isInactive && (
          <Card className="border-accent/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-accent" />
                Officer Services
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <AdminLink to="/membership-stats" icon={BarChart3} label="Membership Statistics" />
              <AdminLink to="/dues-payment" icon={CircleDollarSign} label="Membership Due Payment" />
            </CardContent>
          </Card>
        )}

        {/* Admin tools */}
        {isAdmin && !isInactive && (
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
