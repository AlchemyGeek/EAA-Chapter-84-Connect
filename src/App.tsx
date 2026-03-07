import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import MemberHome from "./pages/MemberHome";
import AppLayout from "./components/AppLayout";
import Members from "./pages/Members";
import MemberDetail from "./pages/MemberDetail";
import MemberProfile from "./pages/MemberProfile";
import Import from "./pages/Import";
import ImportHistory from "./pages/ImportHistory";
import ImportReport from "./pages/ImportReport";
import Export from "./pages/Export";
import SiteConfig from "./pages/SiteConfig";
import MembershipStatistics from "./pages/MembershipStatistics";
import DuesPayment from "./pages/DuesPayment";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/home" element={<MemberHome />} />
          {/* Admin routes still use the sidebar layout */}
          <Route element={<AppLayout />}>
            <Route path="/members" element={<Members />} />
            <Route path="/members/:keyId" element={<MemberDetail />} />
            <Route path="/import" element={<Import />} />
            <Route path="/imports" element={<ImportHistory />} />
            <Route path="/imports/:importId" element={<ImportReport />} />
            <Route path="/export" element={<Export />} />
            <Route path="/site-config" element={<SiteConfig />} />
            <Route path="/membership-stats" element={<MembershipStatistics />} />
          </Route>
          <Route path="/directory/:keyId" element={<MemberProfile />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
