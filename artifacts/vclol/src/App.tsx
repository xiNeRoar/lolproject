import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

// Public Pages
import Home from "@/pages/public/Home";
import About from "@/pages/public/About";
import Interest from "@/pages/public/Interest";
import Events from "@/pages/public/Events";
import EventDetail from "@/pages/public/EventDetail";
import Results from "@/pages/public/Results";
import Vods from "@/pages/public/Vods";
import Contact from "@/pages/public/Contact";

// Admin Pages
import Login from "@/pages/admin/Login";
import Dashboard from "@/pages/admin/Dashboard";
import ManageInterests from "@/pages/admin/ManageInterests";
import ManageEvents from "@/pages/admin/ManageEvents";
import ManageRegistrations from "@/pages/admin/ManageRegistrations";
import ManageMatches from "@/pages/admin/ManageMatches";
import ManageVods from "@/pages/admin/ManageVods";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/about" component={About} />
      <Route path="/interest" component={Interest} />
      <Route path="/events" component={Events} />
      <Route path="/events/:slug" component={EventDetail} />
      <Route path="/results" component={Results} />
      <Route path="/vods" component={Vods} />
      <Route path="/contact" component={Contact} />
      
      <Route path="/admin/login" component={Login} />
      <Route path="/admin" component={Dashboard} />
      <Route path="/admin/interests" component={ManageInterests} />
      <Route path="/admin/events" component={ManageEvents} />
      <Route path="/admin/registrations" component={ManageRegistrations} />
      <Route path="/admin/matches" component={ManageMatches} />
      <Route path="/admin/vods" component={ManageVods} />
      
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
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
