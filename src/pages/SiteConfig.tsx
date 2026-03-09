import { useState } from "react";
import { ChapterLeadership } from "@/components/admin/ChapterLeadership";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Navigate, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  GripVertical,
  ExternalLink,
  Link as LinkIcon,
  CircleDollarSign,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface SiteLink {
  id: string;
  name: string;
  url: string;
  sort_order: number;
}

interface ChapterFee {
  id: string;
  name: string;
  amount: number;
  payment_url: string | null;
  sort_order: number;
}

export default function SiteConfig() {
  const { user, loading: authLoading, isAdmin } = useAuth();
  const queryClient = useQueryClient();

  // Link state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<SiteLink | null>(null);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");

  // Fee state
  const [feeDialogOpen, setFeeDialogOpen] = useState(false);
  const [editingFee, setEditingFee] = useState<ChapterFee | null>(null);
  const [feeName, setFeeName] = useState("");
  const [feeAmount, setFeeAmount] = useState("");

  const { data: links = [], isLoading } = useQuery({
    queryKey: ["site-links"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_links")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data as SiteLink[];
    },
  });

  const { data: fees = [], isLoading: feesLoading } = useQuery({
    queryKey: ["chapter-fees"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chapter_fees" as any)
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return (data as any[]) as ChapterFee[];
    },
  });

  // === Link mutations ===
  const saveMutation = useMutation({
    mutationFn: async () => {
      const trimmedName = name.trim();
      const trimmedUrl = url.trim();
      if (!trimmedName || !trimmedUrl) throw new Error("Name and URL are required");

      if (editingLink) {
        const { error } = await supabase
          .from("site_links")
          .update({ name: trimmedName, url: trimmedUrl })
          .eq("id", editingLink.id);
        if (error) throw error;
      } else {
        const maxOrder = links.length > 0 ? Math.max(...links.map((l) => l.sort_order)) : -1;
        const { error } = await supabase
          .from("site_links")
          .insert({ name: trimmedName, url: trimmedUrl, sort_order: maxOrder + 1 });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["site-links"] });
      closeDialog();
      toast({ title: editingLink ? "Link updated" : "Link added" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("site_links").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["site-links"] });
      toast({ title: "Link deleted" });
    },
  });

  // === Fee mutations ===
  const saveFeeMutation = useMutation({
    mutationFn: async () => {
      const trimmedName = feeName.trim();
      const amt = parseFloat(feeAmount);
      if (!trimmedName) throw new Error("Name is required");
      if (isNaN(amt) || amt < 0) throw new Error("Valid amount is required");

      if (editingFee) {
        const { error } = await supabase
          .from("chapter_fees" as any)
          .update({ name: trimmedName, amount: amt } as any)
          .eq("id", editingFee.id);
        if (error) throw error;
      } else {
        const maxOrder = fees.length > 0 ? Math.max(...fees.map((f) => f.sort_order)) : -1;
        const { error } = await supabase
          .from("chapter_fees" as any)
          .insert({ name: trimmedName, amount: amt, sort_order: maxOrder + 1 } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chapter-fees"] });
      closeFeeDialog();
      toast({ title: editingFee ? "Fee updated" : "Fee added" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteFeeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("chapter_fees" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chapter-fees"] });
      toast({ title: "Fee deleted" });
    },
  });

  // === Link dialog helpers ===
  const openAdd = () => {
    setEditingLink(null);
    setName("");
    setUrl("");
    setDialogOpen(true);
  };

  const openEdit = (link: SiteLink) => {
    setEditingLink(link);
    setName(link.name);
    setUrl(link.url);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingLink(null);
    setName("");
    setUrl("");
  };

  // === Fee dialog helpers ===
  const openAddFee = () => {
    setEditingFee(null);
    setFeeName("");
    setFeeAmount("");
    setFeeDialogOpen(true);
  };

  const openEditFee = (fee: ChapterFee) => {
    setEditingFee(fee);
    setFeeName(fee.name);
    setFeeAmount(String(fee.amount));
    setFeeDialogOpen(true);
  };

  const closeFeeDialog = () => {
    setFeeDialogOpen(false);
    setEditingFee(null);
    setFeeName("");
    setFeeAmount("");
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user || !isAdmin) return <Navigate to="/home" replace />;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/home">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <h1 className="text-xl font-bold tracking-tight">Website Configuration</h1>
        </div>

        {/* Site Links Section */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <LinkIcon className="h-4 w-4 text-secondary" />
                Site Links
              </CardTitle>
              <Button size="sm" onClick={openAdd} className="h-8">
                <Plus className="h-4 w-4 mr-1" />
                Add Link
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Manage links displayed to members across the site.
            </p>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-sm text-muted-foreground animate-pulse py-4">Loading links...</div>
            ) : links.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">
                No links configured yet. Click "Add Link" to get started.
              </p>
            ) : (
              <div className="divide-y divide-border">
                {links.map((link) => (
                  <div key={link.id} className="flex items-center gap-3 py-2.5 group">
                    <GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{link.name}</p>
                      <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                        <ExternalLink className="h-3 w-3 shrink-0" />
                        {link.url}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(link)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => deleteMutation.mutate(link.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Fees Section */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <CircleDollarSign className="h-4 w-4 text-secondary" />
                Fees
              </CardTitle>
              <Button size="sm" onClick={openAddFee} className="h-8">
                <Plus className="h-4 w-4 mr-1" />
                Add Fee
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Define fee names and amounts referenced across the site.
            </p>
          </CardHeader>
          <CardContent>
            {feesLoading ? (
              <div className="text-sm text-muted-foreground animate-pulse py-4">Loading fees...</div>
            ) : fees.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">
                No fees configured yet. Click "Add Fee" to get started.
              </p>
            ) : (
              <div className="divide-y divide-border">
                {fees.map((fee) => (
                  <div key={fee.id} className="flex items-center gap-3 py-2.5 group">
                    <GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{fee.name}</p>
                    </div>
                    <span className="text-sm font-semibold tabular-nums">
                      ${Number(fee.amount).toFixed(2)}
                    </span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditFee(fee)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => deleteFeeMutation.mutate(fee.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Chapter Leadership Section */}
        <ChapterLeadership />
      </div>

      {/* Add/Edit Link Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingLink ? "Edit Link" : "Add Link"}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveMutation.mutate();
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="link-name">Name</Label>
              <Input
                id="link-name"
                placeholder="e.g. Chapter Website"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="link-url">URL</Label>
              <Input
                id="link-url"
                type="url"
                placeholder="https://..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                maxLength={500}
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Fee Dialog */}
      <Dialog open={feeDialogOpen} onOpenChange={setFeeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingFee ? "Edit Fee" : "Add Fee"}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveFeeMutation.mutate();
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="fee-name">Fee Name</Label>
              <Input
                id="fee-name"
                placeholder="e.g. Annual Membership Dues"
                value={feeName}
                onChange={(e) => setFeeName(e.target.value)}
                maxLength={100}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fee-amount">Amount ($)</Label>
              <Input
                id="fee-amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="25.00"
                value={feeAmount}
                onChange={(e) => setFeeAmount(e.target.value)}
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={closeFeeDialog}>
                Cancel
              </Button>
              <Button type="submit" disabled={saveFeeMutation.isPending}>
                {saveFeeMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
