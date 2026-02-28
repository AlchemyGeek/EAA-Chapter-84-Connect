import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  Plane, Phone, Award, ChevronRight, Bug, X,
} from "lucide-react";
import chapterLogo from "@/assets/chapter-logo.jpg";
import { Navigate, Link } from "react-router-dom";

export default function MemberHome() {
  const { user, loading: authLoading, isAdmin, signOut } = useAuth();
  const [impersonateKeyId, setImpersonateKeyId] = useState<string | null>(null);

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

  const contactFields = member
    ? [
        { label: "Email", value: member.email },
        { label: "Cell Phone", value: member.cell_phone },
        { label: "Home Phone", value: member.home_phone },
        {
          label: "Address",
          value:
            [member.street_address_1, member.street_address_2]
              .filter(Boolean)
              .join(", ") || null,
        },
        { label: "City", value: member.preferred_city },
        { label: "State", value: member.preferred_state },
        { label: "Zip", value: member.zip_code },
      ]
    : [];

  const aviationFields = member
    ? [
        { label: "Ratings", value: member.ratings },
        { label: "Aircraft Owned", value: member.aircraft_owned },
        { label: "Aircraft Project", value: member.aircraft_project },
        { label: "Aircraft Built", value: member.aircraft_built },
      ]
    : [];

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
                Welcome, {member.first_name}
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
        {/* Admin impersonation banner */}
        {isAdmin && (
          <Card className="border-accent/50 bg-accent/5">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-2">
                <Bug className="h-4 w-4 text-accent" />
                <span className="text-xs font-semibold text-accent">Debug: View as Member</span>
                {isImpersonating && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setImpersonateKeyId(null)}
                    className="ml-auto h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3 w-3 mr-1" /> Reset
                  </Button>
                )}
              </div>
              <Select
                value={impersonateKeyId ?? ""}
                onValueChange={(val) => setImpersonateKeyId(val || null)}
              >
                <SelectTrigger className="h-9 text-sm bg-background">
                  <SelectValue placeholder="Select a member to impersonate..." />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {allMembers?.map((m) => (
                    <SelectItem key={m.key_id} value={String(m.key_id)}>
                      {m.last_name}, {m.first_name} — EAA #{m.eaa_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        )}

        {/* Impersonation indicator */}
        {isImpersonating && (
          <div className="rounded-md bg-accent/10 border border-accent/30 px-3 py-2 text-xs text-accent font-medium">
            Viewing as: {impersonatedMember.first_name} {impersonatedMember.last_name} (EAA #{impersonatedMember.eaa_number})
          </div>
        )}

        {/* Status Dashboard */}
        {member ? (
          <StatusDashboard
            currentStanding={member.current_standing}
            expirationDate={member.expiration_date}
            memberType={member.member_type}
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

        {/* Read-only sections */}
        {member && (
          <div className="space-y-2">
            <ReadOnlySection title="Contact Information" icon={Phone} fields={contactFields} />
            <ReadOnlySection title="Aviation & Aircraft" icon={Plane} fields={aviationFields} />
            <ReadOnlySection title="Volunteering" icon={Award} fields={volunteerFields} />
          </div>
        )}

        {/* Services placeholder */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Member Services</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Services will be available here based on your membership role. Coming soon.
            </p>
          </CardContent>
        </Card>

        {/* Admin tools */}
        {isAdmin && (
          <Card className="border-secondary/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Shield className="h-4 w-4 text-secondary" />
                Admin Tools
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <AdminLink to="/members" icon={Users} label="Member Directory" />
              <AdminLink to="/import" icon={Upload} label="Import Roster" />
              <AdminLink to="/imports" icon={FileText} label="Import History" />
              <AdminLink to="/export" icon={Download} label="Export Data" />
            </CardContent>
          </Card>
        )}
      </div>
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
