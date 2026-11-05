import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronRight, BookMarked, Plus, Pencil, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export type ResourceCategory = "chapter" | "national";
export interface ResourceLink {
  id: string;
  name: string;
  url: string;
  description: string | null;
  category: ResourceCategory;
  sort_order: number;
}

export const RESOURCE_CATEGORIES: { value: ResourceCategory; label: string }[] = [
  { value: "chapter", label: "Chapter" },
  { value: "national", label: "National" },
];

export function ResourceLinksAdmin({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(defaultOpen);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ResourceLink | null>(null);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<ResourceCategory>("chapter");

  const { data: links = [], isLoading } = useQuery({
    queryKey: ["resource-links"],
    queryFn: async () => {
      const { data, error } = await supabase.from("resource_links").select("*").order("sort_order");
      if (error) throw error;
      return data as ResourceLink[];
    },
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["resource-links"] });

  const openAdd = (cat: ResourceCategory) => {
    setEditing(null); setName(""); setUrl(""); setDescription(""); setCategory(cat); setDialogOpen(true);
  };
  const openEdit = (l: ResourceLink) => {
    setEditing(l); setName(l.name); setUrl(l.url); setDescription(l.description ?? ""); setCategory(l.category); setDialogOpen(true);
  };

  const save = useMutation({
    mutationFn: async () => {
      const n = name.trim();
      let u = url.trim();
      if (!n || !u) throw new Error("Name and web address are required");
      if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
      const payload = { name: n, url: u, description: description.trim() || null, category };
      if (editing) {
        const changedCat = editing.category !== category;
        const extra = changedCat ? { sort_order: nextOrder(category) } : {};
        const { error } = await supabase.from("resource_links").update({ ...payload, ...extra }).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("resource_links").insert({ ...payload, sort_order: nextOrder(category) });
        if (error) throw error;
      }
    },
    onSuccess: () => { refresh(); setDialogOpen(false); toast({ title: editing ? "Resource updated" : "Resource added" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("resource_links").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { refresh(); toast({ title: "Resource deleted" }); },
  });

  const move = useMutation({
    mutationFn: async ({ a, b }: { a: ResourceLink; b: ResourceLink }) => {
      const r1 = await supabase.from("resource_links").update({ sort_order: b.sort_order }).eq("id", a.id);
      if (r1.error) throw r1.error;
      const r2 = await supabase.from("resource_links").update({ sort_order: a.sort_order }).eq("id", b.id);
      if (r2.error) throw r2.error;
    },
    onSuccess: refresh,
  });

  function nextOrder(cat: ResourceCategory) {
    const inCat = links.filter((l) => l.category === cat);
    return inCat.length ? Math.max(...inCat.map((l) => l.sort_order)) + 1 : 0;
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-2 cursor-pointer hover:bg-muted/50 transition-colors">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-90" : ""}`} />
              <BookMarked className="h-4 w-4 text-secondary" />
              Resources
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 space-y-5">
            <p className="text-xs text-muted-foreground">
              Websites shown to members on the Resources page, grouped as Chapter and National.
            </p>
            {isLoading ? (
              <div className="text-sm text-muted-foreground animate-pulse">Loading…</div>
            ) : (
              RESOURCE_CATEGORIES.map((cat) => {
                const items = links.filter((l) => l.category === cat.value).sort((a, b) => a.sort_order - b.sort_order);
                return (
                  <div key={cat.value}>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-semibold">{cat.label}</h3>
                      <Button size="sm" variant="outline" className="h-9" onClick={() => openAdd(cat.value)}>
                        <Plus className="h-4 w-4 mr-1" /> Add
                      </Button>
                    </div>
                    {items.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-2">No {cat.label.toLowerCase()} resources yet.</p>
                    ) : (
                      <div className="divide-y divide-border border-[0.5px] border-border rounded-md">
                        {items.map((l, i) => (
                          <div key={l.id} className="flex items-center gap-2 px-2 py-2">
                            <div className="flex flex-col">
                              <Button variant="ghost" size="icon" className="h-7 w-7" disabled={i === 0 || move.isPending}
                                aria-label="Move up" onClick={() => move.mutate({ a: l, b: items[i - 1] })}>
                                <ArrowUp className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7" disabled={i === items.length - 1 || move.isPending}
                                aria-label="Move down" onClick={() => move.mutate({ a: l, b: items[i + 1] })}>
                                <ArrowDown className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium truncate">{l.name}</p>
                              {l.description && <p className="text-xs text-muted-foreground line-clamp-2">{l.description}</p>}
                              <p className="text-xs text-muted-foreground truncate">{l.url}</p>
                            </div>
                            <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="Edit" onClick={() => openEdit(l)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive hover:text-destructive" aria-label="Delete"
                              onClick={() => { if (confirm(`Delete "${l.name}"?`)) remove.mutate(l.id); }}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit Resource" : "Add Resource"}</DialogTitle></DialogHeader>
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
            <div className="space-y-1.5">
              <Label htmlFor="res-name">Name</Label>
              <Input id="res-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="EAA Webinars" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="res-url">Web address</Label>
              <Input id="res-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.eaa.org/webinars" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="res-desc">Short description</Label>
              <Textarea id="res-desc" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What members will find there" />
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as ResourceCategory)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RESOURCE_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={save.isPending}>{editing ? "Save" : "Add"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Collapsible>
  );
}
