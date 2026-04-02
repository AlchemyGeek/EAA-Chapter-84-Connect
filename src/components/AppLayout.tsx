import { Link, Outlet, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, LogOut } from "lucide-react";
import chapterLogo from "@/assets/chapter-logo.jpg";
import { Button } from "@/components/ui/button";

export default function AppLayout() {
  const { user, loading, signOut } = useAuth();

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-primary text-primary-foreground flex items-center justify-between px-4 h-14 shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild className="text-primary-foreground hover:bg-primary-foreground/10 min-h-[44px] min-w-[44px]">
            <Link to="/home"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <div className="flex items-center gap-2">
            <img src={chapterLogo} alt="EAA Chapter 84" className="h-7 w-7 rounded-full" />
            <span className="font-semibold text-sm hidden sm:inline">EAA 84 Connect</span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={signOut}
          className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10 min-h-[44px]"
        >
          <LogOut className="h-4 w-4 mr-1.5" />
          Sign Out
        </Button>
      </header>
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
