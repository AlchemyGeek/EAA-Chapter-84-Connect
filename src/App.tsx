import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import AppLayout from "./components/AppLayout";
import Members from "./pages/Members";
import MemberDetail from "./pages/MemberDetail";
import Import from "./pages/Import";
import ImportHistory from "./pages/ImportHistory";
import ImportReport from "./pages/ImportReport";
import Export from "./pages/Export";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route element={<AppLayout />}>
            <Route path="/members" element={<Members />} />
            <Route path="/members/:keyId" element={<MemberDetail />} />
            <Route path="/import" element={<Import />} />
            <Route path="/imports" element={<ImportHistory />} />
            <Route path="/imports/:importId" element={<ImportReport />} />
            <Route path="/export" element={<Export />} />
          </Route>
          <Route path="/" element={<Navigate to="/members" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
