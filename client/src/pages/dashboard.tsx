import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { DollarSign, TrendingUp, TrendingDown, Truck, Wrench, Route, Trophy, ArrowUpRight, ArrowDownRight, Sparkles, Fuel, Receipt, Wallet, Database, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface DashboardData {
  totalGrossRevenue: number;
  totalNetRevenue: number;
  totalKmTraveled: number;
  totalMaintenanceCost: number;
  totalFuelCost: number;
  totalExtraCost: number;
  totalOperationalCost: number;
  truckCount: number;
  monthlyData: Array<{
    month: string;
    revenue: number;
    maintenance: number;
    fuel: number;
    extra: number;
  }>;
  truckComparison: Array<{
    truck: string;
    grossRevenue: number;
    netRevenue: number;
    maintenanceCost: number;
    fuelCost: number;
    extraCost: number;
  }>;
  ranking: Array<{
    id: string;
    number: string;
    netRevenue: number;
    kmTraveled: number;
  }>;
}

const gradients = {
  revenue: "from-emerald-500 to-teal-600",
  net: "from-blue-500 to-indigo-600",
  km: "from-violet-500 to-purple-600",
  maintenance: "from-orange-500 to-red-500",
  fuel: "from-cyan-500 to-blue-500",
  extra: "from-amber-500 to-orange-500",
  cost: "from-rose-500 to-pink-600",
};

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  gradient,
  trend,
}: {
  title: string;
  value: string;
  description?: string;
  icon: typeof DollarSign;
  gradient: string;
  trend?: { value: number; positive: boolean };
}) {
  return (
    <Card className="relative overflow-hidden border-0 shadow-lg">
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-[0.08]`} />
      <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${gradient} opacity-[0.12] rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl`} />
      <CardContent className="relative p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold tracking-tight" data-testid={`stat-${title.toLowerCase().replace(/\s/g, "-")}`}>
              {value}
            </p>
            {trend && (
              <div className="flex items-center gap-1.5">
                {trend.positive ? (
                  <div className="flex items-center gap-1 text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                    <ArrowUpRight className="h-3 w-3" />
                    <span className="text-xs font-medium">+{trend.value}%</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-red-600 bg-red-500/10 px-2 py-0.5 rounded-full">
                    <ArrowDownRight className="h-3 w-3" />
                    <span className="text-xs font-medium">{trend.value}%</span>
                  </div>
                )}
                <span className="text-xs text-muted-foreground">vs. mês anterior</span>
              </div>
            )}
            {description && !trend && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} shadow-lg`}>
            <Icon className="h-5 w-5 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-8">
      <div>
        <Skeleton className="h-10 w-48 mb-2" />
        <Skeleton className="h-5 w-72" />
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="border-0 shadow-lg">
            <CardContent className="p-6">
              <Skeleton className="h-4 w-24 mb-4" />
              <Skeleton className="h-10 w-32 mb-3" />
              <Skeleton className="h-4 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-72 w-full rounded-xl" />
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-72 w-full rounded-xl" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("pt-BR").format(value);
}

const COST_COLORS = ["#f97316", "#06b6d4", "#f59e0b"];

export default function DashboardPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ["/api/dashboard"],
  });

  const seedMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest<{
        success: boolean;
        message: string;
        summary: {
          trucks: number;
          mileageRecords: number;
          fuelExpenses: number;
          maintenances: number;
          extraExpenses: number;
        };
      }>("POST", "/api/admin/seed-demo-data");
    },
    onSuccess: (data) => {
      toast({
        title: "Dados criados com sucesso!",
        description: `${data.summary.trucks} caminhões, ${data.summary.mileageRecords} viagens, ${data.summary.fuelExpenses} abastecimentos, ${data.summary.maintenances} manutenções e ${data.summary.extraExpenses} gastos extras.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/trucks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/mileage"] });
      queryClient.invalidateQueries({ queryKey: ["/api/fuel-expenses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/maintenances"] });
      queryClient.invalidateQueries({ queryKey: ["/api/extra-expenses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reports/maintenance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reports/fuel"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reports/extras"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reports/mileage"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar dados",
        description: error.message || "Ocorreu um erro ao criar os dados de demonstração.",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  const dashboardData = data || {
    totalGrossRevenue: 0,
    totalNetRevenue: 0,
    totalKmTraveled: 0,
    totalMaintenanceCost: 0,
    totalFuelCost: 0,
    totalExtraCost: 0,
    totalOperationalCost: 0,
    truckCount: 0,
    monthlyData: [],
    truckComparison: [],
    ranking: [],
  };

  const profitMargin = dashboardData.totalGrossRevenue > 0 
    ? ((dashboardData.totalNetRevenue / dashboardData.totalGrossRevenue) * 100).toFixed(1)
    : "0";

  const costBreakdown = [
    { name: "Manutenção", value: dashboardData.totalMaintenanceCost, color: "#f97316" },
    { name: "Combustível", value: dashboardData.totalFuelCost, color: "#06b6d4" },
    { name: "Extras", value: dashboardData.totalExtraCost, color: "#f59e0b" },
  ].filter(item => item.value > 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium text-primary">Visão Geral</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-dashboard-title">
            Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Acompanhe o desempenho da sua frota de {dashboardData.truckCount} caminhões
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {user?.role === "admin" && (
            <Button
              onClick={() => seedMutation.mutate()}
              disabled={seedMutation.isPending}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              data-testid="button-seed-demo-data"
            >
              {seedMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando dados...
                </>
              ) : (
                <>
                  <Database className="mr-2 h-4 w-4" />
                  Popular Dados de Demonstração
                </>
              )}
            </Button>
          )}
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20">
            <TrendingUp className="h-4 w-4 text-emerald-600" />
            <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
              Margem de lucro: {profitMargin}%
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Faturamento Bruto"
          value={formatCurrency(dashboardData.totalGrossRevenue)}
          icon={DollarSign}
          gradient={gradients.revenue}
          description={`${dashboardData.truckCount} caminhões ativos`}
        />
        <StatCard
          title="Faturamento Líquido"
          value={formatCurrency(dashboardData.totalNetRevenue)}
          icon={TrendingUp}
          gradient={gradients.net}
          description="Após todos os custos operacionais"
        />
        <StatCard
          title="Total KM Rodados"
          value={`${formatNumber(dashboardData.totalKmTraveled)} km`}
          icon={Route}
          gradient={gradients.km}
          description="Quilometragem total"
        />
        <StatCard
          title="Custo Operacional"
          value={formatCurrency(dashboardData.totalOperationalCost)}
          icon={Wallet}
          gradient={gradients.cost}
          description="Manutenção + Combustível + Extras"
        />
      </div>

      <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-3">
        <Card className="relative overflow-hidden border-0 shadow-lg">
          <div className={`absolute inset-0 bg-gradient-to-br ${gradients.maintenance} opacity-[0.05]`} />
          <CardContent className="relative p-5">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Manutenção</p>
                <p className="text-2xl font-bold" data-testid="stat-maintenance">
                  {formatCurrency(dashboardData.totalMaintenanceCost)}
                </p>
              </div>
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${gradients.maintenance}`}>
                <Wrench className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden border-0 shadow-lg">
          <div className={`absolute inset-0 bg-gradient-to-br ${gradients.fuel} opacity-[0.05]`} />
          <CardContent className="relative p-5">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Combustível</p>
                <p className="text-2xl font-bold" data-testid="stat-fuel">
                  {formatCurrency(dashboardData.totalFuelCost)}
                </p>
              </div>
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${gradients.fuel}`}>
                <Fuel className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden border-0 shadow-lg">
          <div className={`absolute inset-0 bg-gradient-to-br ${gradients.extra} opacity-[0.05]`} />
          <CardContent className="relative p-5">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Gastos Extras</p>
                <p className="text-2xl font-bold" data-testid="stat-extra">
                  {formatCurrency(dashboardData.totalExtraCost)}
                </p>
              </div>
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${gradients.extra}`}>
                <Receipt className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base sm:text-lg font-semibold flex items-center gap-2">
                  <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                    <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
                  </div>
                  Faturamento vs Custos
                </CardTitle>
                <CardDescription className="mt-1">Evolução mensal dos valores</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              {dashboardData.monthlyData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dashboardData.monthlyData} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorMaintenance" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorFuel" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" vertical={false} />
                    <XAxis 
                      dataKey="month" 
                      axisLine={false} 
                      tickLine={false} 
                      className="text-xs" 
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      className="text-xs" 
                      tickFormatter={(value) => `R$${(value / 1000).toFixed(0)}k`}
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                      labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "12px",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                      }}
                    />
                    <Legend 
                      wrapperStyle={{ paddingTop: 20 }}
                      formatter={(value) => <span className="text-sm font-medium">{value}</span>}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      name="Faturamento"
                      stroke="#10b981"
                      strokeWidth={3}
                      fill="url(#colorRevenue)"
                    />
                    <Area
                      type="monotone"
                      dataKey="fuel"
                      name="Combustível"
                      stroke="#06b6d4"
                      strokeWidth={2}
                      fill="url(#colorFuel)"
                    />
                    <Area
                      type="monotone"
                      dataKey="maintenance"
                      name="Manutenção"
                      stroke="#f97316"
                      strokeWidth={2}
                      fill="url(#colorMaintenance)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <TrendingUp className="h-12 w-12 mb-3 opacity-20" />
                  <p className="font-medium">Nenhum dado disponível</p>
                  <p className="text-sm">Registre viagens para ver o gráfico</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center">
                    <Wallet className="h-4 w-4 text-white" />
                  </div>
                  Breakdown de Custos
                </CardTitle>
                <CardDescription className="mt-1">Distribuição dos custos operacionais</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              {costBreakdown.length > 0 ? (
                <div className="flex items-center h-full">
                  <div className="w-1/2">
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={costBreakdown}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {costBreakdown.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number) => formatCurrency(value)}
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "12px",
                            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="w-1/2 space-y-4">
                    {costBreakdown.map((item, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: item.color }} />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{item.name}</p>
                          <p className="text-lg font-bold">{formatCurrency(item.value)}</p>
                          <p className="text-xs text-muted-foreground">
                            {((item.value / dashboardData.totalOperationalCost) * 100).toFixed(1)}% do total
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <Wallet className="h-12 w-12 mb-3 opacity-20" />
                  <p className="font-medium">Nenhum custo registrado</p>
                  <p className="text-sm">Registre manutenções ou abastecimentos</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-1">
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                    <Truck className="h-4 w-4 text-white" />
                  </div>
                  Desempenho por Caminhão
                </CardTitle>
                <CardDescription className="mt-1">Faturamento bruto por veículo</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              {dashboardData.truckComparison.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dashboardData.truckComparison} layout="vertical" margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="barGradient" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#8b5cf6"/>
                        <stop offset="100%" stopColor="#6366f1"/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" horizontal={false} />
                    <XAxis 
                      type="number" 
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(value) => `R$${(value / 1000).toFixed(0)}k`}
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <YAxis 
                      dataKey="truck" 
                      type="category" 
                      width={90} 
                      axisLine={false}
                      tickLine={false}
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                      labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "12px",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                      }}
                    />
                    <Bar 
                      dataKey="grossRevenue" 
                      name="Faturamento" 
                      fill="url(#barGradient)" 
                      radius={[0, 6, 6, 0]}
                      barSize={24}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <Truck className="h-12 w-12 mb-3 opacity-20" />
                  <p className="font-medium">Nenhum dado disponível</p>
                  <p className="text-sm">Cadastre caminhões para ver o gráfico</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg">
              <Trophy className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold">Ranking de Lucratividade</CardTitle>
              <CardDescription>Caminhões ordenados por faturamento líquido (após todos os custos)</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {dashboardData.ranking.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {dashboardData.ranking.slice(0, 8).map((truck, index) => (
                <div
                  key={truck.id}
                  className={`relative p-5 rounded-2xl transition-all duration-200 hover:-translate-y-1 ${
                    index === 0 
                      ? "bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-2 border-amber-500/30" 
                      : index === 1
                      ? "bg-gradient-to-br from-slate-300/10 to-slate-400/10 border border-slate-300/30"
                      : index === 2
                      ? "bg-gradient-to-br from-orange-600/10 to-amber-700/10 border border-orange-600/30"
                      : "bg-muted/30 border border-border/50"
                  }`}
                  data-testid={`ranking-truck-${truck.id}`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl font-bold text-lg ${
                      index === 0 
                        ? "bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg" 
                        : index === 1
                        ? "bg-gradient-to-br from-slate-400 to-slate-500 text-white"
                        : index === 2
                        ? "bg-gradient-to-br from-orange-600 to-amber-700 text-white"
                        : "bg-muted text-muted-foreground"
                    }`}>
                      {index + 1}
                    </div>
                    {index === 0 && (
                      <Badge className="bg-gradient-to-r from-amber-500 to-orange-600 text-white border-0 shadow">
                        Top
                      </Badge>
                    )}
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4 text-muted-foreground" />
                      <span className="font-semibold text-lg">Caminhão {truck.number}</span>
                    </div>
                    <p className="text-2xl font-bold text-primary">
                      {formatCurrency(truck.netRevenue)}
                    </p>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Route className="h-3 w-3" />
                      <span className="text-sm">{formatNumber(truck.kmTraveled)} km rodados</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="flex h-16 w-16 mx-auto mb-4 items-center justify-center rounded-2xl bg-muted/50">
                <Truck className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <h3 className="text-lg font-medium">Nenhum caminhão cadastrado</h3>
              <p className="text-muted-foreground mt-1 text-sm">
                Cadastre seus caminhões para ver o ranking de lucratividade
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
