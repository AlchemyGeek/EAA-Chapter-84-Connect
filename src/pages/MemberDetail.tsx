import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusDashboard } from "@/components/member/StatusDashboard";
import { ReadOnlySection } from "@/components/member/ReadOnlySection";
import { MemberImageGallery } from "@/components/member/MemberImageGallery";

export default function MemberDetail() {
  const { keyId } = useParams();

  const { data: member, isLoading } = useQuery({
    queryKey: ["member", keyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("roster_members")
        .select("*")
        .eq("key_id", Number(keyId))
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: chapterData } = useQuery({
    queryKey: ["member-chapter-data", keyId],
    enabled: !!member,
    queryFn: async () => {
      const { data } = await supabase
        .from("member_chapter_data")
        .select("contact_visible_in_directory, aviation_visible_in_directory, volunteering_visible_in_directory")
        .eq("key_id", Number(keyId))
        .maybeSingle();
      return data;
    },
  });

  if (isLoading) return <div className="p-6 text-muted-foreground">Loading...</div>;
  if (!member) return <div className="p-6">Member not found.</div>;

  const contactVisible = chapterData?.contact_visible_in_directory ?? false;
  const aviationVisible = chapterData?.aviation_visible_in_directory ?? true;
  const volunteeringVisible = chapterData?.volunteering_visible_in_directory ?? true;

  // Email is ALWAYS visible; other contact fields respect the visibility toggle
  const contactFields = [
    { label: "Email", value: member.email },
    ...(contactVisible
      ? [
          { label: "Cell Phone", value: member.cell_phone },
          { label: "Home Phone", value: member.home_phone },
          { label: "Address", value: [member.street_address_1, member.street_address_2].filter((v) => v?.trim()).join(", ") || null },
          { label: "City", value: member.preferred_city },
          { label: "State", value: member.preferred_state },
          { label: "Zip", value: member.zip_code },
          { label: "Country", value: member.country },
        ]
      : []),
  ];

  const aviationFields = aviationVisible
    ? [
        { label: "Ratings", value: member.ratings },
        { label: "Aircraft Owned", value: member.aircraft_owned },
        { label: "Aircraft Project", value: member.aircraft_project },
        { label: "Aircraft Built", value: member.aircraft_built },
      ]
    : [];

  const volunteerFields = volunteeringVisible
    ? [
        { label: "Young Eagle Pilot", value: member.young_eagle_pilot },
        { label: "Young Eagle Volunteer", value: member.young_eagle_volunteer },
        { label: "Eagle Pilot", value: member.eagle_pilot },
        { label: "Eagle Flight Volunteer", value: member.eagle_flight_volunteer },
      ]
    : [];


  const complianceFields = [
    { label: "EAA Expiration", value: member.eaa_expiration },
    { label: "Youth Protection", value: member.youth_protection },
    { label: "Background Check", value: member.background_check },
  ];

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild className="min-h-[44px] min-w-[44px]">
          <Link to="/members"><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="text-lg md:text-xl font-bold truncate">
            {member.first_name} {member.last_name}
            {member.nickname && <span className="text-muted-foreground font-normal"> "{member.nickname}"</span>}
          </h1>
          <p className="text-xs text-muted-foreground">EAA #{member.eaa_number}</p>
        </div>
      </div>

      {/* Status Dashboard */}
      <StatusDashboard
        currentStanding={member.current_standing}
        expirationDate={member.expiration_date}
        eaaExpiration={member.eaa_expiration}
        memberType={member.member_type}
        eaaNumber={member.eaa_number}
      />

      {/* Read-only sections */}
      <div className="space-y-2">
        <ReadOnlySection title="Contact Information" fields={contactFields} defaultOpen />
        {aviationFields.length > 0 && <ReadOnlySection title="Aviation & Aircraft" fields={aviationFields} />}
        {volunteerFields.length > 0 && <ReadOnlySection title="EAA Volunteering" fields={volunteerFields} />}
        <ReadOnlySection title="Compliance (EAA-managed)" fields={complianceFields} />
        <MemberImageGallery keyId={member.key_id} />
      </div>

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
    </div>
  );
}
