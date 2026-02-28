import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

function Field({ label, value }: { label: string; value: any }) {
  if (value == null || value === "" || value === false) return null;
  const display = value === true ? "Yes" : String(value);
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium">{display}</dd>
    </div>
  );
}

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
    queryKey: ["chapter-data", keyId],
    queryFn: async () => {
      const { data } = await supabase
        .from("member_chapter_data")
        .select("*")
        .eq("key_id", Number(keyId))
        .maybeSingle();
      return data;
    },
  });

  if (isLoading) return <div className="p-6 text-muted-foreground">Loading...</div>;
  if (!member) return <div className="p-6">Member not found.</div>;

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/members"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{member.first_name} {member.last_name}</h1>
          <p className="text-sm text-muted-foreground">EAA #{member.eaa_number} · Key ID {member.key_id}</p>
        </div>
        <Badge variant="secondary" className="ml-auto">{member.member_type}</Badge>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Personal</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <Field label="Nickname" value={member.nickname} />
            <Field label="Gender" value={member.gender} />
            <Field label="Spouse" value={member.spouse} />
            <Field label="Birth Date" value={member.birth_date} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Contact</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <Field label="Email" value={member.email} />
            <Field label="Home Phone" value={member.home_phone} />
            <Field label="Cell Phone" value={member.cell_phone} />
            <Field label="Address" value={[member.street_address_1, member.street_address_2].filter(Boolean).join(", ")} />
            <Field label="City" value={member.preferred_city} />
            <Field label="State" value={member.preferred_state} />
            <Field label="Zip" value={member.zip_code} />
            <Field label="Country" value={member.country} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Membership</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <Field label="Standing" value={member.current_standing} />
            <Field label="Expiration" value={member.expiration_date} />
            <Field label="EAA Expiration" value={member.eaa_expiration} />
            <Field label="Joined" value={member.current_joined_on_date} />
            <Field label="Date Added" value={member.date_added} />
            <Field label="Date Updated" value={member.date_updated} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Aviation</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <Field label="Ratings" value={member.ratings} />
            <Field label="Aircraft Owned" value={member.aircraft_owned} />
            <Field label="Aircraft Project" value={member.aircraft_project} />
            <Field label="Aircraft Built" value={member.aircraft_built} />
            <Field label="IMC Club" value={member.imc} />
            <Field label="VMC Club" value={member.vmc} />
            <Field label="Young Eagle Pilot" value={member.young_eagle_pilot} />
            <Field label="Young Eagle Volunteer" value={member.young_eagle_volunteer} />
            <Field label="Eagle Pilot" value={member.eagle_pilot} />
            <Field label="Eagle Flight Volunteer" value={member.eagle_flight_volunteer} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Compliance</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <Field label="Youth Protection" value={member.youth_protection} />
            <Field label="Background Check" value={member.background_check} />
          </CardContent>
        </Card>

        {chapterData && (
          <Card>
            <CardHeader><CardTitle className="text-base">Chapter Data</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              <Field label="Payment Method" value={chapterData.chapter_payment_method} />
              <Field label="Payment Notes" value={chapterData.chapter_payment_notes} />
              <Field label="Application Status" value={chapterData.application_status} />
              <Field label="Pending Roster Update" value={chapterData.pending_roster_update} />
              <Field label="Internal Notes" value={chapterData.internal_notes} />
              <Field label="Volunteer Notes" value={chapterData.volunteer_notes} />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
