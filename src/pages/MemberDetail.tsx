import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Pencil, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { toast } from "sonner";

type FieldConfig = {
  label: string;
  key: string;
  type?: "text" | "date" | "boolean" | "textarea";
  table?: "roster" | "chapter";
};

const PERSONAL_FIELDS: FieldConfig[] = [
  { label: "First Name", key: "first_name" },
  { label: "Last Name", key: "last_name" },
  { label: "Nickname", key: "nickname" },
  { label: "Gender", key: "gender" },
  { label: "Spouse", key: "spouse" },
  { label: "Birth Date", key: "birth_date", type: "date" },
];

const CONTACT_FIELDS: FieldConfig[] = [
  { label: "Email", key: "email" },
  { label: "Home Phone", key: "home_phone" },
  { label: "Cell Phone", key: "cell_phone" },
  { label: "Street Address 1", key: "street_address_1" },
  { label: "Street Address 2", key: "street_address_2" },
  { label: "City", key: "preferred_city" },
  { label: "State", key: "preferred_state" },
  { label: "Zip", key: "zip_code" },
  { label: "Country", key: "country" },
];

const MEMBERSHIP_FIELDS: FieldConfig[] = [
  { label: "Member Type", key: "member_type" },
  { label: "Standing", key: "current_standing" },
  { label: "Expiration", key: "expiration_date", type: "date" },
  { label: "EAA Expiration", key: "eaa_expiration", type: "date" },
  { label: "Joined", key: "current_joined_on_date", type: "date" },
  { label: "Date Added", key: "date_added", type: "date" },
  { label: "Date Updated", key: "date_updated", type: "date" },
];

const AVIATION_FIELDS: FieldConfig[] = [
  { label: "Ratings", key: "ratings" },
  { label: "Aircraft Owned", key: "aircraft_owned" },
  { label: "Aircraft Project", key: "aircraft_project" },
  { label: "Aircraft Built", key: "aircraft_built" },
  { label: "IMC Club", key: "imc", type: "boolean" },
  { label: "VMC Club", key: "vmc", type: "boolean" },
  { label: "Young Eagle Pilot", key: "young_eagle_pilot", type: "boolean" },
  { label: "Young Eagle Volunteer", key: "young_eagle_volunteer", type: "boolean" },
  { label: "Eagle Pilot", key: "eagle_pilot", type: "boolean" },
  { label: "Eagle Flight Volunteer", key: "eagle_flight_volunteer", type: "boolean" },
];

const COMPLIANCE_FIELDS: FieldConfig[] = [
  { label: "Youth Protection", key: "youth_protection" },
  { label: "Background Check", key: "background_check" },
];

const CHAPTER_FIELDS: FieldConfig[] = [
  { label: "Payment Method", key: "chapter_payment_method", table: "chapter" },
  { label: "Payment Notes", key: "chapter_payment_notes", table: "chapter", type: "textarea" },
  { label: "Application Status", key: "application_status", table: "chapter" },
  { label: "Pending Roster Update", key: "pending_roster_update", table: "chapter", type: "boolean" },
  { label: "Internal Notes", key: "internal_notes", table: "chapter", type: "textarea" },
  { label: "Volunteer Notes", key: "volunteer_notes", table: "chapter", type: "textarea" },
];

function ReadOnlyField({ label, value }: { label: string; value: any }) {
  const display = value == null || value === "" ? "—" : value === true ? "Yes" : value === false ? "No" : String(value);
  return (
    <div>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-base font-medium">{display}</dd>
    </div>
  );
}

function EditableField({
  field,
  value,
  onChange,
}: {
  field: FieldConfig;
  value: any;
  onChange: (key: string, val: any) => void;
}) {
  if (field.type === "boolean") {
    return (
      <div className="flex items-center gap-3">
        <Switch
          id={field.key}
          checked={!!value}
          onCheckedChange={(checked) => onChange(field.key, checked)}
        />
        <Label htmlFor={field.key} className="text-sm">{field.label}</Label>
      </div>
    );
  }

  if (field.type === "textarea") {
    return (
      <div className="col-span-2">
        <Label htmlFor={field.key} className="text-sm text-muted-foreground">{field.label}</Label>
        <Textarea
          id={field.key}
          value={value ?? ""}
          onChange={(e) => onChange(field.key, e.target.value)}
          className="mt-1"
          rows={3}
        />
      </div>
    );
  }

  return (
    <div>
      <Label htmlFor={field.key} className="text-sm text-muted-foreground">{field.label}</Label>
      <Input
        id={field.key}
        type={field.type === "date" ? "date" : "text"}
        value={value ?? ""}
        onChange={(e) => onChange(field.key, e.target.value)}
        className="mt-1"
      />
    </div>
  );
}

