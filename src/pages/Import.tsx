import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, FileUp, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Import() {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);
    setResult(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/roster-import`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${session.access_token}` },
          body: formData,
        }
      );

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Import failed");

      setResult(data);
      toast({ title: "Import successful", description: `${data.record_count} records processed.` });
    } catch (error: any) {
      toast({ title: "Import failed", description: error.message, variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Import Roster</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Upload EAA Roster Export</CardTitle>
          <CardDescription>Select the .xls file exported from the EAA roster tool. The file will be parsed and compared against existing data.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            <FileUp className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {file ? file.name : "Click to select a file"}
            </p>
            <input
              ref={fileRef}
              type="file"
              accept=".xls,.html,.htm"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </div>

          <Button onClick={handleImport} disabled={!file || importing} className="w-full gap-2">
            <Upload className="h-4 w-4" />
            {importing ? "Importing..." : "Start Import"}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Import Complete
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <dt className="text-muted-foreground">Records processed</dt>
              <dd className="font-medium">{result.record_count}</dd>
              <dt className="text-muted-foreground">Added</dt>
              <dd className="font-medium text-green-600">+{result.added}</dd>
              <dt className="text-muted-foreground">Modified</dt>
              <dd className="font-medium text-blue-600">{result.modified}</dd>
              <dt className="text-muted-foreground">Removed</dt>
              <dd className="font-medium text-destructive">{result.removed}</dd>
              <dt className="text-muted-foreground">Total changes</dt>
              <dd className="font-medium">{result.total_changes}</dd>
            </dl>
            <Button variant="outline" className="mt-4" onClick={() => navigate(`/imports/${result.import_id}`)}>
              View Diff Report
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
