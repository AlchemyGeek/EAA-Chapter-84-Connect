import { Link, useLocation, Outlet, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Users, Upload, Download, FileText, LogOut, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

const navItems = [
  { to: "/members", label: "Members", icon: Users },
  { to: "/import", label: "Import", icon: Upload, adminOnly: true },
  { to: "/imports", label: "Import History", icon: FileText },
  { to: "/export", label: "Export", icon: Download },
];

export default function AppLayout() {
  const { user, loading, isAdmin, signOut } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="flex min-h-screen">
      <aside className="w-60 border-r bg-sidebar text-sidebar-foreground flex flex-col">
        <div className="p-4 border-b">
          <h1 className="font-bold text-lg">Ch.84 Connect</h1>
          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          {isAdmin && (
            <span className="inline-flex items-center gap-1 mt-1 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
              <Shield className="h-3 w-3" /> Admin
            </span>
          )}
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {navItems
            .filter((item) => !item.adminOnly || isAdmin)
            .map((item) => {
              const Icon = item.icon;
              const active = location.pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                      : "hover:bg-sidebar-accent/50"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
        </nav>
        <div className="p-2 border-t">
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2" onClick={signOut}>
            <LogOut className="h-4 w-4" /> Sign Out
          </Button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
