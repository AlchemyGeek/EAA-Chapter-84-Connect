import { useQuery } from "@tanstack/react-query";
import { Link, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, ExternalLink, Settings } from "lucide-react";
import { RESOURCE_CATEGORIES, type ResourceLink } from "@/components/admin/ResourceLinksAdmin";

function domainOf(url: string) {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; }
}

export default function Resources() {
  const { user, loading, isOfficerOrAbove } = useAuth();
  const { data: links = [], isLoading } = useQuery({
    queryKey: ["resource-links"],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("resource_links").select("*").order("sort_order");
      if (error) throw error;
      return data as ResourceLink[];
    },
  });

  if (!loading && !user) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-11 w-11" asChild aria-label="Back to Home">
            <Link to="/home"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <h1 className="text-xl font-bold tracking-tight flex-1">Resources</h1>
          {isOfficerOrAbove && (
            <Button variant="outline" size="sm" className="h-11" asChild>
              <Link to="/site-config?section=resources"><Settings className="h-4 w-4 sm:mr-1" /><span className="hidden sm:inline">Manage</span></Link>
            </Button>
          )}
        </div>
        <p className="text-base text-muted-foreground">Useful websites for chapter members.</p>

        {isLoading ? (
          <div className="text-muted-foreground animate-pulse">Loading…</div>
        ) : links.length === 0 ? (
          <p className="text-muted-foreground">No resources have been added yet.</p>
        ) : (
          RESOURCE_CATEGORIES.map((cat) => {
            const items = links.filter((l) => l.category === cat.value);
            if (!items.length) return null;
            return (
              <Card key={cat.value}>
                <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">{cat.label}</CardTitle></CardHeader>
                <CardContent className="divide-y divide-border pt-0">
                  {items.map((l) => (
                    <a key={l.id} href={l.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-start gap-3 py-3 min-h-11 hover:bg-muted/50 -mx-2 px-2 rounded-md transition-colors">
                      <div className="min-w-0 flex-1">
                        <p className="text-base font-medium text-primary">{l.name}</p>
                        {l.description && <p className="text-base text-muted-foreground">{l.description}</p>}
                        <p className="text-sm text-muted-foreground truncate">{domainOf(l.url)}</p>
                      </div>
                      <ExternalLink className="h-4 w-4 mt-1 shrink-0 text-muted-foreground" />
                    </a>
                  ))}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
