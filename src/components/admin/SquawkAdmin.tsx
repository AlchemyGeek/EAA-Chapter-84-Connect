import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Megaphone, ChevronRight, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { SquawkEntry, SquawkEntryType } from "@/lib/squawk/types";

type ExpiryOption = { label: string; days: number };
const EXPIRY_OPTIONS: ExpiryOption[] = [
  { label: "1 week", days: 7 },
  { label: "2 weeks", days: 14 },
  { label: "4 weeks", days: 28 },
  { label: "2 months", days: 60 },
  { label: "3 months", days: 90 },
  { label: "6 months", days: 180 },
];

export function SquawkAdmin() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SquawkEntry | null>(null);
  const [type, setType] = useState<SquawkEntryType>("announcement");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [link, setLink] = useState("");
  const [expiryDays, setExpiryDays] = useState<number>(14);

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["squawk-entries-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("squawk_entries" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return ((data ?? []) as unknown) as SquawkEntry[];
    },
  });

  const resetForm = () => {
    setEditing(null);
    setType("announcement");
    setTitle("");
    setMessage("");
    setLink("");
    setExpiryDays(14);
  };

  const openAdd = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (e: SquawkEntry) => {
    setEditing(e);
    setType(e.type);
    setTitle(e.title);
    setMessage(e.message);
    setLink(e.link ?? "");
    // Compute remaining days from now (fallback to 14)
    const remaining = Math.max(
      1,
      Math.round((new Date(e.expires_at).getTime() - Date.now()) / (24 * 60 * 60 * 1000)),
    );
    const bestFit = EXPIRY_OPTIONS.reduce((best, opt) =>
      Math.abs(opt.days - remaining) < Math.abs(best.days - remaining) ? opt : best,
    );
    setExpiryDays(bestFit.days);
    setDialogOpen(true);
  };

  const save = useMutation({
    mutationFn: async () => {
      const t = title.trim();
      const m = message.trim();
      if (!t) throw new Error("Title is required");
      if (t.length > 80) throw new Error("Title too long (max 80 chars)");
      if (m.length > 200) throw new Error("Message too long (max 200 chars)");
      const expires = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString();
      const payload = {
        type,
        title: t,
        message: m,
        link: link.trim() || null,
        expires_at: expires,
      };

      if (editing) {
        const { error } = await supabase
          .from("squawk_entries" as any)
          .update(payload as any)
          .eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("squawk_entries" as any)
          .insert({ ...payload, created_by: user?.id ?? null } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["squawk-entries-admin"] });
      queryClient.invalidateQueries({ queryKey: ["squawk"] });
      toast({ title: editing ? "Squawk updated" : "Squawk added" });
      setDialogOpen(false);
      resetForm();
    },
    onError: (err: Error) => {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("squawk_entries" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["squawk-entries-admin"] });
      queryClient.invalidateQueries({ queryKey: ["squawk"] });
      toast({ title: "Squawk deleted" });
    },
  });

  const isExpired = (e: SquawkEntry) => new Date(e.expires_at) < new Date();

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-2 cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-90" : ""}`} />
                <Megaphone className="h-4 w-4 text-secondary" />
                Squawk Announcements
              </CardTitle>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-muted-foreground">
                Announcements and "What's New" items shown in the homepage Squawk carousel.
              </p>
              <Button size="sm" onClick={openAdd} className="h-8">
                <Plus className="h-4 w-4 mr-1" />
                Add Squawk
              </Button>
            </div>
            {isLoading ? (
              <div className="text-sm text-muted-foreground animate-pulse py-4">Loading…</div>
            ) : entries.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">No squawks yet.</p>
            ) : (
              <div className="divide-y divide-border">
                {entries.map((e) => (
                  <div key={e.id} className={`flex items-start gap-3 py-2.5 group ${isExpired(e) ? "opacity-50" : ""}`}>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          {e.type === "announcement" ? "Announcement" : "What's New"}
                        </span>
                        {isExpired(e) && (
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-destructive">
                            Expired
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium truncate">{e.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">{e.message}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Expires {new Date(e.expires_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(e)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => del.mutate(e.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Squawk" : "Add Squawk"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as SquawkEntryType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="announcement">Announcement</SelectItem>
                  <SelectItem value="whats_new">What's New</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Title <span className="text-muted-foreground">({title.length}/80)</span></Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} />
            </div>
            <div>
              <Label className="text-xs">Message <span className="text-muted-foreground">({message.length}/200)</span></Label>
              <Textarea value={message} onChange={(e) => setMessage(e.target.value)} maxLength={200} rows={3} />
            </div>
            <div>
              <Label className="text-xs">Link (optional)</Label>
              <Input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://… or /internal-path" />
            </div>
            <div>
              <Label className="text-xs">Expires in</Label>
              <Select value={String(expiryDays)} onValueChange={(v) => setExpiryDays(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EXPIRY_OPTIONS.map((o) => (
                    <SelectItem key={o.days} value={String(o.days)}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              {editing ? "Save" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Collapsible>
  );
}
