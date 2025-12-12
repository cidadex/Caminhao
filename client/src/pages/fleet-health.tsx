import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  HeartPulse,
  Truck,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Wrench,
  Route as RouteIcon,
  User,
  DollarSign,
  ArrowLeft,
  Loader2,
  Activity,
  Sparkles,
  BarChart3,
  PieChart as PieChartIcon,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

interface FleetHealthSummary {
  truckId: string;
  plate: string;
  model: string;
  year: number;
  totalKm: number;
  mainDriverName: string | null;
  healthScore: number;
  riskLevel: "baixo" | "medio" | "alto";
}

interface FleetHealthDiagnostic {
  truckId: string;
  truckLabel: string;
  healthScore: number;
  riskLevel: "baixo" | "medio" | "alto";
  summary: {
    overview: string;
  };
  sections: {
    vehicleHealth: {
      title: string;
      text: string;
      mainIssues: string[];
      positivePoints: string[];
    };
    routes: {
      title: string;
      text: string;
      riskyRoutes: string[];
      recommendations: string[];
    };
    drivers: {
      title: string;
      text: string;
      mainDrivers: Array<{
        nome: string;
        resumo: string;
      }>;
      recommendations: string[];
    };
    costForecast: {
      title: string;
      text: string;
      estimatedMonthlyMaintenanceCost: number;
      nextMaintenanceSuggestion: string;
      alerts: string[];
    };
  };
}

function getRiskBadgeVariant(riskLevel: string): "default" | "secondary" | "destructive" {
  switch (riskLevel) {
    case "alto":
      return "destructive";
    case "medio":
      return "secondary";
    default:
      return "default";
  }
}

function getRiskLabel(riskLevel: string): string {
  switch (riskLevel) {
    case "alto":
      return "Alto Risco";
    case "medio":
      return "Médio Risco";
    default:
      return "Baixo Risco";
  }
}

function getScoreColor(score: number): string {
  if (score >= 70) return "text-green-600 dark:text-green-400";
  if (score >= 50) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-600 dark:text-red-400";
}

const RISK_COLORS = {
  baixo: "#22c55e",
  medio: "#eab308",
  alto: "#ef4444",
};

