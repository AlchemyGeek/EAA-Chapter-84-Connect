import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Shield, UserCog, Trash2, Search, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function UserRoles() {
  const { user, loading, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<"admin" | "officer">("officer");

  // Fetch all members
  const { data: allMembers = [] } = useQuery({
    queryKey: ["all-members-for-roles"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("roster_members")
        .select("key_id, first_name, last_name, email, eaa_number")
        .order("last_name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch active role assignments
  const { data: roleAssignments = [], isLoading: rolesLoading } = useQuery({
    queryKey: ["user-role-assignments"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("*")
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });

  // Fetch pending role assignments
  const { data: pendingRoles = [] } = useQuery({
    queryKey: ["pending-role-assignments"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pending_user_roles")
        .select("*")
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });

  // Resolve user_ids to emails for active assignments
  const userIds = useMemo(() => roleAssignments.map((r) => r.user_id), [roleAssignments]);
  const { data: userEmails = [] } = useQuery({
    queryKey: ["user-emails-for-roles", userIds],
    enabled: isAdmin && userIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_user_emails_by_ids", {
        _user_ids: userIds,
      });
      if (error) throw error;
      return data as { user_id: string; email: string }[];
    },
  });

  const userEmailMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const ue of userEmails) map[ue.user_id] = ue.email;
    return map;
  }, [userEmails]);

  const filteredMembers = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return allMembers
      .filter(
        (m) =>
          m.email && m.email.trim() &&
          (`${m.first_name} ${m.last_name}`.toLowerCase().includes(q) ||
            m.email.toLowerCase().includes(q))
      )
      .slice(0, 10);
  }, [search, allMembers]);

  const selectedMember = useMemo(
    () => allMembers.find((m) => m.email === selectedEmail),
    [selectedEmail, allMembers]
  );

  // Assign role: try immediate assignment, fall back to pending
  const addRole = useMutation({
    mutationFn: async ({ email, role }: { email: string; role: "admin" | "officer" }) => {
      // First try to find the user_id
      const { data: userId } = await supabase.rpc("get_user_id_by_email", {
        _email: email,
      });

      if (userId) {
        // User exists, assign directly
        const { error } = await supabase
          .from("user_roles")
          .insert({ user_id: userId, role });
        if (error) throw error;
      } else {
        // User hasn't signed in yet, create pending role
        const { error } = await supabase
          .from("pending_user_roles")
          .insert({ email, role });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-role-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["pending-role-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["user-emails-for-roles"] });
      setSelectedEmail(null);
      setSearch("");
      toast({ title: "Role assigned successfully" });
    },
    onError: (err: any) => {
      toast({
        title: "Error assigning role",
        description: err.message?.includes("duplicate")
          ? "This member already has this role."
          : err.message,
        variant: "destructive",
      });
    },
  });

  const removeRole = useMutation({
    mutationFn: async (roleId: string) => {
      const { error } = await supabase.from("user_roles").delete().eq("id", roleId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-role-assignments"] });
      toast({ title: "Role removed" });
    },
    onError: (err: any) => {
      toast({ title: "Error removing role", description: err.message, variant: "destructive" });
    },
  });

  const removePendingRole = useMutation({
    mutationFn: async (roleId: string) => {
      const { error } = await supabase.from("pending_user_roles").delete().eq("id", roleId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-role-assignments"] });
      toast({ title: "Pending role removed" });
    },
    onError: (err: any) => {
      toast({ title: "Error removing role", description: err.message, variant: "destructive" });
    },
  });

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading...</div>;
  }
  if (!user || !isAdmin) return <Navigate to="/home" replace />;

  const roleBadgeVariant = (role: string) => {
    if (role === "admin") return "default" as const;
    if (role === "officer") return "secondary" as const;
    return "outline" as const;
  };

  const roleLabel = (role: string) => {
    if (role === "admin") return "Membership Coordinator";
    if (role === "officer") return "Officer";
    return "Member";
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">User Roles</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Assign Officer and Membership Coordinator roles to members.
          All authenticated users are Members by default.
        </p>
      </div>

      {/* Assign new role */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <UserCog className="h-4 w-4" />
            Assign Role
          </CardTitle>
          <CardDescription className="text-xs">
            Search for a member by name and assign a role. If they haven't signed in yet,
            the role will be applied automatically when they do.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <label className="text-sm font-medium">Member</label>
            {selectedMember ? (
              <div className="flex items-center justify-between rounded-md border bg-muted/50 px-3 py-2.5">
                <div>
                  <span className="text-sm font-medium">
                    {selectedMember.last_name}, {selectedMember.first_name}
                  </span>
                  <span className="text-xs text-muted-foreground ml-2">
                    EAA #{selectedMember.eaa_number}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => {
                    setSelectedEmail(null);
                    setSearch("");
                  }}
                >
                  Change
                </Button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
                {filteredMembers.length > 0 && (
                  <div className="absolute z-10 top-full mt-1 w-full rounded-md border bg-popover shadow-md max-h-48 overflow-auto">
                    {filteredMembers.map((m) => (
                      <button
                        key={m.key_id}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-accent/10 transition-colors flex justify-between items-center"
                        onClick={() => {
                          setSelectedEmail(m.email!);
                          setSearch("");
                        }}
                      >
                        <span>{m.last_name}, {m.first_name}</span>
                        <span className="text-xs text-muted-foreground">EAA #{m.eaa_number}</span>
                      </button>
                    ))}
                  </div>
                )}
                {search.trim().length > 0 && filteredMembers.length === 0 && (
                  <div className="absolute z-10 top-full mt-1 w-full rounded-md border bg-popover shadow-md px-3 py-2 text-sm text-muted-foreground">
                    No members found
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Role</label>
            <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as "admin" | "officer")}>
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="officer">Officer</SelectItem>
                <SelectItem value="admin">Membership Coordinator</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={() => {
              if (selectedEmail) {
                addRole.mutate({ email: selectedEmail, role: selectedRole });
              }
            }}
            disabled={!selectedEmail || addRole.isPending}
            className="w-full"
          >
            {addRole.isPending ? "Assigning..." : "Assign Role"}
          </Button>
        </CardContent>
      </Card>

      {/* Current active assignments */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Active Role Assignments
          </CardTitle>
        </CardHeader>
        <CardContent>
          {rolesLoading ? (
            <p className="text-sm text-muted-foreground animate-pulse">Loading...</p>
          ) : roleAssignments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active role assignments.</p>
          ) : (
            <div className="space-y-2">
              {roleAssignments.map((ra) => {
                const email = userEmailMap[ra.user_id];
                const member = email
                  ? allMembers.find((m) => m.email?.toLowerCase() === email.toLowerCase())
                  : null;
                return (
                  <div
                    key={ra.id}
                    className="flex items-center justify-between rounded-md border px-3 py-2.5"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Badge variant={roleBadgeVariant(ra.role)}>
                        {roleLabel(ra.role)}
                      </Badge>
                      <span className="text-sm truncate">
                        {member
                          ? `${member.last_name}, ${member.first_name}`
                          : email ?? ra.user_id.slice(0, 8) + "…"}
                      </span>
                      {member && (
                        <span className="text-xs text-muted-foreground">
                          EAA #{member.eaa_number}
                        </span>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive shrink-0"
                      onClick={() => removeRole.mutate(ra.id)}
                      disabled={removeRole.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending assignments */}
      {pendingRoles.length > 0 && (
        <Card className="border-dashed">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Pending Assignments
            </CardTitle>
            <CardDescription className="text-xs">
              These roles will be applied automatically when the member signs in.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {pendingRoles.map((pr) => {
                const member = allMembers.find(
                  (m) => m.email?.toLowerCase() === pr.email.toLowerCase()
                );
                return (
                  <div
                    key={pr.id}
                    className="flex items-center justify-between rounded-md border border-dashed px-3 py-2.5"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Badge variant={roleBadgeVariant(pr.role)}>
                        {roleLabel(pr.role)}
                      </Badge>
                      <span className="text-sm truncate">
                        {member
                          ? `${member.last_name}, ${member.first_name}`
                          : pr.email}
                      </span>
                      {member && (
                        <span className="text-xs text-muted-foreground">
                          EAA #{member.eaa_number}
                        </span>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive shrink-0"
                      onClick={() => removePendingRole.mutate(pr.id)}
                      disabled={removePendingRole.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
