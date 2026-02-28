import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { format } from "date-fns";

export default function ImportHistory() {
  const { data: imports = [], isLoading } = useQuery({
    queryKey: ["imports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("roster_imports")
        .select("*")
        .order("imported_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Import History</h1>
      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>File</TableHead>
                <TableHead>Records</TableHead>
                <TableHead>Added</TableHead>
                <TableHead>Modified</TableHead>
                <TableHead>Removed</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {imports.map((imp) => (
                <TableRow key={imp.id}>
                  <TableCell>
                    <Link to={`/imports/${imp.id}`} className="text-primary hover:underline">
                      {format(new Date(imp.imported_at), "MMM d, yyyy h:mm a")}
                    </Link>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">{imp.file_name || "—"}</TableCell>
                  <TableCell>{imp.record_count}</TableCell>
                  <TableCell className="text-green-600">+{imp.added_count}</TableCell>
                  <TableCell className="text-blue-600">{imp.modified_count}</TableCell>
                  <TableCell className="text-destructive">{imp.removed_count}</TableCell>
                  <TableCell>
                    <Badge variant={imp.status === "completed" ? "secondary" : "destructive"}>
                      {imp.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {imports.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No imports yet.
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
