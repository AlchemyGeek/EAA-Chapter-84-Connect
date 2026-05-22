import { DISCLAIMER_FULL } from "@/lib/classifieds/types";

export function DisclaimerCallout() {
  return (
    <div className="rounded-md border bg-muted/40 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
      {DISCLAIMER_FULL}
    </div>
  );
}
