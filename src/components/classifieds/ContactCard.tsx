import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Phone } from "lucide-react";
import type { Listing } from "@/lib/classifieds/types";

export function ContactCard({ listing }: { listing: Listing }) {
  const showPhone = listing.authorPhoneVisible && !!listing.authorPhone;
  return (
    <Card className="shadow-none">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Contact seller
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p className="font-medium text-foreground">{listing.authorName}</p>
        <a
          href={`mailto:${listing.authorEmail}`}
          className="flex items-center gap-2 text-primary hover:underline break-all"
        >
          <Mail className="h-4 w-4 shrink-0" />
          {listing.authorEmail}
        </a>
        {showPhone && (
          <a
            href={`tel:${listing.authorPhone}`}
            className="flex items-center gap-2 text-primary hover:underline"
          >
            <Phone className="h-4 w-4 shrink-0" />
            {listing.authorPhone}
          </a>
        )}
      </CardContent>
    </Card>
  );
}
