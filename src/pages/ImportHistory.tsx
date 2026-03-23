import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Link, Navigate } from "react-router-dom";
import { format } from "date-fns";
import { CheckCircle, AlertCircle, ChevronRight, Plus, Minus, RefreshCw } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

function StatusBadge({ status }: { status: string }) {
  const isCompleted = status === "completed";
  return (
    <Badge variant={isCompleted ? "secondary" : "destructive"} className="gap-1">
      {isCompleted ? <CheckCircle className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
      {status}
    </Badge>
  );
}

export default function ImportHistory() {
  const isMobile = useIsMobile();
  const { loading, isOfficerOrAbove, user } = useAuth();

  if (loading) return <p className="p-6 text-muted-foreground">Loading...</p>;
  if (!user || !isOfficerOrAbove) return <Navigate to="/home" replace />;

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
    <div className="p-4 md:p-6 max-w-2xl lg:max-w-4xl mx-auto space-y-4">
      <h1 className="text-xl md:text-2xl font-bold">Import History</h1>
      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : isMobile ? (
        <div className="space-y-3">
          {imports.map((imp) => (
            <Link key={imp.id} to={`/imports/${imp.id}`} className="block min-h-0 min-w-0">
              <Card className="hover:border-primary/30 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium text-sm">{format(new Date(imp.imported_at), "MMM d, yyyy h:mm a")}</p>
                    <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                  </div>
                  <p className="text-sm text-muted-foreground truncate mb-2">{imp.file_name || "—"}</p>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="inline-flex items-center gap-1 text-success"><Plus className="h-3 w-3" />{imp.added_count}</span>
                    <span className="inline-flex items-center gap-1 text-info"><RefreshCw className="h-3 w-3" />{imp.modified_count}</span>
                    <span className="inline-flex items-center gap-1 text-destructive"><Minus className="h-3 w-3" />{imp.removed_count}</span>
                    <StatusBadge status={imp.status || "unknown"} />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
          {imports.length === 0 && (
            <p className="text-center text-muted-foreground py-8">No imports yet.</p>
          )}
        </div>
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
                  <TableCell className="whitespace-nowrap">
                    <Link to={`/imports/${imp.id}`} className="text-secondary hover:underline min-h-0 min-w-0">
                      {format(new Date(imp.imported_at), "MM/dd/yy h:mm a")}
                    </Link>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">{imp.file_name || "—"}</TableCell>
                  <TableCell>{imp.record_count}</TableCell>
                  <TableCell><span className="inline-flex items-center gap-1 text-success"><Plus className="h-3 w-3" />+{imp.added_count}</span></TableCell>
                  <TableCell><span className="inline-flex items-center gap-1 text-info"><RefreshCw className="h-3 w-3" />{imp.modified_count}</span></TableCell>
                  <TableCell><span className="inline-flex items-center gap-1 text-destructive"><Minus className="h-3 w-3" />{imp.removed_count}</span></TableCell>
                  <TableCell><StatusBadge status={imp.status || "unknown"} /></TableCell>
                </TableRow>
              ))}
              {imports.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">No imports yet.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
