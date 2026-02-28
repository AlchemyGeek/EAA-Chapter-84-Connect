import { useState } from "react";
import { Link, useLocation, Outlet, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Users, Upload, Download, FileText, LogOut, Shield, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";

const navItems = [
  { to: "/members", label: "Members", icon: Users },
  { to: "/import", label: "Import", icon: Upload, adminOnly: true },
  { to: "/imports", label: "Import History", icon: FileText },
  { to: "/export", label: "Export", icon: Download },
];

function NavLinks({ isAdmin, location, onNavigate }: { isAdmin: boolean; location: ReturnType<typeof useLocation>; onNavigate?: () => void }) {
  return (
    <>
      {navItems
        .filter((item) => !item.adminOnly || isAdmin)
        .map((item) => {
          const Icon = item.icon;
          const active = location.pathname.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={`flex items-center gap-3 px-4 py-3 rounded-md text-sm transition-colors min-h-[44px] ${
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50"
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {item.label}
            </Link>
          );
        })}
    </>
  );
}

export default function AppLayout() {
  const { user, loading, isAdmin, signOut } = useAuth();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [sheetOpen, setSheetOpen] = useState(false);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Mobile layout: top header + sheet nav
  if (isMobile) {
    return (
      <div className="flex flex-col min-h-screen">
        <header className="bg-primary text-primary-foreground flex items-center justify-between px-4 h-14 shrink-0">
          <h1 className="font-bold text-lg">Ch.84 Connect</h1>
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80 min-h-[44px] min-w-[44px]">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Open menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="bg-sidebar border-sidebar-border w-72 p-0">
              <SheetTitle className="sr-only">Navigation menu</SheetTitle>
              <div className="p-4 border-b border-sidebar-border">
                <p className="text-sm text-sidebar-foreground truncate">{user.email}</p>
                {isAdmin && (
                  <span className="inline-flex items-center gap-1 mt-1 text-xs bg-sidebar-accent text-sidebar-accent-foreground px-2 py-0.5 rounded">
                    <Shield className="h-3 w-3" /> Admin
                  </span>
                )}
              </div>
              <nav className="p-2 space-y-1">
                <NavLinks isAdmin={isAdmin} location={location} onNavigate={() => setSheetOpen(false)} />
              </nav>
              <div className="absolute bottom-0 left-0 right-0 p-2 border-t border-sidebar-border">
                <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-sidebar-foreground hover:bg-sidebar-accent/50 min-h-[44px]" onClick={signOut}>
                  <LogOut className="h-4 w-4" /> Sign Out
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </header>
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    );
  }

  // Desktop layout: sidebar
  return (
    <div className="flex min-h-screen">
      <aside className="w-60 border-r border-sidebar-border bg-sidebar text-sidebar-foreground flex flex-col shrink-0">
        <div className="p-4 border-b border-sidebar-border">
          <h1 className="font-bold text-lg text-sidebar-primary">Ch.84 Connect</h1>
          <p className="text-xs text-sidebar-foreground/70 truncate">{user.email}</p>
          {isAdmin && (
            <span className="inline-flex items-center gap-1 mt-1 text-xs bg-sidebar-accent text-sidebar-accent-foreground px-2 py-0.5 rounded">
              <Shield className="h-3 w-3" /> Admin
            </span>
          )}
        </div>
        <nav className="flex-1 p-2 space-y-1">
          <NavLinks isAdmin={isAdmin} location={location} />
        </nav>
        <div className="p-2 border-t border-sidebar-border">
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-sidebar-foreground hover:bg-sidebar-accent/50 min-h-[44px]" onClick={signOut}>
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
