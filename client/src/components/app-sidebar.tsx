import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  LayoutDashboard,
  Truck,
  Route,
  Wrench,
  FileText,
  LogOut,
  User,
  Fuel,
  Receipt,
  ArrowDownCircle,
  ArrowUpCircle,
  Calculator,
  HeartPulse,
  MapPin,
  AlertTriangle,
  CalendarDays,
  Navigation,
} from "lucide-react";
import logoLight from "@/assets/logo-light.png";
import logoDark from "@/assets/logo-dark.png";

const menuItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Caminhões",
    url: "/caminhoes",
    icon: Truck,
  },
  {
    title: "Saúde da Frota",
    url: "/saude-frota",
    icon: HeartPulse,
  },
  {
    title: "Registro de KM",
    url: "/km",
    icon: Route,
  },
  {
    title: "Manutenções",
    url: "/manutencoes",
    icon: Wrench,
  },
  {
    title: "Combustível",
    url: "/combustivel",
    icon: Fuel,
  },
  {
    title: "Gastos Extras",
    url: "/gastos-extras",
    icon: Receipt,
  },
  {
    title: "Rotas",
    url: "/rotas",
    icon: MapPin,
  },
  {
    title: "Motoristas",
    url: "/motoristas",
    icon: User,
  },
  {
    title: "Multas",
    url: "/multas",
    icon: AlertTriangle,
  },
  {
    title: "Calendário",
    url: "/calendario",
    icon: CalendarDays,
  },
  {
    title: "Rastreamento",
    url: "/rastreamento",
    icon: Navigation,
  },
];

const financialItems = [
  {
    title: "Resumo Financeiro",
    url: "/financeiro",
    icon: Calculator,
  },
  {
    title: "Contas a Pagar",
    url: "/contas-pagar",
    icon: ArrowDownCircle,
  },
  {
    title: "Contas a Receber",
    url: "/contas-receber",
    icon: ArrowUpCircle,
  },
];

const reportItems = [
  {
    title: "Relatório Geral",
    url: "/relatorios",
    icon: FileText,
    adminOnly: true,
  },
  {
    title: "Manutenção",
    url: "/relatorios/manutencao",
    icon: Wrench,
  },
  {
    title: "Combustível",
    url: "/relatorios/combustivel",
    icon: Fuel,
  },
  {
    title: "Gastos Extras",
    url: "/relatorios/gastos-extras",
    icon: Receipt,
  },
  {
    title: "Quilometragem",
    url: "/relatorios/quilometragem",
    icon: Route,
  },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { user, logout, isAdmin } = useAuth();
  const { setOpenMobile, isMobile } = useSidebar();

  const handleLinkClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const filteredReportItems = reportItems.filter(
    (item) => !item.adminOnly || isAdmin
  );

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Sidebar>
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <img src={logoLight} alt="Seu Truck" className="h-10 hidden dark:block" />
          <img src={logoDark} alt="Seu Truck" className="h-10 dark:hidden" />
          <div>
            <p className="text-xs text-muted-foreground">Gestão de Frota</p>
          </div>
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground px-4">
            Menu Principal
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const isActive = location === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      className={isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : ""}
                    >
                      <Link href={item.url} onClick={handleLinkClick} data-testid={`nav-${item.url.replace("/", "") || "dashboard"}`}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground px-4">
            Financeiro
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {financialItems.map((item) => {
                const isActive = location === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      className={isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : ""}
                    >
                      <Link href={item.url} onClick={handleLinkClick} data-testid={`nav-${item.url.replace("/", "")}`}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground px-4">
            Relatórios
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredReportItems.map((item) => {
                const isActive = location === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      className={isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : ""}
                    >
                      <Link href={item.url} onClick={handleLinkClick} data-testid={`nav-report-${item.url.replace("/relatorios/", "").replace("/relatorios", "geral")}`}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground px-4">
            Usuário
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="px-4 py-2">
              <div className="flex items-center gap-3 mb-3">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                    {user ? getInitials(user.name) : <User className="h-4 w-4" />}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-sidebar-foreground truncate">
                    {user?.name || "Usuário"}
                  </p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {user?.role === "admin" ? "Administrador" : "Usuário"}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2"
                onClick={logout}
                data-testid="button-logout"
              >
                <LogOut className="h-4 w-4" />
                Sair
              </Button>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
