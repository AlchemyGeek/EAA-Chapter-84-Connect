import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DISCLAIMER_FULL } from "@/lib/classifieds/types";

export function DisclaimerModal({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Classifieds Disclaimer</DialogTitle>
        </DialogHeader>
        <DialogDescription className="text-sm leading-relaxed text-foreground">
          {DISCLAIMER_FULL}
        </DialogDescription>
      </DialogContent>
    </Dialog>
  );
}
