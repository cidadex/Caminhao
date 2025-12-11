import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
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
  Calendar,
  ArrowLeft,
  Loader2,
  Activity,
  Sparkles,
} from "lucide-react";

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
  summary: string;
  healthScore: number;
  riskLevel: "baixo" | "medio" | "alto";
  strengths: string[];
  criticalPoints: string[];
  routes: {
    problematicRoutes: string[];
    recommendations: string[];
  };
  drivers: {
    mainDrivers: string[];
    comparison: string;
    recommendations: string[];
  };
  costPrediction: {
    estimatedMaintenanceCost: number;
    nextMaintenanceKm: number;
    nextMaintenanceDate: string;
    warnings: string[];
  };
  fullReport: string;
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
                  size="sm"
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
      const response = await apiRequest("GET", `/api/fleet-health/${truckId}/diagnostic`);
      return response.json();
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
              Diagnóstico IA - {plate}
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
          <p className="text-muted-foreground">{diagnostic.summary}</p>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card data-testid="card-strengths">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2 text-green-600 dark:text-green-400">
              <CheckCircle className="h-5 w-5" />
              Pontos Fortes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {diagnostic.strengths.length > 0 ? (
              <ul className="space-y-2">
                {diagnostic.strengths.map((item, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 mt-0.5 text-green-600 dark:text-green-400 flex-shrink-0" />
                    <span className="text-sm">{item}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum ponto forte identificado</p>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-critical-points">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertTriangle className="h-5 w-5" />
              Pontos Críticos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {diagnostic.criticalPoints.length > 0 ? (
              <ul className="space-y-2">
                {diagnostic.criticalPoints.map((item, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 mt-0.5 text-red-600 dark:text-red-400 flex-shrink-0" />
                    <span className="text-sm">{item}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum ponto crítico identificado</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card data-testid="card-routes">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <RouteIcon className="h-5 w-5" />
              Análise de Rotas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {diagnostic.routes.problematicRoutes.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Rotas Problemáticas</h4>
                <ul className="space-y-1">
                  {diagnostic.routes.problematicRoutes.map((route, index) => (
                    <li key={index} className="text-sm text-muted-foreground">
                      {route}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div>
              <h4 className="text-sm font-medium mb-2">Recomendações</h4>
              <ul className="space-y-1">
                {diagnostic.routes.recommendations.map((rec, index) => (
                  <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                    <TrendingUp className="h-3 w-3 mt-1 flex-shrink-0" />
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-drivers">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5" />
              Análise de Motoristas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {diagnostic.drivers.mainDrivers.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Motoristas Principais</h4>
                <div className="flex flex-wrap gap-2">
                  {diagnostic.drivers.mainDrivers.map((driver, index) => (
                    <Badge key={index} variant="secondary">{driver}</Badge>
                  ))}
                </div>
              </div>
            )}
            {diagnostic.drivers.comparison && (
              <p className="text-sm text-muted-foreground">{diagnostic.drivers.comparison}</p>
            )}
            {diagnostic.drivers.recommendations.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Recomendações</h4>
                <ul className="space-y-1">
                  {diagnostic.drivers.recommendations.map((rec, index) => (
                    <li key={index} className="text-sm text-muted-foreground">
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card data-testid="card-predictions">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Previsões e Alertas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Custo Estimado (6 meses)</p>
              <p className="text-xl font-semibold">
                R$ {diagnostic.costPrediction.estimatedMaintenanceCost.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Próxima Manutenção (KM)</p>
              <p className="text-xl font-semibold">
                {diagnostic.costPrediction.nextMaintenanceKm.toLocaleString("pt-BR")} km
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Data Sugerida</p>
              <p className="text-xl font-semibold flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {diagnostic.costPrediction.nextMaintenanceDate || "A definir"}
              </p>
            </div>
          </div>

          {diagnostic.costPrediction.warnings.length > 0 && (
            <>
              <Separator className="my-4" />
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  Alertas
                </h4>
                <ul className="space-y-1">
                  {diagnostic.costPrediction.warnings.map((warning, index) => (
                    <li key={index} className="text-sm text-muted-foreground">
                      {warning}
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {diagnostic.fullReport && (
        <Card data-testid="card-full-report">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Relatório Completo
            </CardTitle>
            <CardDescription>
              Análise detalhada gerada por inteligência artificial
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {diagnostic.fullReport}
              </p>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function FleetHealthPage() {
  const [selectedTruckId, setSelectedTruckId] = useState<string | null>(null);
  const [selectedPlate, setSelectedPlate] = useState<string>("");

  const { data: trucks, isLoading } = useQuery<FleetHealthSummary[]>({
    queryKey: ["/api/fleet-health"],
  });

  const handleAnalyze = (truckId: string) => {
    const truck = trucks?.find(t => t.truckId === truckId);
    if (truck) {
      setSelectedPlate(truck.plate);
      setSelectedTruckId(truckId);
    }
  };

  if (selectedTruckId) {
    return (
      <DiagnosticView 
        truckId={selectedTruckId}
        plate={selectedPlate}
        onBack={() => setSelectedTruckId(null)}
      />
    );
  }

  const sortedTrucks = trucks?.sort((a, b) => a.healthScore - b.healthScore) || [];
  const averageScore = sortedTrucks.length > 0 
    ? Math.round(sortedTrucks.reduce((sum, t) => sum + t.healthScore, 0) / sortedTrucks.length)
    : 0;
  const highRiskCount = sortedTrucks.filter(t => t.riskLevel === "alto").length;
  const mediumRiskCount = sortedTrucks.filter(t => t.riskLevel === "medio").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <HeartPulse className="h-6 w-6" />
          Saúde da Frota
        </h1>
        <p className="text-muted-foreground">
          Análise inteligente da saúde dos seus caminhões com IA
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card data-testid="card-total-trucks">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
                <Truck className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total de Caminhões</p>
                <p className="text-2xl font-bold">{sortedTrucks.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-average-score">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
                <Activity className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Saúde Média</p>
                <p className={`text-2xl font-bold ${getScoreColor(averageScore)}`}>
                  {averageScore}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-high-risk">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Alto Risco</p>
                <p className="text-2xl font-bold text-destructive">{highRiskCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-medium-risk">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-yellow-500/10">
                <TrendingUp className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Médio Risco</p>
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  {mediumRiskCount}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-md" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-8 w-12" />
                </div>
                <Skeleton className="h-2 w-full" />
                <Skeleton className="h-9 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : sortedTrucks.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Truck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum caminhão cadastrado</h3>
            <p className="text-muted-foreground">
              Cadastre caminhões para ver a análise de saúde da frota.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sortedTrucks.map((truck) => (
            <TruckHealthCard 
              key={truck.truckId} 
              truck={truck} 
              onAnalyze={handleAnalyze}
            />
          ))}
        </div>
      )}
    </div>
  );
}
