import { useState } from "react";
import { Link } from "react-router-dom";
import { Phone, X } from "lucide-react";
import type { CurrentMember } from "@/lib/classifieds/api";

const KEY = "classifieds-phone-nudge-dismissed";

export function PhoneNudgeBanner({ member }: { member: CurrentMember | null | undefined }) {
  const [dismissed, setDismissed] = useState(
    typeof window !== "undefined" && sessionStorage.getItem(KEY) === "1",
  );
  if (!member || dismissed) return null;
  const phoneOnFile = !!member.cell_phone;
  const phoneVisible =
    phoneOnFile && !member.cell_phone_private && member.contact_visible_in_directory;
  if (phoneVisible) return null;

  const dismiss = () => {
    sessionStorage.setItem(KEY, "1");
    setDismissed(true);
  };

  return (
    <div className="mb-4 flex items-start gap-3 rounded-md border bg-muted/30 px-4 py-3 text-sm">
      <Phone className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="flex-1">
        <p className="text-foreground">
          Want buyers to see your phone number? Make sure your phone number is in the Member Directory and your visibility is set to Yes.
        </p>
        <Link
          to={`/directory/${member.key_id}`}
          className="mt-1 inline-block text-primary hover:underline"
        >
          Update my profile →
        </Link>
      </div>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={dismiss}
        className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
