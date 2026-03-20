import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import Home from "@/pages/public/Home";
import About from "@/pages/public/About";
import Register from "@/pages/public/Register";
import PlayerLogin from "@/pages/public/PlayerLogin";
import PlayerDashboard from "@/pages/public/PlayerDashboard";
import Events from "@/pages/public/Events";
import EventDetail from "@/pages/public/EventDetail";
import Vods from "@/pages/public/Vods";
import VodDetail from "@/pages/public/VodDetail";
import Teams from "@/pages/public/Teams";
import TeamProfile from "@/pages/public/TeamProfile";
import PlayerProfile from "@/pages/public/PlayerProfile";
import Players from "@/pages/public/Players";
import DevLogin from "@/pages/public/DevLogin";
import Contact from "@/pages/public/Contact";
import MatchDetail from "@/pages/public/MatchDetail";
import CaptainHub from "@/pages/public/CaptainHub";

import Login from "@/pages/admin/Login";
import Dashboard from "@/pages/admin/Dashboard";
import ManageEvents from "@/pages/admin/ManageEvents";
import ManageEventDetail from "@/pages/admin/ManageEventDetail";
import ManageRegistrations from "@/pages/admin/ManageRegistrations";
import ManageMatches from "@/pages/admin/ManageMatches";
import ManageVods from "@/pages/admin/ManageVods";
import ManagePlayers from "@/pages/admin/ManagePlayers";
import ManageTeams from "@/pages/admin/ManageTeams";
import ManageSeasons from "@/pages/admin/ManageSeasons";
import ManageSeasonDetail from "@/pages/admin/ManageSeasonDetail";
import ManageLadderSettings from "@/pages/admin/ManageLadderSettings";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/about" component={About} />
      <Route path="/interest">{() => { window.location.replace("/register"); return null; }}</Route>
      <Route path="/register" component={Register} />
      <Route path="/login" component={PlayerLogin} />
      <Route path="/dashboard" component={PlayerDashboard} />
      <Route path="/events" component={Events} />
      <Route path="/events/:slug" component={EventDetail} />
      <Route path="/vods" component={Vods} />
      <Route path="/vods/:id" component={VodDetail} />
      <Route path="/teams" component={Teams} />
      <Route path="/teams/:id/manage" component={CaptainHub} />
      <Route path="/teams/:id" component={TeamProfile} />
      <Route path="/ladder">{() => { window.location.replace("/teams"); return null; }}</Route>
      <Route path="/players" component={Players} />
      <Route path="/players/:riotId" component={PlayerProfile} />
      <Route path="/contact" component={Contact} />
      <Route path="/dev-login" component={DevLogin} />
      <Route path="/matches/:id" component={MatchDetail} />
      
      <Route path="/admin/login" component={Login} />
      <Route path="/admin" component={Dashboard} />
      <Route path="/admin/events" component={ManageEvents} />
      <Route path="/admin/events/:id" component={ManageEventDetail} />
      <Route path="/admin/registrations" component={ManageRegistrations} />
      <Route path="/admin/matches" component={ManageMatches} />
      <Route path="/admin/vods" component={ManageVods} />
      <Route path="/admin/players" component={ManagePlayers} />
      <Route path="/admin/teams" component={ManageTeams} />
      <Route path="/admin/seasons" component={ManageSeasons} />
      <Route path="/admin/seasons/:id" component={ManageSeasonDetail} />
      <Route path="/admin/ladder-settings" component={ManageLadderSettings} />
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
        <Sonner />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
