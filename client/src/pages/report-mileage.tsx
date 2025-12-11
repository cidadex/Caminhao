import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Truck, MileageRecord } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Route, CalendarIcon, Filter, Sparkles, TrendingUp, Truck as TruckIcon, Navigation, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";

interface MileageReportData {
  records: (MileageRecord & { truck?: Truck })[];
  totals: { tripCount: number; totalKm: number; totalRevenue: number; avgValuePerKm: number; avgTripDistance: number };
  byRoute: { route: string; count: number; km: number; revenue: number }[];
  byTruck: { truck: string; trips: number; km: number; revenue: number }[];
}

const COLORS = ["#8b5cf6", "#06b6d4", "#10b981", "#f97316"];

export default function MileageReportPage() {
  const [startDate, setStartDate] = useState<Date | undefined>(
    new Date(new Date().getFullYear(), 0, 1)
  );
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  const [selectedTruck, setSelectedTruck] = useState<string>("all");

  const { data: trucks } = useQuery<Truck[]>({ queryKey: ["/api/trucks"] });

  const queryParams = new URLSearchParams();
  if (startDate) queryParams.set("startDate", startDate.toISOString());
  if (endDate) queryParams.set("endDate", endDate.toISOString());
  if (selectedTruck !== "all") queryParams.set("truckId", selectedTruck);

  const { data, isLoading } = useQuery<MileageReportData>({
    queryKey: ["/api/reports/mileage", queryParams.toString()],
  });

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  
  const formatNumber = (value: number) =>
    new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(value);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-5">
          {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-32" />)}
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="h-5 w-5 text-primary" />
          <span className="text-sm font-medium text-primary">Relatório Detalhado</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight" data-testid="text-report-mileage-title">
          Relatório de Quilometragem
        </h1>
        <p className="text-muted-foreground mt-1">Análise completa das viagens e faturamento</p>
      </div>

      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="h-4 w-4" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Data Inicial</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !startDate && "text-muted-foreground")} data-testid="button-mileage-start-date">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecione"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Data Final</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !endDate && "text-muted-foreground")} data-testid="button-mileage-end-date">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecione"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Caminhão</label>
              <Select value={selectedTruck} onValueChange={setSelectedTruck}>
                <SelectTrigger data-testid="select-mileage-truck">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os caminhões</SelectItem>
                  {trucks?.map((truck) => (
                    <SelectItem key={truck.id} value={truck.id}>Caminhão {truck.number}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {data?.totals && (
        <div className="grid gap-4 md:grid-cols-5">
          <Card className="border-0 shadow-lg bg-gradient-to-br from-emerald-500/5 to-teal-500/5">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg">
                  <DollarSign className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Faturamento</p>
                  <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400" data-testid="stat-mileage-revenue">
                    {formatCurrency(data.totals.totalRevenue)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-lg bg-gradient-to-br from-violet-500/5 to-purple-500/5">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg">
                  <Route className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total KM</p>
                  <p className="text-xl font-bold text-violet-700 dark:text-violet-400" data-testid="stat-mileage-km">
                    {formatNumber(data.totals.totalKm)} km
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-lg bg-gradient-to-br from-cyan-500/5 to-blue-500/5">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg">
                  <TruckIcon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Viagens</p>
                  <p className="text-xl font-bold text-cyan-700 dark:text-cyan-400" data-testid="stat-mileage-trips">
                    {data.totals.tripCount}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-500/5 to-indigo-500/5">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg">
                  <TrendingUp className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">R$/KM</p>
                  <p className="text-xl font-bold text-blue-700 dark:text-blue-400" data-testid="stat-mileage-avg">
                    {formatCurrency(data.totals.avgValuePerKm)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-lg bg-gradient-to-br from-amber-500/5 to-orange-500/5">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg">
                  <Navigation className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Média/Viagem</p>
                  <p className="text-xl font-bold text-amber-700 dark:text-amber-400" data-testid="stat-mileage-avgdist">
                    {formatNumber(data.totals.avgTripDistance)} km
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TruckIcon className="h-5 w-5" />
              Desempenho por Caminhão
            </CardTitle>
            <CardDescription>Faturamento e quilometragem por veículo</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              {data?.byTruck && data.byTruck.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.byTruck} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
                    <XAxis type="number" tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                    <YAxis dataKey="truck" type="category" width={80} />
                    <Tooltip formatter={(value: number, name: string) => [name === "km" ? `${formatNumber(value)} km` : formatCurrency(value), name === "km" ? "KM" : "Faturamento"]} />
                    <Legend />
                    <Bar dataKey="revenue" name="Faturamento" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
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

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Route className="h-5 w-5" />
              Rotas Mais Frequentes
            </CardTitle>
            <CardDescription>Top 10 rotas por número de viagens</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80 overflow-auto">
              {data?.byRoute && data.byRoute.length > 0 ? (
                <div className="space-y-3">
                  {data.byRoute.slice(0, 10).map((route, index) => (
                    <div key={index} className="p-3 rounded-lg bg-muted/30 flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate text-sm">{route.route}</p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                          <span>{route.count} viagens</span>
                          <span>{formatNumber(route.km)} km</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-emerald-600">{formatCurrency(route.revenue)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Nenhum dado disponível
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle>Histórico de Viagens</CardTitle>
          <CardDescription>
            {startDate && endDate
              ? `Período: ${format(startDate, "dd/MM/yyyy", { locale: ptBR })} - ${format(endDate, "dd/MM/yyyy", { locale: ptBR })}`
              : "Todos os registros"}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {data?.records && data.records.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Caminhão</TableHead>
                    <TableHead>Rota</TableHead>
                    <TableHead className="text-right">KM Inicial</TableHead>
                    <TableHead className="text-right">KM Final</TableHead>
                    <TableHead className="text-right">Percorridos</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-right">R$/KM</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.records.slice(0, 50).map((record) => (
                    <TableRow key={record.id} data-testid={`row-mileage-${record.id}`}>
                      <TableCell>{format(new Date(record.date), "dd/MM/yyyy", { locale: ptBR })}</TableCell>
                      <TableCell>
                        {record.truck ? `${record.truck.number} - ${record.truck.plate}` : "—"}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{record.route}</TableCell>
                      <TableCell className="text-right">{formatNumber(Number(record.kmInitial))}</TableCell>
                      <TableCell className="text-right">{formatNumber(Number(record.kmFinal))}</TableCell>
                      <TableCell className="text-right font-medium">{formatNumber(Number(record.kmTraveled))} km</TableCell>
                      <TableCell className="text-right font-medium text-emerald-600">
                        {formatCurrency(Number(record.valueReceived))}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatCurrency(Number(record.valuePerKm))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Route className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-lg font-medium">Nenhum registro encontrado</h3>
              <p className="text-muted-foreground mt-1">Ajuste os filtros ou cadastre viagens</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
