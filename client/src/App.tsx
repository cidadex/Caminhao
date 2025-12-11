import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { AuthProvider, useAuth } from "@/lib/auth";
import NotFound from "@/pages/not-found";
import LoginPage from "@/pages/login";
import DashboardPage from "@/pages/dashboard";
import TrucksPage from "@/pages/trucks";
import MileagePage from "@/pages/mileage";
import MaintenancesPage from "@/pages/maintenances";
import FuelPage from "@/pages/fuel";
import ExtraExpensesPage from "@/pages/extra-expenses";
import ReportsPage from "@/pages/reports";
import MaintenanceReportPage from "@/pages/report-maintenance";
import FuelReportPage from "@/pages/report-fuel";
import ExtrasReportPage from "@/pages/report-extras";
import MileageReportPage from "@/pages/report-mileage";
import { Loader2 } from "lucide-react";

function ProtectedRoute({ component: Component, adminOnly = false }: { component: () => JSX.Element; adminOnly?: boolean }) {
  const { user, isLoading, isAdmin } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  if (adminOnly && !isAdmin) {
    return <Redirect to="/" />;
  }

  return <Component />;
}

function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <>{children}</>;
  }

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <header className="flex h-14 items-center justify-between gap-4 border-b px-4 bg-background">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-auto p-4 sm:p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function Router() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/login">
        {user ? <Redirect to="/" /> : <LoginPage />}
      </Route>
      <Route path="/">
        <AuthenticatedLayout>
          <ProtectedRoute component={DashboardPage} />
        </AuthenticatedLayout>
      </Route>
      <Route path="/caminhoes">
        <AuthenticatedLayout>
          <ProtectedRoute component={TrucksPage} />
        </AuthenticatedLayout>
      </Route>
      <Route path="/km">
        <AuthenticatedLayout>
          <ProtectedRoute component={MileagePage} />
        </AuthenticatedLayout>
      </Route>
      <Route path="/manutencoes">
        <AuthenticatedLayout>
          <ProtectedRoute component={MaintenancesPage} />
        </AuthenticatedLayout>
      </Route>
      <Route path="/combustivel">
        <AuthenticatedLayout>
          <ProtectedRoute component={FuelPage} />
        </AuthenticatedLayout>
      </Route>
      <Route path="/gastos-extras">
        <AuthenticatedLayout>
          <ProtectedRoute component={ExtraExpensesPage} />
        </AuthenticatedLayout>
      </Route>
      <Route path="/relatorios">
        <AuthenticatedLayout>
          <ProtectedRoute component={ReportsPage} adminOnly />
        </AuthenticatedLayout>
      </Route>
      <Route path="/relatorios/manutencao">
        <AuthenticatedLayout>
          <ProtectedRoute component={MaintenanceReportPage} />
        </AuthenticatedLayout>
      </Route>
      <Route path="/relatorios/combustivel">
        <AuthenticatedLayout>
          <ProtectedRoute component={FuelReportPage} />
        </AuthenticatedLayout>
      </Route>
      <Route path="/relatorios/gastos-extras">
        <AuthenticatedLayout>
          <ProtectedRoute component={ExtrasReportPage} />
        </AuthenticatedLayout>
      </Route>
      <Route path="/relatorios/quilometragem">
        <AuthenticatedLayout>
          <ProtectedRoute component={MileageReportPage} />
        </AuthenticatedLayout>
      </Route>
      <Route>
        <AuthenticatedLayout>
          <NotFound />
        </AuthenticatedLayout>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Router />
          <Toaster />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
