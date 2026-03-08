import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Plane,
  Wrench,
  Award,
  Camera,
  Globe,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

function getPublicUrl(path: string) {
  return `${SUPABASE_URL}/storage/v1/object/public/member-images/${path}`;
}

export default function MemberProfile() {
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const { keyId } = useParams();

  const { data: member, isLoading: memberLoading } = useQuery({
    queryKey: ["directory-member", keyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("roster_members")
        .select(
          "key_id, first_name, last_name, nickname, eaa_number, member_type, current_standing, email, cell_phone, home_phone, street_address_1, street_address_2, preferred_city, preferred_state, zip_code, country, ratings, aircraft_owned, aircraft_project, aircraft_built, young_eagle_pilot, young_eagle_volunteer, eagle_pilot, eagle_flight_volunteer, imc, vmc"
        )
        .eq("key_id", Number(keyId))
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: chapterData } = useQuery({
    queryKey: ["directory-chapter-data", keyId],
    enabled: !!keyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("member_chapter_data")
        .select("contact_visible_in_directory, aviation_visible_in_directory, volunteering_visible_in_directory")
        .eq("key_id", Number(keyId))
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: images = [] } = useQuery({
    queryKey: ["directory-member-images", keyId],
    enabled: !!keyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("member_images")
        .select("id, storage_path, caption, sort_order")
        .eq("key_id", Number(keyId))
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const contactVisible = chapterData?.contact_visible_in_directory ?? true;
  const aviationVisible = chapterData?.aviation_visible_in_directory ?? true;
  const volunteeringVisible = (chapterData as any)?.volunteering_visible_in_directory ?? true;

  if (memberLoading) {
    return (
      <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
  }

  if (!member) {
    return (
      <div className="p-6 text-center space-y-4">
        <p className="text-muted-foreground">Member not found.</p>
        <Button variant="outline" asChild>
          <Link to="/members">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Directory
          </Link>
        </Button>
      </div>
    );
  }

  const fullName = `${member.first_name || ""}${member.nickname?.trim() ? ` "${member.nickname}"` : ""} ${member.last_name || ""}`.trim();

  const address = [
    member.street_address_1,
    member.street_address_2,
    [member.preferred_city, member.preferred_state].filter(Boolean).join(", "),
    member.zip_code,
  ]
    .filter(Boolean)
    .join(", ");

  const volunteerBadges = [
    member.young_eagle_pilot && "Young Eagle Pilot",
    member.young_eagle_volunteer && "Young Eagle Volunteer",
    member.eagle_pilot && "Eagle Pilot",
    member.eagle_flight_volunteer && "Eagle Flight Volunteer",
  ].filter(Boolean) as string[];

  const hasContactInfo = member.email || member.cell_phone || member.home_phone || address;
  const hasAviationInfo = member.ratings || member.aircraft_owned || member.aircraft_project || member.aircraft_built;

  return (
    <div className="min-h-screen bg-background">
      {/* Hero banner */}
      <div className="bg-primary">
        <div className="max-w-3xl mx-auto px-4 pt-4 pb-8">
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10 mb-4 -ml-2"
          >
            <Link to="/members">
              <ArrowLeft className="h-4 w-4 mr-1.5" /> Directory
            </Link>
          </Button>

          <div className="min-w-0">
            <h1 className="text-xl md:text-2xl font-bold text-primary-foreground truncate">
              {fullName}
            </h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-primary-foreground/60 text-sm">
                EAA #{member.eaa_number || "—"}
              </span>
              <Badge className="bg-primary-foreground/15 text-primary-foreground border-0 text-xs">
                {member.member_type || "Member"}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 -mt-3 pb-10 space-y-4">
        {/* Photo gallery */}
        {images.length > 0 && (
          <Card className="overflow-hidden">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-2">
                <Camera className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Photos
                </span>
              </div>
              <div className={`grid gap-2 ${images.length === 1 ? "grid-cols-1 max-w-xs" : images.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
                {images.map((img) => (
                  <button
                    key={img.id}
                    onClick={() => setLightboxUrl(getPublicUrl(img.storage_path))}
                    className="rounded-lg overflow-hidden bg-muted aspect-square cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <img
                      src={getPublicUrl(img.storage_path)}
                      alt={img.caption || "Member photo"}
                      className="h-full w-full object-cover hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Photo lightbox */}
        <Dialog open={!!lightboxUrl} onOpenChange={() => setLightboxUrl(null)}>
          <DialogContent className="max-w-3xl p-2 bg-black/90 border-0">
            {lightboxUrl && (
              <img
                src={lightboxUrl}
                alt="Enlarged photo"
                className="w-full h-auto max-h-[80vh] object-contain rounded"
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Contact Information */}
        {contactVisible && hasContactInfo && (
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <Phone className="h-4 w-4 text-secondary" />
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Contact
                </h2>
              </div>
              <div className="space-y-3">
                {member.email && (
                  <InfoRow icon={Mail} label="Email">
                    <a
                      href={`mailto:${member.email}`}
                      className="text-secondary hover:underline"
                    >
                      {member.email}
                    </a>
                  </InfoRow>
                )}
                {member.cell_phone && (
                  <InfoRow icon={Phone} label="Cell">
                    <a href={`tel:${member.cell_phone}`} className="text-secondary hover:underline">
                      {member.cell_phone}
                    </a>
                  </InfoRow>
                )}
                {member.home_phone && (
                  <InfoRow icon={Phone} label="Home">
                    {member.home_phone}
                  </InfoRow>
                )}
                {address && (
                  <InfoRow icon={MapPin} label="Location">
                    {address}
                  </InfoRow>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Aviation & Aircraft */}
        {aviationVisible && hasAviationInfo && (
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <Plane className="h-4 w-4 text-secondary" />
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Aviation & Aircraft
                </h2>
              </div>
              <div className="space-y-3">
                {member.ratings && (
                  <InfoRow icon={Award} label="Ratings">
                    {member.ratings}
                  </InfoRow>
                )}
                {member.aircraft_owned && (
                  <InfoRow icon={Plane} label="Owned">
                    {member.aircraft_owned}
                  </InfoRow>
                )}
                {member.aircraft_project && (
                  <InfoRow icon={Wrench} label="Project">
                    {member.aircraft_project}
                  </InfoRow>
                )}
                {member.aircraft_built && (
                  <InfoRow icon={Wrench} label="Built">
                    {member.aircraft_built}
                  </InfoRow>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Volunteering badges */}
        {volunteeringVisible && volunteerBadges.length > 0 && (
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <Globe className="h-4 w-4 text-secondary" />
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  EAA Volunteering
                </h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {volunteerBadges.map((badge) => (
                  <Badge
                    key={badge}
                    variant="secondary"
                    className="text-xs py-1 px-2.5"
                  >
                    {badge}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* No shared info fallback */}
        {!contactVisible && !aviationVisible && images.length === 0 && (!volunteeringVisible || volunteerBadges.length === 0) && (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-sm text-muted-foreground">
                This member hasn't shared additional information in the directory.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Mail;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium break-words">{children}</p>
      </div>
    </div>
  );
}
