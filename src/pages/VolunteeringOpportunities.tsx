import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Navigate, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Plus, Search, HandHelping, Users, Pencil, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useIsMobile } from "@/hooks/use-mobile";

type Opportunity = {
  id: string;
  title: string;
  description: string;
  num_volunteers: number;
  status: string;
  created_by_key_id: number;
  created_by_name: string;
  created_at: string;
  updated_at: string;
};

type OpportunityContact = {
  id: string;
  opportunity_id: string;
  key_id: number;
  created_at: string;
};

const STATUS_COLORS: Record<string, string> = {
  Active: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  Closed: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  Completed: "bg-muted text-muted-foreground",
};

export default function VolunteeringOpportunities() {
  const { user, loading: authLoading, isOfficerOrAbove } = useAuth();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpportunity, setEditOpportunity] = useState<Opportunity | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [numVolunteers, setNumVolunteers] = useState("1");
  const [contactSearch, setContactSearch] = useState("");
  const [selectedContacts, setSelectedContacts] = useState<{ key_id: number; name: string }[]>([]);

  // Auth guard
  if (!authLoading && !user) return <Navigate to="/auth" replace />;
  if (!authLoading && user && !isOfficerOrAbove) return <Navigate to="/home" replace />;

  // Fetch my member record for created_by
  const { data: myMember } = useQuery({
    queryKey: ["my-member-for-vol", user?.email],
    enabled: !!user?.email,
    queryFn: async () => {
      const { data } = await supabase
        .from("roster_members")
        .select("key_id, first_name, last_name")
        .eq("email", user!.email!)
        .maybeSingle();
      return data;
    },
  });

  // Fetch opportunities
  const { data: opportunities, isLoading } = useQuery({
    queryKey: ["volunteering-opportunities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("volunteering_opportunities")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Opportunity[];
    },
  });

  // Fetch all contacts
  const { data: allContacts } = useQuery({
    queryKey: ["volunteering-contacts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("volunteering_opportunity_contacts")
        .select("*");
      if (error) throw error;
      return data as OpportunityContact[];
    },
  });

  // Fetch members for contact search
  const { data: membersList } = useQuery({
    queryKey: ["members-for-contact-search"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("roster_members")
        .select("key_id, first_name, last_name")
        .eq("current_standing", "Active")
        .order("last_name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch member names for contacts display
  const contactKeyIds = allContacts?.map((c) => c.key_id) ?? [];
  const { data: contactMembers } = useQuery({
    queryKey: ["contact-member-names", contactKeyIds],
    enabled: contactKeyIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("roster_members")
        .select("key_id, first_name, last_name")
        .in("key_id", contactKeyIds);
      if (error) throw error;
      return data;
    },
  });

  const contactNameMap = new Map(
    (contactMembers ?? []).map((m) => [m.key_id, `${m.first_name ?? ""} ${m.last_name ?? ""}`.trim()])
  );

  const filteredMembers = (membersList ?? []).filter((m) => {
    if (!contactSearch.trim()) return false;
    const name = `${m.first_name ?? ""} ${m.last_name ?? ""}`.toLowerCase();
    return name.includes(contactSearch.toLowerCase());
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!myMember) throw new Error("Cannot determine your member record");
      const { data, error } = await supabase
        .from("volunteering_opportunities")
        .insert({
          title,
          description,
          num_volunteers: parseInt(numVolunteers) || 1,
          created_by_key_id: myMember.key_id,
          created_by_name: `${myMember.first_name ?? ""} ${myMember.last_name ?? ""}`.trim(),
        })
        .select()
        .single();
      if (error) throw error;

      // Insert contacts
      if (selectedContacts.length > 0) {
        const { error: cErr } = await supabase
          .from("volunteering_opportunity_contacts")
          .insert(
            selectedContacts.map((c) => ({
              opportunity_id: data.id,
              key_id: c.key_id,
            }))
          );
        if (cErr) throw cErr;
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["volunteering-opportunities"] });
      queryClient.invalidateQueries({ queryKey: ["volunteering-contacts"] });
      resetForm();
      setCreateOpen(false);
      toast({ title: "Volunteering opportunity created" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("volunteering_opportunities")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["volunteering-opportunities"] });
      toast({ title: "Status updated" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // Delete mutation
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("volunteering_opportunities")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["volunteering-opportunities"] });
      queryClient.invalidateQueries({ queryKey: ["volunteering-contacts"] });
      setDeleteId(null);
      toast({ title: "Opportunity deleted" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // Update opportunity mutation
  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editOpportunity) return;
      const { error } = await supabase
        .from("volunteering_opportunities")
        .update({
          title,
          description,
          num_volunteers: parseInt(numVolunteers) || 1,
        })
        .eq("id", editOpportunity.id);
      if (error) throw error;

      // Delete existing contacts and re-insert
      await supabase
        .from("volunteering_opportunity_contacts")
        .delete()
        .eq("opportunity_id", editOpportunity.id);

      if (selectedContacts.length > 0) {
        const { error: cErr } = await supabase
          .from("volunteering_opportunity_contacts")
          .insert(
            selectedContacts.map((c) => ({
              opportunity_id: editOpportunity.id,
              key_id: c.key_id,
            }))
          );
        if (cErr) throw cErr;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["volunteering-opportunities"] });
      queryClient.invalidateQueries({ queryKey: ["volunteering-contacts"] });
      queryClient.invalidateQueries({ queryKey: ["contact-member-names"] });
      resetForm();
      setEditOpportunity(null);
      toast({ title: "Opportunity updated" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  function resetForm() {
    setTitle("");
    setDescription("");
    setNumVolunteers("1");
    setContactSearch("");
    setSelectedContacts([]);
  }

  function openEdit(opp: Opportunity) {
    setTitle(opp.title);
    setDescription(opp.description);
    setNumVolunteers(String(opp.num_volunteers));
    // Load existing contacts
    const oppContacts = (allContacts ?? []).filter((c) => c.opportunity_id === opp.id);
    setSelectedContacts(
      oppContacts.map((c) => ({
        key_id: c.key_id,
        name: contactNameMap.get(c.key_id) ?? `Member #${c.key_id}`,
      }))
    );
    setContactSearch("");
    setEditOpportunity(opp);
  }

  function addContact(member: { key_id: number; first_name: string | null; last_name: string | null }) {
    if (selectedContacts.some((c) => c.key_id === member.key_id)) return;
    setSelectedContacts((prev) => [
      ...prev,
      { key_id: member.key_id, name: `${member.first_name ?? ""} ${member.last_name ?? ""}`.trim() },
    ]);
    setContactSearch("");
  }

  function removeContact(key_id: number) {
    setSelectedContacts((prev) => prev.filter((c) => c.key_id !== key_id));
  }

  const dialogOpen = createOpen || !!editOpportunity;
  const isEditing = !!editOpportunity;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link to="/home">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <HandHelping className="h-5 w-5 text-accent" />
              Manage Chapter Volunteering Opportunities
            </h1>
          </div>
          <Button onClick={() => { resetForm(); setCreateOpen(true); }} size={isMobile ? "sm" : "default"}>
            <Plus className="h-4 w-4 mr-1" /> New Opportunity
          </Button>
        </div>

        {/* List */}
        {isLoading ? (
          <p className="text-muted-foreground text-sm">Loading...</p>
        ) : !opportunities?.length ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No volunteering opportunities yet. Create one to get started.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {opportunities.map((opp) => {
              const oppContacts = (allContacts ?? []).filter((c) => c.opportunity_id === opp.id);
              return (
                <Card key={opp.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base">{opp.title}</CardTitle>
                        <CardDescription className="text-xs mt-1">
                          Created by {opp.created_by_name} · {new Date(opp.created_at).toLocaleDateString()}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge className={STATUS_COLORS[opp.status] ?? ""}>{opp.status}</Badge>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(opp)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 pt-0">
                    {opp.description && (
                      <p className="text-sm text-muted-foreground">{opp.description}</p>
                    )}
                    <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        {opp.num_volunteers} volunteer{opp.num_volunteers !== 1 ? "s" : ""} needed
                      </span>
                    </div>
                    {oppContacts.length > 0 && (
                      <div className="text-xs">
                        <span className="text-muted-foreground">Contact: </span>
                        {oppContacts.map((c, i) => (
                          <span key={c.id}>
                            {contactNameMap.get(c.key_id) ?? `Member #${c.key_id}`}
                            {i < oppContacts.length - 1 ? ", " : ""}
                          </span>
                        ))}
                      </div>
                    )}
                    {/* Status change */}
                    <div className="flex items-center gap-2 pt-1">
                      <Label className="text-xs text-muted-foreground">Status:</Label>
                      <Select
                        value={opp.status}
                        onValueChange={(val) => updateStatusMutation.mutate({ id: opp.id, status: val })}
                      >
                        <SelectTrigger className="h-7 w-[130px] text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Active">Active</SelectItem>
                          <SelectItem value="Closed">Closed</SelectItem>
                          <SelectItem value="Completed">Completed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) { setCreateOpen(false); setEditOpportunity(null); resetForm(); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Edit Opportunity" : "New Volunteering Opportunity"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Airport Cleanup Day" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the volunteering opportunity..." rows={3} />
            </div>
            <div>
              <Label>Number of Volunteers Needed</Label>
              <Input type="number" min={1} value={numVolunteers} onChange={(e) => setNumVolunteers(e.target.value)} />
            </div>
            <div>
              <Label>Contact Member(s)</Label>
              <p className="text-xs text-muted-foreground mb-1">Members to contact when a volunteer applies</p>
              {selectedContacts.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {selectedContacts.map((c) => (
                    <Badge key={c.key_id} variant="secondary" className="cursor-pointer" onClick={() => removeContact(c.key_id)}>
                      {c.name} ×
                    </Badge>
                  ))}
                </div>
              )}
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={contactSearch}
                  onChange={(e) => setContactSearch(e.target.value)}
                  placeholder="Search members..."
                  className="pl-9"
                />
              </div>
              {filteredMembers.length > 0 && (
                <div className="border rounded-md mt-1 max-h-32 overflow-y-auto">
                  {filteredMembers.slice(0, 10).map((m) => (
                    <button
                      key={m.key_id}
                      className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted transition-colors"
                      onClick={() => addContact(m)}
                    >
                      {m.first_name} {m.last_name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setCreateOpen(false); setEditOpportunity(null); resetForm(); }}
            >
              Cancel
            </Button>
            <Button
              disabled={!title.trim() || (isEditing ? updateMutation.isPending : createMutation.isPending)}
              onClick={() => isEditing ? updateMutation.mutate() : createMutation.mutate()}
            >
              {isEditing ? "Save Changes" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
