import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Crown, Search, Plus, X, ChevronRight } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const LEADERSHIP_ROLES = [
  "President",
  "Vice President",
  "Secretary",
  "Treasurer",
  "Newsletter Editor",
  "Membership Coordinator",
  "Hangar Manager",
  "Program Chair",
  "Technical Counselor",
  "Flight Advisor",
  "Flight Advisor/Tech Counselor",
  "Web Manager",
  "Youth Ambassador",
  "Young Eagles Coordinator",
  "Scholarship Coordinator",
] as const;

interface LeadershipEntry {
  id: string;
  key_id: number;
  role: string;
  created_at: string;
}

interface MemberOption {
  key_id: number;
  first_name: string | null;
  last_name: string | null;
  eaa_number: string | null;
}

export function ChapterLeadership() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedMember, setSelectedMember] = useState<MemberOption | null>(null);
  const [selectedRole, setSelectedRole] = useState("");

  // Fetch current leadership assignments
  const { data: leadership = [], isLoading } = useQuery({
    queryKey: ["chapter-leadership"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chapter_leadership")
        .select("*")
        .order("role");
      if (error) throw error;
      return data as LeadershipEntry[];
    },
  });

  // Fetch all members for search
  const { data: allMembers = [] } = useQuery({
    queryKey: ["members-for-leadership"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("roster_members")
        .select("key_id, first_name, last_name, eaa_number")
        .eq("current_standing", "Active")
        .order("last_name");
      if (error) throw error;
      return data as MemberOption[];
    },
  });

  // Fetch member names for display (for leadership entries)
  const leaderKeyIds = leadership.map((l) => l.key_id);
  const { data: leaderMembers = [] } = useQuery({
    queryKey: ["leader-members", leaderKeyIds],
    enabled: leaderKeyIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("roster_members")
        .select("key_id, first_name, last_name, eaa_number")
        .in("key_id", leaderKeyIds);
      if (error) throw error;
      return data as MemberOption[];
    },
  });

  const memberMap = new Map(leaderMembers.map((m) => [m.key_id, m]));

  const addMutation = useMutation({
    mutationFn: async () => {
      if (!selectedMember || !selectedRole) throw new Error("Select a member and role");
      const { error } = await supabase
        .from("chapter_leadership")
        .insert({ key_id: selectedMember.key_id, role: selectedRole });
      if (error) {
        if (error.code === "23505") throw new Error("This member already has this role");
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chapter-leadership"] });
      queryClient.invalidateQueries({ queryKey: ["leader-members"] });
      setSelectedRole("");
      toast({ title: "Leadership role assigned" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("chapter_leadership").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chapter-leadership"] });
      toast({ title: "Role removed" });
    },
  });

  // Filter members by search
  const filteredMembers = search.length >= 2
    ? allMembers.filter((m) => {
        const q = search.toLowerCase();
        return (
          m.first_name?.toLowerCase().includes(q) ||
          m.last_name?.toLowerCase().includes(q)
        );
      }).slice(0, 8)
    : [];

  // Group leadership by role
  const byRole = new Map<string, { entry: LeadershipEntry; member: MemberOption | undefined }[]>();
  for (const entry of leadership) {
    const list = byRole.get(entry.role) || [];
    list.push({ entry, member: memberMap.get(entry.key_id) });
    byRole.set(entry.role, list);
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Crown className="h-4 w-4 text-secondary" />
          Chapter Leadership
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          Assign leadership roles to chapter members.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add new assignment */}
        <div className="space-y-3 rounded-lg border p-3 bg-muted/30">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search member by name..."
              value={selectedMember ? `${selectedMember.first_name} ${selectedMember.last_name}` : search}
              onChange={(e) => {
                setSearch(e.target.value);
                setSelectedMember(null);
              }}
              className="pl-9"
            />
            {/* Search dropdown */}
            {filteredMembers.length > 0 && !selectedMember && (
              <div className="absolute z-10 top-full mt-1 w-full bg-popover border rounded-md shadow-md max-h-48 overflow-y-auto">
                {filteredMembers.map((m) => (
                  <button
                    key={m.key_id}
                    onClick={() => {
                      setSelectedMember(m);
                      setSearch("");
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
                  >
                    {m.first_name} {m.last_name}
                    <span className="text-muted-foreground ml-2">EAA #{m.eaa_number || "—"}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select role..." />
              </SelectTrigger>
              <SelectContent>
                {LEADERSHIP_ROLES.map((role) => (
                  <SelectItem key={role} value={role}>
                    {role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              onClick={() => addMutation.mutate()}
              disabled={!selectedMember || !selectedRole || addMutation.isPending}
              className="shrink-0"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>
        </div>

        {/* Current assignments - table layout */}
        {isLoading ? (
          <p className="text-sm text-muted-foreground animate-pulse">Loading...</p>
        ) : leadership.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">
            No leadership roles assigned yet.
          </p>
        ) : (
          <div className="rounded-md border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">Name</th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">Role</th>
                  <th className="w-10 px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {leadership.map((entry) => {
                  const member = memberMap.get(entry.key_id);
                  return (
                    <tr key={entry.id} className="group hover:bg-muted/30">
                      <td className="px-3 py-2 font-medium">
                        {member
                          ? `${member.first_name} ${member.last_name}`
                          : `Member #${entry.key_id}`}
                      </td>
                      <td className="px-3 py-2">
                        <Badge variant="secondary" className="text-xs">
                          {entry.role}
                        </Badge>
                      </td>
                      <td className="px-3 py-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                          onClick={() => removeMutation.mutate(entry.id)}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
