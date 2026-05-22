import { useState } from "react";
import { DISCLAIMER_SHORT } from "@/lib/classifieds/types";
import { DisclaimerModal } from "./DisclaimerModal";

export function DisclaimerBar() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <p className="text-xs text-muted-foreground">
        {DISCLAIMER_SHORT}{" "}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="underline underline-offset-2 hover:text-foreground"
        >
          Read full disclaimer →
        </button>
      </p>
      <DisclaimerModal open={open} onOpenChange={setOpen} />
    </>
  );
}
