import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: (months: 1 | 2 | 3) => void;
}

export function RenewDialog({ open, onOpenChange, onConfirm }: Props) {
  const [months, setMonths] = useState<1 | 2 | 3>(2);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Renew listing</DialogTitle>
          <DialogDescription>
            Choose how long to extend this listing. The new expiration is calculated from today.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMonths(m as 1 | 2 | 3)}
              className={`rounded-md border px-3 py-3 text-sm transition-colors ${
                months === m
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background hover:bg-muted"
              }`}
            >
              {m} month{m === 1 ? "" : "s"}
            </button>
          ))}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={() => {
              onConfirm(months);
              onOpenChange(false);
            }}
          >
            Renew for {months} month{months === 1 ? "" : "s"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
