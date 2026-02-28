import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { Search, ChevronRight } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

export default function Members() {
  const [search, setSearch] = useState("");
  const isMobile = useIsMobile();

  const { data: members = [], isLoading } = useQuery({
    queryKey: ["members"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("roster_members")
        .select("key_id, eaa_number, first_name, last_name, nickname, member_type")
        .eq("current_standing", "Active")
        .order("last_name");
      if (error) throw error;
      return data;
    },
  });

  const filtered = members.filter((m) => {
    const q = search.toLowerCase();
    return (
      !q ||
      m.first_name?.toLowerCase().includes(q) ||
      m.last_name?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-bold">Members</h1>
        <span className="text-sm text-muted-foreground">{filtered.length} members</span>
      </div>

      <div className="space-y-1">
        <Label htmlFor="member-search" className="sr-only">Search members</Label>
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input id="member-search" placeholder="Search by name..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading members...</p>
      ) : isMobile ? (
        /* Mobile: stacked cards */
        <div className="space-y-3">
          {filtered.map((m) => (
            <Link key={m.key_id} to={`/members/${m.key_id}`} className="block min-h-0 min-w-0">
              <Card className="hover:border-primary/30 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1 min-w-0 flex-1">
                      <p className="font-medium text-base truncate">{m.last_name}, {m.first_name}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm text-muted-foreground">EAA #{m.eaa_number || "—"}</span>
                        <Badge variant="secondary" className="text-xs">{m.member_type || "—"}</Badge>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0 ml-2" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
          {filtered.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              {search ? "No members match your search." : "No members yet. Import a roster to get started."}
            </p>
          )}
        </div>
      ) : (
        /* Desktop: table */
        <div className="rounded-md border">
          <Table>
             <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>EAA #</TableHead>
                <TableHead>Type</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((m) => (
                <TableRow key={m.key_id}>
                  <TableCell>
                    <Link to={`/members/${m.key_id}`} className="font-medium text-secondary hover:underline min-h-0 min-w-0">
                      {m.last_name}, {m.first_name}
                    </Link>
                  </TableCell>
                  <TableCell>{m.eaa_number || "—"}</TableCell>
                  <TableCell><Badge variant="secondary">{m.member_type || "—"}</Badge></TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                    {search ? "No members match your search." : "No members yet. Import a roster to get started."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
