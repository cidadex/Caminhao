import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { DollarSign, TrendingUp, TrendingDown, Truck, Wrench, Route, Trophy, ArrowUpRight, ArrowDownRight, Sparkles } from "lucide-react";

interface DashboardData {
  totalGrossRevenue: number;
  totalNetRevenue: number;
  totalKmTraveled: number;
  totalMaintenanceCost: number;
  truckCount: number;
  monthlyData: Array<{
    month: string;
    revenue: number;
    maintenance: number;
  }>;
  truckComparison: Array<{
    truck: string;
    grossRevenue: number;
    netRevenue: number;
    maintenanceCost: number;
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
          <div className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${gradient} shadow-lg`}>
            <Icon className="h-6 w-6 text-white" />
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

export default function DashboardPage() {
  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ["/api/dashboard"],
  });

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  const dashboardData = data || {
    totalGrossRevenue: 0,
    totalNetRevenue: 0,
    totalKmTraveled: 0,
    totalMaintenanceCost: 0,
    truckCount: 0,
    monthlyData: [],
    truckComparison: [],
    ranking: [],
  };

  const profitMargin = dashboardData.totalGrossRevenue > 0 
    ? ((dashboardData.totalNetRevenue / dashboardData.totalGrossRevenue) * 100).toFixed(1)
    : "0";

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
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20">
          <TrendingUp className="h-4 w-4 text-emerald-600" />
          <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
            Margem de lucro: {profitMargin}%
          </span>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
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
          description="Após custos de manutenção"
        />
        <StatCard
          title="Total KM Rodados"
          value={`${formatNumber(dashboardData.totalKmTraveled)} km`}
          icon={Route}
          gradient={gradients.km}
          description="Quilometragem total"
        />
        <StatCard
          title="Custos de Manutenção"
          value={formatCurrency(dashboardData.totalMaintenanceCost)}
          icon={Wrench}
          gradient={gradients.maintenance}
          description="Total em manutenções"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                    <TrendingUp className="h-4 w-4 text-white" />
                  </div>
                  Faturamento vs Manutenção
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
                      dataKey="maintenance"
                      name="Manutenção"
                      stroke="#f97316"
                      strokeWidth={3}
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
              <CardDescription>Caminhões ordenados por faturamento líquido</CardDescription>
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
