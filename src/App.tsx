import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
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
import MembershipBadges from "./pages/MembershipBadges";
import UserRoles from "./pages/UserRoles";
import VolunteeringOpportunities from "./pages/VolunteeringOpportunities";
import MemberVolunteering from "./pages/MemberVolunteering";
import NewMemberApplication from "./pages/NewMemberApplication";
import NewMemberApplications from "./pages/NewMemberApplications";
import BuddyProgram from "./pages/BuddyProgram";
import HangarTalk from "./pages/HangarTalk";
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
        <AuthProvider>
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
                <Route path="/membership-badges" element={<MembershipBadges />} />
                <Route path="/user-roles" element={<UserRoles />} />
                <Route path="/new-member-applications" element={<NewMemberApplications />} />
                <Route path="/buddy-program" element={<BuddyProgram />} />
            </Route>
            <Route path="/directory/:keyId" element={<MemberProfile />} />
            <Route path="/dues-payment" element={<DuesPayment />} />
            <Route path="/volunteering-opportunities" element={<VolunteeringOpportunities />} />
            <Route path="/member-volunteering" element={<MemberVolunteering />} />
            <Route path="/join" element={<NewMemberApplication />} />
            {/* <Route path="/hangar-talk" element={<HangarTalk />} /> */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
