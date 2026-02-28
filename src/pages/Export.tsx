import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download } from "lucide-react";
import { exportMembersToExcel, exportMembersToCsv } from "@/lib/export";

export default function Export() {
  const { data: members = [], isLoading } = useQuery({
    queryKey: ["members-full"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("roster_members")
        .select("*")
        .order("last_name");
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Export Data</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Full Member Export</CardTitle>
          <CardDescription>Download all member records from the database.</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-3">
          <Button variant="outline" className="gap-2" onClick={() => exportMembersToCsv(members)} disabled={isLoading}>
            <Download className="h-4 w-4" /> CSV
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => exportMembersToExcel(members)} disabled={isLoading}>
            <Download className="h-4 w-4" /> Excel
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