function FleetChartsSection({ trucks }: { trucks: FleetHealthSummary[] }) {
  const barChartData = trucks.map((t) => ({
    name: t.plate,
    score: t.healthScore,
    fill: RISK_COLORS[t.riskLevel],
  }));

  const riskDistribution = trucks.reduce(
    (acc, t) => {
      acc[t.riskLevel] = (acc[t.riskLevel] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const pieChartData = [
    { name: "Baixo Risco", value: riskDistribution.baixo || 0, color: RISK_COLORS.baixo },
    { name: "Médio Risco", value: riskDistribution.medio || 0, color: RISK_COLORS.medio },
    { name: "Alto Risco", value: riskDistribution.alto || 0, color: RISK_COLORS.alto },
  ].filter((d) => d.value > 0);

  const avgScore = trucks.length > 0 
    ? Math.round(trucks.reduce((sum, t) => sum + t.healthScore, 0) / trucks.length)
    : 0;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Média de Saúde da Frota
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <div className={`text-5xl font-bold ${getScoreColor(avgScore)}`}>
              {avgScore}
              <span className="text-lg font-normal text-muted-foreground">/100</span>
            </div>
          </div>
          <Progress value={avgScore} className="h-3" />
          <p className="text-center text-sm text-muted-foreground mt-2">
            {trucks.length} caminhões analisados
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Saúde por Caminhão
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barChartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} />
                <YAxis dataKey="name" type="category" width={70} tick={{ fontSize: 11 }} />
                <Tooltip 
                  formatter={(value: number) => [`${value} pontos`, "Saúde"]}
                  contentStyle={{ fontSize: 12 }}
                />
                <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                  {barChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <PieChartIcon className="h-4 w-4" />
            Distribuição de Risco
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, value }) => `${value}`}
                  labelLine={false}
                >
                  {pieChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number, name: string) => [`${value} caminhões`, name]} />
                <Legend 
                  verticalAlign="bottom" 
                  height={36}
                  formatter={(value) => <span className="text-xs">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function TruckHealthCard({ 
  truck, 
  onAnalyze 
}: { 
  truck: FleetHealthSummary; 
  onAnalyze: (truckId: string) => void;
}) {
  return (
    <Card className="hover-elevate" data-testid={`card-truck-${truck.truckId}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted">
              <Truck className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold truncate">{truck.plate}</h3>
                <Badge 
                  variant={getRiskBadgeVariant(truck.riskLevel)} 
                  data-testid={`badge-risk-${truck.truckId}`}
                >
                  {getRiskLabel(truck.riskLevel)}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {truck.model} ({truck.year})
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className={`text-2xl font-bold ${getScoreColor(truck.healthScore)}`}>
              {truck.healthScore}
            </div>
            <span className="text-xs text-muted-foreground">Saúde</span>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <Progress 
            value={truck.healthScore} 
            className="h-2"
          />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{truck.totalKm.toLocaleString("pt-BR")} km</span>
            {truck.mainDriverName && (
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {truck.mainDriverName}
              </span>
            )}
          </div>
        </div>

        <Button 
          variant="outline" 
          size="sm" 
          className="w-full mt-4"
          onClick={() => onAnalyze(truck.truckId)}
          data-testid={`button-analyze-${truck.truckId}`}
        >
          <Sparkles className="h-4 w-4 mr-2" />
          Analisar com IA
        </Button>
      </CardContent>
    </Card>
  );
}

function DiagnosticView({ 
  truckId, 
  plate,
  onBack 
}: { 
  truckId: string;
  plate: string;
  onBack: () => void;
}) {
  const { toast } = useToast();
  
  const { data: diagnostic, isLoading, error } = useQuery<FleetHealthDiagnostic>({
    queryKey: ["/api/fleet-health", truckId, "diagnostic"],
    queryFn: async () => {
      return await apiRequest<FleetHealthDiagnostic>("GET", `/api/fleet-health/${truckId}/diagnostic`);
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-xl font-semibold">Analisando {plate}...</h2>
        </div>
        <Card>
          <CardContent className="p-8 flex flex-col items-center justify-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-muted-foreground">
              Gerando diagnóstico inteligente com IA...
            </p>
            <p className="text-xs text-muted-foreground">
              Isso pode levar alguns segundos
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !diagnostic) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-xl font-semibold">Diagnóstico de {plate}</h2>
        </div>
        <Card>
          <CardContent className="p-8 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Não foi possível gerar o diagnóstico. Tente novamente mais tarde.
            </p>
            <Button className="mt-4" onClick={onBack}>
              Voltar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack} data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              Diagnóstico IA - {diagnostic.truckLabel || plate}
              <Badge variant={getRiskBadgeVariant(diagnostic.riskLevel)}>
                {getRiskLabel(diagnostic.riskLevel)}
              </Badge>
            </h2>
            <p className="text-sm text-muted-foreground">
              Análise gerada com inteligência artificial
            </p>
          </div>
        </div>
        <div className={`text-4xl font-bold ${getScoreColor(diagnostic.healthScore)}`}>
          {diagnostic.healthScore}
          <span className="text-sm font-normal text-muted-foreground ml-1">/ 100</span>
        </div>
      </div>

      <Card data-testid="card-summary">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Resumo Geral
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{diagnostic.summary.overview}</p>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card data-testid="card-vehicle-health">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              {diagnostic.sections.vehicleHealth.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{diagnostic.sections.vehicleHealth.text}</p>
            
            {diagnostic.sections.vehicleHealth.positivePoints.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 text-green-600 dark:text-green-400">Pontos Positivos</h4>
                <ul className="space-y-1">
                  {diagnostic.sections.vehicleHealth.positivePoints.map((item, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 mt-0.5 text-green-600 dark:text-green-400 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {diagnostic.sections.vehicleHealth.mainIssues.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 text-red-600 dark:text-red-400">Problemas Principais</h4>
                <ul className="space-y-1">
                  {diagnostic.sections.vehicleHealth.mainIssues.map((item, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <AlertTriangle className="h-4 w-4 mt-0.5 text-red-600 dark:text-red-400 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-routes">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <RouteIcon className="h-5 w-5" />
              {diagnostic.sections.routes.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{diagnostic.sections.routes.text}</p>
            
            {diagnostic.sections.routes.riskyRoutes.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Rotas de Risco</h4>
                <ul className="space-y-1">
                  {diagnostic.sections.routes.riskyRoutes.map((route, index) => (
                    <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                      <AlertTriangle className="h-3 w-3 mt-1 flex-shrink-0 text-yellow-600" />
                      {route}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {diagnostic.sections.routes.recommendations.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Recomendações</h4>
                <ul className="space-y-1">
                  {diagnostic.sections.routes.recommendations.map((rec, index) => (
                    <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                      <TrendingUp className="h-3 w-3 mt-1 flex-shrink-0" />
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card data-testid="card-drivers">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5" />
              {diagnostic.sections.drivers.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{diagnostic.sections.drivers.text}</p>
            
            {diagnostic.sections.drivers.mainDrivers.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Motoristas Principais</h4>
                <div className="space-y-2">
                  {diagnostic.sections.drivers.mainDrivers.map((driver, index) => (
                    <div key={index} className="p-2 rounded-md bg-muted/50">
                      <p className="font-medium text-sm">{driver.nome}</p>
                      <p className="text-xs text-muted-foreground">{driver.resumo}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {diagnostic.sections.drivers.recommendations.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Recomendações</h4>
                <ul className="space-y-1">
                  {diagnostic.sections.drivers.recommendations.map((rec, index) => (
                    <li key={index} className="text-sm text-muted-foreground">
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-cost-forecast">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              {diagnostic.sections.costForecast.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{diagnostic.sections.costForecast.text}</p>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-md bg-muted/50">
                <p className="text-xs text-muted-foreground">Custo Mensal Estimado</p>
                <p className="text-lg font-semibold">
                  R$ {diagnostic.sections.costForecast.estimatedMonthlyMaintenanceCost.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="p-3 rounded-md bg-muted/50">
                <p className="text-xs text-muted-foreground">Próxima Manutenção</p>
                <p className="text-sm font-medium">
                  {diagnostic.sections.costForecast.nextMaintenanceSuggestion || "A definir"}
                </p>
              </div>
            </div>
            
            {diagnostic.sections.costForecast.alerts.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 text-red-600 dark:text-red-400">Alertas</h4>
                <ul className="space-y-1">
                  {diagnostic.sections.costForecast.alerts.map((alert, index) => (
                    <li key={index} className="text-sm text-red-600 dark:text-red-400 flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      {alert}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function FleetHealthPage() {
  const [selectedTruckId, setSelectedTruckId] = useState<string | null>(null);
  const [selectedTruckPlate, setSelectedTruckPlate] = useState<string>("");

  const { data: trucks, isLoading, error } = useQuery<FleetHealthSummary[]>({
    queryKey: ["/api/fleet-health"],
  });

  const handleAnalyze = (truckId: string) => {
    const truck = trucks?.find((t) => t.truckId === truckId);
    if (truck) {
      setSelectedTruckPlate(truck.plate);
      setSelectedTruckId(truckId);
    }
  };

  const handleBack = () => {
    setSelectedTruckId(null);
    setSelectedTruckPlate("");
  };

  if (selectedTruckId) {
    return (
      <div className="p-6">
        <DiagnosticView 
          truckId={selectedTruckId} 
          plate={selectedTruckPlate}
          onBack={handleBack}
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-5 w-96" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !trucks) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Não foi possível carregar os dados da frota.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium text-primary">Inteligência Artificial</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2" data-testid="text-fleet-health-title">
            <HeartPulse className="h-8 w-8" />
            Saúde da Frota
          </h1>
          <p className="text-muted-foreground mt-1">
            Análise inteligente de diagnóstico e prevenção para seus caminhões
          </p>
        </div>
      </div>

      {trucks.length > 0 && <FleetChartsSection trucks={trucks} />}

      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Truck className="h-5 w-5" />
          Caminhões ({trucks.length})
        </h2>
        
        {trucks.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {trucks.map((truck) => (
              <TruckHealthCard
                key={truck.truckId}
                truck={truck}
                onAnalyze={handleAnalyze}
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <Truck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum caminhão cadastrado</h3>
              <p className="text-muted-foreground">
                Cadastre caminhões para ver a análise de saúde da frota.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