function FieldSection({
  title,
  fields,
  data,
  editing,
  editData,
  onChange,
}: {
  title: string;
  fields: FieldConfig[];
  data: Record<string, any>;
  editing: boolean;
  editData: Record<string, any>;
  onChange: (key: string, val: any) => void;
}) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent className="grid grid-cols-2 gap-4">
        {fields.map((field) => {
          const val = editing ? editData[field.key] : data[field.key];
          return editing ? (
            <EditableField key={field.key} field={field} value={val} onChange={onChange} />
          ) : (
            <ReadOnlyField key={field.key} label={field.label} value={data[field.key]} />
          );
        })}
      </CardContent>
    </Card>
  );
}

export default function MemberDetail() {
  const { keyId } = useParams();
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [editRoster, setEditRoster] = useState<Record<string, any>>({});
  const [editChapter, setEditChapter] = useState<Record<string, any>>({});

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

  const saveMutation = useMutation({
    mutationFn: async () => {
      // Save roster fields
      const { error: rosterError } = await supabase
        .from("roster_members")
        .update(editRoster)
        .eq("key_id", Number(keyId));
      if (rosterError) throw rosterError;

      // Save chapter data (upsert)
      const chapterPayload = { ...editChapter, key_id: Number(keyId) };
      const { error: chapterError } = await supabase
        .from("member_chapter_data")
        .upsert(chapterPayload, { onConflict: "key_id" });
      if (chapterError) throw chapterError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["member", keyId] });
      queryClient.invalidateQueries({ queryKey: ["chapter-data", keyId] });
      setEditing(false);
      toast.success("Member updated successfully");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to save changes");
    },
  });

  const startEditing = () => {
    // Initialize edit state from current data
    const rosterFields = [
      ...PERSONAL_FIELDS, ...CONTACT_FIELDS, ...MEMBERSHIP_FIELDS,
      ...AVIATION_FIELDS, ...COMPLIANCE_FIELDS,
    ];
    const rosterInit: Record<string, any> = {};
    rosterFields.forEach((f) => {
      rosterInit[f.key] = member?.[f.key as keyof typeof member] ?? null;
    });
    setEditRoster(rosterInit);

    const chapterInit: Record<string, any> = {};
    CHAPTER_FIELDS.forEach((f) => {
      chapterInit[f.key] = chapterData?.[f.key as keyof typeof chapterData] ?? null;
    });
    setEditChapter(chapterInit);

    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
    setEditRoster({});
    setEditChapter({});
  };

  const handleChange = (key: string, val: any, table?: string) => {
    if (table === "chapter") {
      setEditChapter((prev) => ({ ...prev, [key]: val === "" ? null : val }));
    } else {
      setEditRoster((prev) => ({ ...prev, [key]: val === "" ? null : val }));
    }
  };

  if (isLoading) return <div className="p-6 text-muted-foreground">Loading...</div>;
  if (!member) return <div className="p-6">Member not found.</div>;

  const chapterDisplayData = chapterData || {};

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/members"><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl md:text-2xl font-bold">{member.first_name} {member.last_name}</h1>
          <p className="text-sm text-muted-foreground">EAA #{member.eaa_number} · Key ID {member.key_id}</p>
        </div>
        <Badge variant="secondary" className="shrink-0">{member.member_type}</Badge>
      </div>

      {isAdmin && (
        <div className="flex gap-2">
          {editing ? (
            <>
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="min-h-[44px]">
                <Save className="h-4 w-4 mr-2" />
                {saveMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
              <Button variant="outline" onClick={cancelEditing} disabled={saveMutation.isPending} className="min-h-[44px]">
                <X className="h-4 w-4 mr-2" /> Cancel
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={startEditing} className="min-h-[44px]">
              <Pencil className="h-4 w-4 mr-2" /> Edit Member
            </Button>
          )}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4 md:gap-6">
        <FieldSection
          title="Personal"
          fields={PERSONAL_FIELDS}
          data={member}
          editing={editing}
          editData={editRoster}
          onChange={(k, v) => handleChange(k, v)}
        />
        <FieldSection
          title="Contact"
          fields={CONTACT_FIELDS}
          data={member}
          editing={editing}
          editData={editRoster}
          onChange={(k, v) => handleChange(k, v)}
        />
        <FieldSection
          title="Membership"
          fields={MEMBERSHIP_FIELDS}
          data={member}
          editing={editing}
          editData={editRoster}
          onChange={(k, v) => handleChange(k, v)}
        />
        <FieldSection
          title="Aviation"
          fields={AVIATION_FIELDS}
          data={member}
          editing={editing}
          editData={editRoster}
          onChange={(k, v) => handleChange(k, v)}
        />
        <FieldSection
          title="Compliance"
          fields={COMPLIANCE_FIELDS}
          data={member}
          editing={editing}
          editData={editRoster}
          onChange={(k, v) => handleChange(k, v)}
        />
        <FieldSection
          title="Chapter Data"
          fields={CHAPTER_FIELDS}
          data={chapterDisplayData}
          editing={editing}
          editData={editChapter}
          onChange={(k, v) => handleChange(k, v, "chapter")}
        />
      </div>
    </div>
  );
}
