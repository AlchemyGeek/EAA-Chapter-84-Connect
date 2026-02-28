import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";

export default function Members() {
  const [search, setSearch] = useState("");

  const { data: members = [], isLoading } = useQuery({
    queryKey: ["members"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("roster_members")
        .select("key_id, eaa_number, first_name, last_name, member_type, current_standing, email, expiration_date, preferred_city, preferred_state")
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
      m.last_name?.toLowerCase().includes(q) ||
      m.eaa_number?.toLowerCase().includes(q) ||
      m.email?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Members</h1>
        <span className="text-sm text-muted-foreground">{filtered.length} members</span>
      </div>
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search by name, EAA#, or email..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>
      {isLoading ? (
        <p className="text-muted-foreground">Loading members...</p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>EAA #</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Standing</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Expiration</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((m) => (
                <TableRow key={m.key_id}>
                  <TableCell>
                    <Link to={`/members/${m.key_id}`} className="font-medium text-primary hover:underline">
                      {m.last_name}, {m.first_name}
                    </Link>
                  </TableCell>
                  <TableCell>{m.eaa_number}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{m.member_type || "—"}</Badge>
                  </TableCell>
                  <TableCell>{m.current_standing || "—"}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{m.email || "—"}</TableCell>
                  <TableCell>{[m.preferred_city, m.preferred_state].filter(Boolean).join(", ") || "—"}</TableCell>
                  <TableCell>{m.expiration_date || "—"}</TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
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
