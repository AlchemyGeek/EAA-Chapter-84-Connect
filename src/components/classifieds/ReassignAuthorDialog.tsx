import { useState } from "react";
import { Search, UserCog } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  useReassignClassifiedAuthor,
  useRosterSearch,
  type RosterSearchResult,
} from "@/lib/classifieds/api";

interface Props {
  classifiedId: string;
  currentAuthorName: string;
  currentAuthorKeyId: number;
}

export function ReassignAuthorDialog({
  classifiedId,
  currentAuthorName,
  currentAuthorKeyId,
}: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<RosterSearchResult | null>(null);
  const { data: results = [], isFetching } = useRosterSearch(search, open);
  const reassign = useReassignClassifiedAuthor();

  const reset = () => {
    setSearch("");
    setSelected(null);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <UserCog className="h-4 w-4" /> Change author
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Post on behalf of another member</DialogTitle>
          <DialogDescription>
            Reassign this listing's owner. Contact info and ownership will be
            updated to the selected member. Current author:{" "}
            <strong>{currentAuthorName}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              autoFocus
              placeholder="Search by name, EAA #, or email…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                if (selected) setSelected(null);
              }}
              className="pl-9"
            />
          </div>

          {!selected && search.trim().length >= 2 && (
            <div className="border rounded-md divide-y max-h-64 overflow-y-auto">
              {isFetching && (
                <div className="px-3 py-2 text-sm text-muted-foreground">
                  Searching…
                </div>
              )}
              {!isFetching && results.length === 0 && (
                <div className="px-3 py-2 text-sm text-muted-foreground">
                  No active members found.
                </div>
              )}
              {results.map((m) => (
                <button
                  key={m.key_id}
                  type="button"
                  className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors flex justify-between items-center gap-2"
                  onClick={() => {
                    setSelected(m);
                    setSearch(`${m.first_name ?? ""} ${m.last_name ?? ""}`.trim());
                  }}
                >
                  <span className="font-medium">
                    {m.last_name}, {m.first_name}
                    {m.nickname ? ` (${m.nickname})` : ""}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {m.eaa_number ? `EAA #${m.eaa_number}` : m.email}
                  </span>
                </button>
              ))}
            </div>
          )}

          {selected && (
            <div className="rounded-md border bg-muted/40 p-3 text-sm">
              <div className="font-medium">
                {selected.first_name} {selected.last_name}
              </div>
              <div className="text-muted-foreground text-xs">
                {selected.email} {selected.eaa_number ? `· EAA #${selected.eaa_number}` : ""}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setOpen(false);
              reset();
            }}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={
              !selected ||
              selected.key_id === currentAuthorKeyId ||
              reassign.isPending
            }
            onClick={async () => {
              if (!selected) return;
              try {
                await reassign.mutateAsync({
                  id: classifiedId,
                  keyId: selected.key_id,
                });
                toast.success(
                  `Listing reassigned to ${selected.first_name} ${selected.last_name}.`,
                );
                setOpen(false);
                reset();
              } catch (err: unknown) {
                const msg =
                  err instanceof Error ? err.message : "Failed to reassign";
                toast.error(msg);
              }
            }}
          >
            {reassign.isPending ? "Reassigning…" : "Reassign"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
