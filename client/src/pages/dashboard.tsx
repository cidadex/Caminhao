import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { DollarSign, TrendingUp, Truck, Wrench, Route, Trophy } from "lucide-react";

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

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
}: {
  title: string;
  value: string;
  description?: string;
  icon: typeof DollarSign;
  trend?: { value: number; positive: boolean };
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold" data-testid={`stat-${title.toLowerCase().replace(/\s/g, "-")}`}>
          {value}
        </div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
        {trend && (
          <div className="flex items-center gap-1 mt-2">
            <TrendingUp
              className={`h-3 w-3 ${trend.positive ? "text-green-500" : "text-red-500 rotate-180"}`}
            />
            <span
              className={`text-xs ${trend.positive ? "text-green-500" : "text-red-500"}`}
            >
              {trend.positive ? "+" : ""}{trend.value}% vs mês anterior
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-3 w-20 mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-dashboard-title">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral da sua frota de caminhões</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Faturamento Bruto"
          value={formatCurrency(dashboardData.totalGrossRevenue)}
          icon={DollarSign}
        />
        <StatCard
          title="Faturamento Líquido"
          value={formatCurrency(dashboardData.totalNetRevenue)}
          icon={TrendingUp}
        />
        <StatCard
          title="Total KM Rodados"
          value={`${formatNumber(dashboardData.totalKmTraveled)} km`}
          icon={Route}
        />
        <StatCard
          title="Gastos com Manutenção"
          value={formatCurrency(dashboardData.totalMaintenanceCost)}
          icon={Wrench}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Faturamento vs Manutenção
            </CardTitle>
            <CardDescription>Comparativo mensal</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              {dashboardData.monthlyData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dashboardData.monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" className="text-xs" />
                    <YAxis className="text-xs" tickFormatter={(value) => `R$${value / 1000}k`} />
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                      labelStyle={{ color: "var(--foreground)" }}
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "var(--radius)",
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      name="Faturamento"
                      stroke="hsl(var(--chart-1))"
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="maintenance"
                      name="Manutenção"
                      stroke="hsl(var(--chart-5))"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Nenhum dado disponível
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-4 w-4" />
              Comparativo por Caminhão
            </CardTitle>
            <CardDescription>Faturamento bruto por veículo</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              {dashboardData.truckComparison.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dashboardData.truckComparison} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" tickFormatter={(value) => `R$${value / 1000}k`} />
                    <YAxis dataKey="truck" type="category" width={80} className="text-xs" />
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                      labelStyle={{ color: "var(--foreground)" }}
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "var(--radius)",
                      }}
                    />
                    <Bar dataKey="grossRevenue" name="Faturamento" fill="hsl(var(--chart-1))" radius={4} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Nenhum dado disponível
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            Ranking de Caminhões Mais Lucrativos
          </CardTitle>
          <CardDescription>Ordenado por faturamento líquido</CardDescription>
        </CardHeader>
        <CardContent>
          {dashboardData.ranking.length > 0 ? (
            <div className="space-y-3">
              {dashboardData.ranking.map((truck, index) => (
                <div
                  key={truck.id}
                  className="flex items-center gap-4 p-3 rounded-md bg-muted/50"
                  data-testid={`ranking-truck-${truck.id}`}
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Caminhão {truck.number}</span>
                      {index === 0 && (
                        <Badge variant="default" className="text-xs">
                          Top
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {formatNumber(truck.kmTraveled)} km rodados
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">{formatCurrency(truck.netRevenue)}</p>
                    <p className="text-xs text-muted-foreground">líquido</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Truck className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Nenhum caminhão cadastrado</p>
              <p className="text-sm">Cadastre seus caminhões para ver o ranking</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
