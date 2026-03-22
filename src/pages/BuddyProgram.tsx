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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
import { Users, UserPlus, Search, Trash2, UserCheck, RefreshCw, Mail, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const THREE_MONTHS_MS = 90 * 24 * 60 * 60 * 1000;

export default function BuddyProgram() {
  const { user, loading: authLoading, isOfficerOrAbove } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [removeVolunteer, setRemoveVolunteer] = useState<number | null>(null);

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

  // Fetch roster info for volunteers
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

  // Fetch all buddy assignments
  const { data: assignments = [] } = useQuery({
    queryKey: ["buddy-assignments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("buddy_assignments")
        .select("id, volunteer_key_id, application_id, assigned_at");
      if (error) throw error;
      return data;
    },
  });

  // Fetch completed applications
  const { data: completedApps = [] } = useQuery({
    queryKey: ["completed-applications-buddy"],
    staleTime: 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("new_member_applications")
        .select("id, first_name, last_name, eaa_number, email, created_at")
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

  // Compute volunteer stats
  const now = Date.now();
  const getVolunteerStats = (keyId: number) => {
    const volAssignments = assignments.filter((a) => a.volunteer_key_id === keyId);
    const active = volAssignments.filter(
      (a) => now - new Date(a.assigned_at).getTime() < THREE_MONTHS_MS
    ).length;
    const total = volAssignments.length;
    return { active, total };
  };

  // Sort volunteers by active count (lowest first) for assignment dropdown
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

  const reassignBuddy = useMutation({
    mutationFn: async (applicationId: string) => {
      const { error } = await supabase.rpc("reassign_buddy", {
        _application_id: applicationId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["buddy-assignments"] });
      toast({ title: "Buddy reassigned" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

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

  // Applications that don't have an assignment yet, or all for management
  const assignedAppIds = new Set(assignments.map((a) => a.application_id));

  return (
    <div className="p-4 md:p-6 max-w-2xl lg:max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold">New Member Buddy Program</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Pair new members with experienced chapter volunteers to help them get oriented.
          Buddies are automatically assigned to the volunteer with the fewest active assignments when an application is completed.
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
          {/* Search to add */}
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

          {/* Volunteer list */}
          {volLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : sortedVolunteers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No volunteers added yet.</p>
          ) : (
            <div className="space-y-1">
              {sortedVolunteers.map((v) => (
                <div
                  key={v.key_id}
                  className="flex items-center justify-between rounded-md px-3 py-2.5 text-sm hover:bg-muted/50 min-h-[44px]"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <UserCheck className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="truncate font-medium">
                      {v.member
                        ? `${v.member.last_name}, ${v.member.first_name}`
                        : `Key #${v.key_id}`}
                    </span>
                    <Badge variant="secondary" className="text-xs shrink-0">
                      {v.active} active
                    </Badge>
                    <Badge variant="outline" className="text-xs shrink-0">
                      {v.total} total
                    </Badge>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                    onClick={() => setRemoveVolunteer(v.key_id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* NEW MEMBERS SECTION */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-muted-foreground" />
            New Members
          </CardTitle>
        </CardHeader>
        <CardContent>
          {completedApps.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No completed new member applications found.
            </p>
          ) : (
            <div className="space-y-2">
              {completedApps.map((app) => {
                const assignment = assignments.find((a) => a.application_id === app.id);
                const assignedVolunteer = assignment
                  ? volunteerMembers.find((m) => m.key_id === assignment.volunteer_key_id)
                  : null;
                const isActive = assignment
                  ? now - new Date(assignment.assigned_at).getTime() < THREE_MONTHS_MS
                  : false;

                return (
                  <div
                    key={app.id}
                    className="border rounded-md p-3 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-sm">
                          {app.last_name}, {app.first_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          EAA #{app.eaa_number} · {app.email}
                        </p>
                      </div>
                    {assignment && (() => {
                        const daysElapsed = Math.floor((now - new Date(assignment.assigned_at).getTime()) / (24 * 60 * 60 * 1000));
                        const months = Math.floor(daysElapsed / 30);
                        const days = daysElapsed % 30;
                        const durationText = months > 0 ? `${months}mo ${days}d` : `${days}d`;
                        return (
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-muted-foreground">{durationText}</span>
                            {isActive ? (
                              <Badge className="text-xs bg-green-50 text-green-700 border-green-200" variant="outline">
                                Active
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs">
                                Alumni Buddy Pair
                              </Badge>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                    {assignment ? (
                      <div className="flex items-center justify-between">
                        <p className="text-xs flex items-center gap-1.5">
                          <UserCheck className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-muted-foreground">Buddy:</span>
                          <span className="font-medium">
                            {assignedVolunteer
                              ? `${assignedVolunteer.last_name}, ${assignedVolunteer.first_name}`
                              : `Volunteer #${assignment.volunteer_key_id}`}
                          </span>
                        </p>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1"
                          onClick={() => reassignBuddy.mutate(app.id)}
                          disabled={reassignBuddy.isPending || sortedVolunteers.length < 2}
                        >
                          <RefreshCw className="h-3 w-3" />
                          Reassign
                        </Button>
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
                            onClick={() => reassignBuddy.mutate(app.id)}
                            disabled={reassignBuddy.isPending}
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
          )}
        </CardContent>
      </Card>

      {/* Remove volunteer confirmation */}
      <AlertDialog open={removeVolunteer !== null} onOpenChange={() => setRemoveVolunteer(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Volunteer?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the volunteer and all their buddy assignments. This action cannot be undone.
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
