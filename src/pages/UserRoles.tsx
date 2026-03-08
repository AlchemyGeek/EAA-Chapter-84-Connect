import { useState } from "react";
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
import { Shield, UserCog, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type AppRoleEnum = Database["public"]["Enums"]["app_role"];

export default function UserRoles() {
  const { user, loading, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedRole, setSelectedRole] = useState<"admin" | "officer">("officer");

  // Fetch all role assignments
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

  // Fetch all members to map user emails
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

  // We need to get auth users - we'll use a lookup approach via the role assignments
  // For assigning, we need to know the user_id. We'll let the admin type/paste the user ID
  // or we can match by email from roster_members who have logged in.

  const addRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRoleEnum }) => {
      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-role-assignments"] });
      setSelectedUserId("");
      toast({ title: "Role assigned successfully" });
    },
    onError: (err: any) => {
      toast({
        title: "Error assigning role",
        description: err.message?.includes("duplicate") 
          ? "This user already has this role." 
          : err.message,
        variant: "destructive",
      });
    },
  });

  const removeRole = useMutation({
    mutationFn: async (roleId: string) => {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("id", roleId);
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

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading...</div>;
  }
  if (!user || !isAdmin) return <Navigate to="/home" replace />;

  const roleBadgeVariant = (role: string) => {
    if (role === "admin") return "default";
    if (role === "officer") return "secondary";
    return "outline";
  };

  const roleLabel = (role: string) => {
    if (role === "admin") return "Membership Coordinator";
    if (role === "officer") return "Officer";
    return "Member";
  };

  // Find member info by matching user_id won't work directly, but we can show user_id
  // and cross-reference if they have a roster record linked by email

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">User Roles</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Assign Officer and Membership Coordinator roles to users.
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
            Enter the user ID (UUID) of the authenticated user you want to assign a role to.
            You can find user IDs in the backend authentication settings.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <label className="text-sm font-medium">User ID</label>
            <input
              type="text"
              placeholder="e.g. a1b2c3d4-e5f6-..."
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value.trim())}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
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
            onClick={() => addRole.mutate({ userId: selectedUserId, role: selectedRole })}
            disabled={!selectedUserId || addRole.isPending}
            className="w-full"
          >
            Assign Role
          </Button>
        </CardContent>
      </Card>

      {/* Current assignments */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Current Role Assignments
          </CardTitle>
        </CardHeader>
        <CardContent>
          {rolesLoading ? (
            <p className="text-sm text-muted-foreground animate-pulse">Loading...</p>
          ) : roleAssignments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No role assignments yet.</p>
          ) : (
            <div className="space-y-2">
              {roleAssignments.map((ra) => (
                <div
                  key={ra.id}
                  className="flex items-center justify-between rounded-md border px-3 py-2.5"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Badge variant={roleBadgeVariant(ra.role)}>
                      {roleLabel(ra.role)}
                    </Badge>
                    <span className="text-xs text-muted-foreground font-mono truncate">
                      {ra.user_id}
                    </span>
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
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
