import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Users, UserPlus, Search, Trash2, UserCheck, RefreshCw,
  Mail, Send, GraduationCap, Plus, X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function BuddyProgram() {
  const { user, loading: authLoading, isOfficerOrAbove } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [removeVolunteer, setRemoveVolunteer] = useState<number | null>(null);
  const [assignDialog, setAssignDialog] = useState<{ appId: string; currentVolKeyId?: number } | null>(null);
  const [selectedVolunteer, setSelectedVolunteer] = useState<string>("");
  const [manualEntrySearch, setManualEntrySearch] = useState("");
  const [manualEntryDialog, setManualEntryDialog] = useState(false);
  const [graduateConfirm, setGraduateConfirm] = useState<string | null>(null);
  const [viewTab, setViewTab] = useState<"active" | "graduated">("active");

  // Fetch buddy volunteers with roster info
  const { data: volunteers = [], isLoading: volLoading } = useQuery({
    queryKey: ["buddy-volunteers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("buddy_volunteers")
        .select("key_id, created_at");
      if (error) throw error;
      return data;
    },
  });

  const volunteerKeyIds = volunteers.map((v) => v.key_id);

  const { data: volunteerMembers = [] } = useQuery({
    queryKey: ["buddy-volunteer-members", volunteerKeyIds],
    enabled: volunteerKeyIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("roster_members")
        .select("key_id, first_name, last_name, email, cell_phone")
        .in("key_id", volunteerKeyIds);
      if (error) throw error;
      return data;
    },
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ["buddy-assignments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("buddy_assignments")
        .select("id, volunteer_key_id, application_id, assigned_at, graduated_at");
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: emailLogs = [] } = useQuery({
    queryKey: ["buddy-email-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("buddy_email_log" as any)
        .select("assignment_id, email_type, sent_at")
        .order("sent_at", { ascending: false });
      if (error) throw error;
      return (data as any[]) as { assignment_id: string; email_type: string; sent_at: string }[];
    },
  });

  const { data: completedApps = [] } = useQuery({
    queryKey: ["completed-applications-buddy"],
    staleTime: 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("new_member_applications")
        .select("id, first_name, last_name, eaa_number, email, created_at, roster_key_id")
        .eq("processed", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Search roster for adding volunteers
  const { data: searchResults = [] } = useQuery({
    queryKey: ["buddy-search", search],
    enabled: search.length >= 2,
    queryFn: async () => {
      const term = `%${search}%`;
      const { data, error } = await supabase
        .from("roster_members")
        .select("key_id, first_name, last_name, eaa_number, email")
        .or(`first_name.ilike.${term},last_name.ilike.${term}`)
        .neq("member_type", "Prospect")
        .not("email", "is", null)
        .neq("email", "")
        .order("last_name")
        .limit(10);
      if (error) throw error;
      return data;
    },
  });

  // Search roster for manual new member entry
  const { data: manualSearchResults = [] } = useQuery({
    queryKey: ["buddy-manual-search", manualEntrySearch],
    enabled: manualEntrySearch.length >= 2 && manualEntryDialog,
    queryFn: async () => {
      const term = `%${manualEntrySearch}%`;
      const { data, error } = await supabase
        .from("roster_members")
        .select("key_id, first_name, last_name, eaa_number, email")
        .or(`first_name.ilike.${term},last_name.ilike.${term}`)
        .eq("current_standing", "Active")
        .order("last_name")
        .limit(10);
      if (error) throw error;
      return data;
    },
  });

  const now = Date.now();
  const getVolunteerStats = (keyId: number) => {
    const volAssignments = assignments.filter(
      (a) => a.volunteer_key_id === keyId && !a.graduated_at
    );
    const active = volAssignments.length;
    const total = assignments.filter((a) => a.volunteer_key_id === keyId).length;
    return { active, total };
  };

  const sortedVolunteers = [...volunteers]
    .map((v) => {
      const member = volunteerMembers.find((m) => m.key_id === v.key_id);
      const stats = getVolunteerStats(v.key_id);
      return { ...v, member, ...stats };
    })
    .sort((a, b) => a.active - b.active);

  const addVolunteer = useMutation({
    mutationFn: async (keyId: number) => {
      const { error } = await supabase
        .from("buddy_volunteers")
        .insert({ key_id: keyId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["buddy-volunteers"] });
      queryClient.invalidateQueries({ queryKey: ["buddy-volunteer-members"] });
      setSearch("");
      toast({ title: "Volunteer added" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteVolunteer = useMutation({
    mutationFn: async (keyId: number) => {
      const { error } = await supabase
        .from("buddy_volunteers")
        .delete()
        .eq("key_id", keyId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["buddy-volunteers"] });
      queryClient.invalidateQueries({ queryKey: ["buddy-assignments"] });
      setRemoveVolunteer(null);
      toast({ title: "Volunteer removed" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  // Manual assign / reassign: insert or update assignment only. Email is sent separately.
  const manualAssign = useMutation({
    mutationFn: async ({
      applicationId,
      volunteerKeyId,
      existingAssignmentId,
    }: {
      applicationId: string;
      volunteerKeyId: number;
      existingAssignmentId?: string;
    }) => {
      if (existingAssignmentId) {
        const { error } = await supabase
          .from("buddy_assignments")
          .update({
            volunteer_key_id: volunteerKeyId,
            assigned_at: new Date().toISOString(),
          })
          .eq("id", existingAssignmentId);
        if (error) throw error;
        return existingAssignmentId;
      } else {
        const { data, error } = await supabase
          .from("buddy_assignments")
          .insert({
            application_id: applicationId,
            volunteer_key_id: volunteerKeyId,
          })
          .select("id")
          .single();
        if (error) throw error;
        return data.id;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["buddy-assignments"] });
      setAssignDialog(null);
      setSelectedVolunteer("");
      toast({ title: "Buddy assigned" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const sendBuddyEmail = useMutation({
    mutationFn: async ({ assignmentId, type }: { assignmentId: string; type: "intro" | "check_in" }) => {
      const { error } = await supabase.functions.invoke("buddy-email-send", {
        body: { assignment_id: assignmentId, email_type: type },
      });
      if (error) throw error;
      return type;
    },
    onSuccess: (type) => {
      queryClient.invalidateQueries({ queryKey: ["buddy-email-logs"] });
      toast({ title: type === "intro" ? "Intro email sent" : "Check-In email sent" });
    },
    onError: (err: any) => {
      toast({ title: "Error sending email", description: err.message, variant: "destructive" });
    },
  });

  const graduateMember = useMutation({
    mutationFn: async (assignmentId: string) => {
      const { error } = await supabase
        .from("buddy_assignments")
        .update({ graduated_at: new Date().toISOString() })
        .eq("id", assignmentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["buddy-assignments"] });
      setGraduateConfirm(null);
      toast({ title: "Member graduated from buddy program" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  // Manual entry: add a roster member as a new member in the buddy program
  // Creates a pseudo-application entry or directly creates an assignment
  const addManualEntry = useMutation({
    mutationFn: async (member: { key_id: number; first_name: string; last_name: string; email: string; eaa_number: string }) => {
      // Create a new_member_application entry so the buddy system has an application_id
      const { data, error } = await supabase
        .from("new_member_applications")
        .insert({
          first_name: member.first_name,
          last_name: member.last_name,
          email: member.email || "",
          eaa_number: member.eaa_number || "",
          address: "N/A",
          city: "N/A",
          state: "N/A",
          zip_code: "N/A",
          quarter_applied: `Q${Math.ceil((new Date().getMonth() + 1) / 3)} ${new Date().getFullYear()}`,
          fee_amount: 0,
          processed: true,
          processed_at: new Date().toISOString(),
          roster_key_id: member.key_id,
        })
        .select("id")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["completed-applications-buddy"] });
      setManualEntryDialog(false);
      setManualEntrySearch("");
      toast({ title: "Member added to buddy program" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const getEmailStatus = (assignmentId: string) => {
    const logs = emailLogs.filter((l) => l.assignment_id === assignmentId);
    const intro = logs.find((l) => l.email_type === "intro");
    const checkIn = logs.find((l) => l.email_type === "check_in");
    return {
      introSent: !!intro,
      introSentAt: intro?.sent_at,
      checkInSent: !!checkIn,
      checkInSentAt: checkIn?.sent_at,
    };
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (!isOfficerOrAbove) return <Navigate to="/home" replace />;

  const filteredSearchResults = searchResults.filter(
    (r) => !volunteerKeyIds.includes(r.key_id)
  );

  // Filter manual entry results: exclude those already in the program
  const existingAppRosterKeyIds = new Set(completedApps.map((a) => a.roster_key_id).filter(Boolean));
  const filteredManualResults = manualSearchResults.filter(
    (r) => !existingAppRosterKeyIds.has(r.key_id)
  );

  // Split assignments into active and graduated
  const activeAssignments = assignments.filter((a) => !a.graduated_at);
  const graduatedAssignments = assignments.filter((a) => a.graduated_at);

  // Get apps that are in the program (have completed applications)
  const getAppForAssignment = (applicationId: string) =>
    completedApps.find((a) => a.id === applicationId);

  return (
    <div className="p-4 md:p-6 max-w-2xl lg:max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold">New Member Buddy Program</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Pair new members with experienced chapter volunteers. Assignments, emails, and graduations are managed manually.
        </p>
      </div>

      {/* VOLUNTEERS SECTION */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            Buddy Volunteers
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search members to add as volunteer..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            {search.length >= 2 && filteredSearchResults.length > 0 && (
              <div className="border rounded-md divide-y max-h-48 overflow-auto">
                {filteredSearchResults.map((m) => (
                  <div
                    key={m.key_id}
                    className="flex items-center justify-between px-3 py-2 text-sm hover:bg-muted/50"
                  >
                    <span>
                      {m.last_name}, {m.first_name}{" "}
                      <span className="text-muted-foreground">· EAA #{m.eaa_number}</span>
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => addVolunteer.mutate(m.key_id)}
                      disabled={addVolunteer.isPending}
                    >
                      <UserPlus className="h-3.5 w-3.5 mr-1" />
                      Add
                    </Button>
                  </div>
                ))}
              </div>
            )}
            {search.length >= 2 && filteredSearchResults.length === 0 && (
              <p className="text-xs text-muted-foreground">No matching members found.</p>
            )}
          </div>

          {volLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : sortedVolunteers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No volunteers added yet.</p>
          ) : (
            <div className="space-y-1">
              {sortedVolunteers.map((v) => (
                <div
                  key={v.key_id}
                  className="flex items-center justify-between rounded-md px-3 py-2.5 text-sm hover:bg-muted/50 min-h-[44px] gap-2"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <UserCheck className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="truncate font-medium">
                      {v.member
                        ? `${v.member.last_name}, ${v.member.first_name}`
                        : `Key #${v.key_id}`}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Badge variant="secondary" className="text-xs">
                      {v.active} active
                    </Badge>
                    <Badge variant="outline" className="text-xs hidden sm:inline-flex">
                      {v.total} total
                    </Badge>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => setRemoveVolunteer(v.key_id)}
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

      {/* NEW MEMBERS SECTION */}
      <Card>
        <CardHeader className="pb-3">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-muted-foreground" />
                New Members
              </CardTitle>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1"
                onClick={() => setManualEntryDialog(true)}
              >
                <Plus className="h-3 w-3" />
                Add Member
              </Button>
            </div>
            <div className="flex border rounded-md self-start">
              <button
                className={`px-3 py-1 text-xs font-medium rounded-l-md transition-colors ${
                  viewTab === "active"
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                }`}
                onClick={() => setViewTab("active")}
              >
                Active ({completedApps.filter((a) => {
                  const assignment = assignments.find((as) => as.application_id === a.id);
                  return !assignment?.graduated_at;
                }).length})
              </button>
              <button
                className={`px-3 py-1 text-xs font-medium rounded-r-md transition-colors ${
                  viewTab === "graduated"
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                }`}
                onClick={() => setViewTab("graduated")}
              >
                Graduated ({graduatedAssignments.length})
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {viewTab === "active" ? (
            <ActiveMembersList
              completedApps={completedApps}
              assignments={assignments}
              volunteerMembers={volunteerMembers}
              sortedVolunteers={sortedVolunteers}
              emailLogs={emailLogs}
              now={now}
              onAssign={(appId, currentVolKeyId) => {
                setAssignDialog({ appId, currentVolKeyId });
                setSelectedVolunteer("");
              }}
              onSendIntro={(id) => sendBuddyEmail.mutate({ assignmentId: id, type: "intro" })}
              onSendCheckIn={(id) => sendBuddyEmail.mutate({ assignmentId: id, type: "check_in" })}
              onGraduate={(id) => setGraduateConfirm(id)}
              sendEmailPending={sendBuddyEmail.isPending}
              getEmailStatus={getEmailStatus}
            />
          ) : (
            <GraduatedMembersList
              graduatedAssignments={graduatedAssignments}
              completedApps={completedApps}
              volunteerMembers={volunteerMembers}
            />
          )}
        </CardContent>
      </Card>

      {/* Assign / Reassign Dialog */}
      <Dialog open={!!assignDialog} onOpenChange={() => { setAssignDialog(null); setSelectedVolunteer(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {assignDialog?.currentVolKeyId ? "Reassign Buddy" : "Assign Buddy"}
            </DialogTitle>
            <DialogDescription>
              Select a volunteer to pair with this new member. No email will be sent automatically — use "Send Intro" afterward.
            </DialogDescription>
          </DialogHeader>
          <Select value={selectedVolunteer} onValueChange={setSelectedVolunteer}>
            <SelectTrigger>
              <SelectValue placeholder="Select a volunteer..." />
            </SelectTrigger>
            <SelectContent>
              {sortedVolunteers
                .filter((v) => v.key_id !== assignDialog?.currentVolKeyId)
                .map((v) => (
                  <SelectItem key={v.key_id} value={String(v.key_id)}>
                    {v.member
                      ? `${v.member.last_name}, ${v.member.first_name}`
                      : `Key #${v.key_id}`}{" "}
                    ({v.active} active)
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setAssignDialog(null); setSelectedVolunteer(""); }}
            >
              Cancel
            </Button>
            <Button
              disabled={!selectedVolunteer || manualAssign.isPending}
              onClick={() => {
                if (!assignDialog || !selectedVolunteer) return;
                const existingAssignment = assignments.find(
                  (a) => a.application_id === assignDialog.appId
                );
                manualAssign.mutate({
                  applicationId: assignDialog.appId,
                  volunteerKeyId: Number(selectedVolunteer),
                  existingAssignmentId: existingAssignment?.id,
                });
              }}
            >
              {manualAssign.isPending ? "Assigning..." : "Assign Buddy"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manual Entry Dialog */}
      <Dialog open={manualEntryDialog} onOpenChange={(open) => { setManualEntryDialog(open); if (!open) setManualEntrySearch(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Member to Buddy Program</DialogTitle>
            <DialogDescription>
              Search for an active roster member to add to the buddy program manually.
            </DialogDescription>
          </DialogHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name..."
              value={manualEntrySearch}
              onChange={(e) => setManualEntrySearch(e.target.value)}
              className="pl-9"
            />
          </div>
          {manualEntrySearch.length >= 2 && filteredManualResults.length > 0 && (
            <div className="border rounded-md divide-y max-h-60 overflow-auto">
              {filteredManualResults.map((m) => (
                <div
                  key={m.key_id}
                  className="flex items-center justify-between px-3 py-2 text-sm hover:bg-muted/50"
                >
                  <div>
                    <span className="font-medium">{m.last_name}, {m.first_name}</span>
                    <span className="text-muted-foreground ml-2">· EAA #{m.eaa_number}</span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => addManualEntry.mutate({
                      key_id: m.key_id,
                      first_name: m.first_name || "",
                      last_name: m.last_name || "",
                      email: m.email || "",
                      eaa_number: m.eaa_number || "",
                    })}
                    disabled={addManualEntry.isPending}
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Add
                  </Button>
                </div>
              ))}
            </div>
          )}
          {manualEntrySearch.length >= 2 && filteredManualResults.length === 0 && (
            <p className="text-xs text-muted-foreground">No matching active members found.</p>
          )}
        </DialogContent>
      </Dialog>

      {/* Graduate Confirmation */}
      <AlertDialog open={!!graduateConfirm} onOpenChange={() => setGraduateConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Graduate from Buddy Program?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the member as graduated. They will appear in the Graduated list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => graduateConfirm && graduateMember.mutate(graduateConfirm)}
              disabled={graduateMember.isPending}
            >
              Graduate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Remove volunteer confirmation */}
      <AlertDialog open={removeVolunteer !== null} onOpenChange={() => setRemoveVolunteer(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Volunteer?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the volunteer from the buddy program. Existing assignments will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => removeVolunteer !== null && deleteVolunteer.mutate(removeVolunteer)}
              disabled={deleteVolunteer.isPending}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Active members sub-component
function ActiveMembersList({
  completedApps,
  assignments,
  volunteerMembers,
  sortedVolunteers,
  emailLogs,
  now,
  onAssign,
  onSendIntro,
  onSendCheckIn,
  onGraduate,
  sendEmailPending,
  getEmailStatus,
}: {
  completedApps: any[];
  assignments: any[];
  volunteerMembers: any[];
  sortedVolunteers: any[];
  emailLogs: any[];
  now: number;
  onAssign: (appId: string, currentVolKeyId?: number) => void;
  onSendIntro: (assignmentId: string) => void;
  onSendCheckIn: (assignmentId: string) => void;
  onGraduate: (assignmentId: string) => void;
  sendEmailPending: boolean;
  getEmailStatus: (id: string) => { introSent: boolean; introSentAt?: string; checkInSent: boolean; checkInSentAt?: string };
}) {
  const activeApps = completedApps.filter((app) => {
    const assignment = assignments.find((a) => a.application_id === app.id);
    return !assignment?.graduated_at;
  });

  if (activeApps.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No active new members in the buddy program.
      </p>
    );
  }

  const fmtDate = (iso?: string) =>
    iso ? new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "";

  return (
    <div className="space-y-2">
      {activeApps.map((app) => {
        const assignment = assignments.find((a) => a.application_id === app.id);
        const assignedVolunteer = assignment
          ? volunteerMembers.find((m) => m.key_id === assignment.volunteer_key_id)
          : null;
        const emailStatus = assignment ? getEmailStatus(assignment.id) : null;

        const daysElapsed = assignment
          ? Math.floor((now - new Date(assignment.assigned_at).getTime()) / (24 * 60 * 60 * 1000))
          : 0;
        const months = Math.floor(daysElapsed / 30);
        const days = daysElapsed % 30;
        const durationText = months > 0 ? `${months}mo ${days}d` : `${days}d`;

        return (
          <div key={app.id} className="border rounded-md p-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium text-sm">
                  {app.last_name}, {app.first_name}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  EAA #{app.eaa_number} · {app.email}
                </p>
              </div>
              {assignment && (
                <span className="text-xs text-muted-foreground shrink-0" title={`Assigned ${fmtDate(assignment.assigned_at)}`}>
                  {durationText}
                </span>
              )}
            </div>

            {assignment ? (
              <div className="space-y-2">
                <p className="text-xs flex items-center gap-1.5">
                  <UserCheck className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">Buddy:</span>
                  <span className="font-medium">
                    {assignedVolunteer
                      ? `${assignedVolunteer.last_name}, ${assignedVolunteer.first_name}`
                      : `Volunteer #${assignment.volunteer_key_id}`}
                  </span>
                </p>

                {/* Status chips: intro / check-in with timestamps */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {emailStatus?.introSent ? (
                    <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                      <Mail className="h-3 w-3 mr-1" />
                      Intro Sent · {fmtDate(emailStatus.introSentAt)}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs bg-muted text-muted-foreground">
                      Intro not sent
                    </Badge>
                  )}
                  {emailStatus?.checkInSent ? (
                    <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                      <Mail className="h-3 w-3 mr-1" />
                      Check-In Sent · {fmtDate(emailStatus.checkInSentAt)}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs bg-muted text-muted-foreground">
                      Check-In not sent
                    </Badge>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-1">
                  {!emailStatus?.introSent && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1"
                      onClick={() => onSendIntro(assignment.id)}
                      disabled={sendEmailPending}
                    >
                      <Send className="h-3 w-3" />
                      Send Intro
                    </Button>
                  )}
                  {emailStatus?.introSent && !emailStatus.checkInSent && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1"
                      onClick={() => onSendCheckIn(assignment.id)}
                      disabled={sendEmailPending}
                    >
                      <Send className="h-3 w-3" />
                      Send Check-In
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1"
                    onClick={() => onAssign(app.id, assignment.volunteer_key_id)}
                    disabled={sortedVolunteers.length < 2}
                  >
                    <RefreshCw className="h-3 w-3" />
                    Reassign
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1"
                    onClick={() => onGraduate(assignment.id)}
                  >
                    <GraduationCap className="h-3 w-3" />
                    Graduate
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground italic">
                  No buddy assigned yet.
                </p>
                {sortedVolunteers.length > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1"
                    onClick={() => onAssign(app.id)}
                  >
                    <UserCheck className="h-3 w-3" />
                    Assign Buddy
                  </Button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Graduated members sub-component
function GraduatedMembersList({
  graduatedAssignments,
  completedApps,
  volunteerMembers,
}: {
  graduatedAssignments: any[];
  completedApps: any[];
  volunteerMembers: any[];
}) {
  if (graduatedAssignments.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No graduated members yet.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {graduatedAssignments
        .sort((a, b) => new Date(b.graduated_at).getTime() - new Date(a.graduated_at).getTime())
        .map((assignment) => {
          const app = completedApps.find((a) => a.id === assignment.application_id);
          const buddy = volunteerMembers.find((m) => m.key_id === assignment.volunteer_key_id);

          const assignedDate = new Date(assignment.assigned_at);
          const graduatedDate = new Date(assignment.graduated_at);
          const durationDays = Math.floor(
            (graduatedDate.getTime() - assignedDate.getTime()) / (24 * 60 * 60 * 1000)
          );
          const months = Math.floor(durationDays / 30);
          const days = durationDays % 30;
          const durationText = months > 0 ? `${months}mo ${days}d` : `${days}d`;

          return (
            <div key={assignment.id} className="border rounded-md p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-sm">
                    {app ? `${app.last_name}, ${app.first_name}` : "Unknown Member"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Buddy: {buddy ? `${buddy.last_name}, ${buddy.first_name}` : `#${assignment.volunteer_key_id}`}
                    {" · "}{durationText}
                  </p>
                </div>
                <Badge variant="outline" className="text-xs shrink-0">
                  <GraduationCap className="h-3 w-3 mr-1" />
                  {graduatedDate.toLocaleDateString()}
                </Badge>
              </div>
            </div>
          );
        })}
    </div>
  );
}
