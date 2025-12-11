import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Truck, FuelExpense } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Fuel, CalendarIcon, Filter, Sparkles, Droplets, DollarSign, Gauge } from "lucide-react";
import { cn } from "@/lib/utils";

interface FuelReportData {
  records: (FuelExpense & { truck?: Truck })[];
  totals: { count: number; totalCost: number; totalLiters: number; avgPricePerLiter: number };
  byVendor: { vendor: string; cost: number; liters: number }[];
  byTruck: { truck: string; cost: number; liters: number }[];
}

const COLORS = ["#06b6d4", "#8b5cf6", "#10b981", "#f97316", "#ef4444", "#f59e0b", "#ec4899", "#6366f1"];

export default function FuelReportPage() {
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

  const { data, isLoading } = useQuery<FuelReportData>({
    queryKey: ["/api/reports/fuel", queryParams.toString()],
  });

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  
  const formatNumber = (value: number) =>
    new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(value);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-32" />)}
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
        <h1 className="text-3xl font-bold tracking-tight" data-testid="text-report-fuel-title">
          Relatório de Combustível
        </h1>
        <p className="text-muted-foreground mt-1">Análise completa dos gastos com abastecimento</p>
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
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !startDate && "text-muted-foreground")} data-testid="button-fuel-start-date">
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
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !endDate && "text-muted-foreground")} data-testid="button-fuel-end-date">
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
                <SelectTrigger data-testid="select-fuel-truck">
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
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="border-0 shadow-lg bg-gradient-to-br from-cyan-500/5 to-blue-500/5">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg">
                  <DollarSign className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Gasto</p>
                  <p className="text-2xl font-bold text-cyan-700 dark:text-cyan-400" data-testid="stat-fuel-total">
                    {formatCurrency(data.totals.totalCost)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-500/5 to-indigo-500/5">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg">
                  <Droplets className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Litros</p>
                  <p className="text-2xl font-bold text-blue-700 dark:text-blue-400" data-testid="stat-fuel-liters">
                    {formatNumber(data.totals.totalLiters)} L
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-lg bg-gradient-to-br from-violet-500/5 to-purple-500/5">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg">
                  <Fuel className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Abastecimentos</p>
                  <p className="text-2xl font-bold text-violet-700 dark:text-violet-400" data-testid="stat-fuel-count">
                    {data.totals.count}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-lg bg-gradient-to-br from-emerald-500/5 to-teal-500/5">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg">
                  <Gauge className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Preço Médio/L</p>
                  <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400" data-testid="stat-fuel-avg">
                    {formatCurrency(data.totals.avgPricePerLiter)}
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
              <Fuel className="h-5 w-5" />
              Gastos por Fornecedor
            </CardTitle>
            <CardDescription>Distribuição por posto/fornecedor</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              {data?.byVendor && data.byVendor.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={data.byVendor} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="cost" nameKey="vendor" label={({ vendor }) => vendor}>
                      {data.byVendor.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                  </PieChart>
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
              <Fuel className="h-5 w-5" />
              Consumo por Caminhão
            </CardTitle>
            <CardDescription>Litros abastecidos por veículo</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              {data?.byTruck && data.byTruck.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.byTruck} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
                    <XAxis type="number" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k L`} />
                    <YAxis dataKey="truck" type="category" width={80} />
                    <Tooltip formatter={(value: number, name: string) => [name === "liters" ? `${formatNumber(value)} L` : formatCurrency(value), name === "liters" ? "Litros" : "Custo"]} />
                    <Legend />
                    <Bar dataKey="liters" name="Litros" fill="#06b6d4" radius={[0, 4, 4, 0]} />
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

      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle>Histórico de Abastecimentos</CardTitle>
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
                    <TableHead>Fornecedor</TableHead>
                    <TableHead className="text-right">Litros</TableHead>
                    <TableHead className="text-right">R$/Litro</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Pagamento</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.records.slice(0, 50).map((record) => (
                    <TableRow key={record.id} data-testid={`row-fuel-${record.id}`}>
                      <TableCell>{format(new Date(record.date), "dd/MM/yyyy", { locale: ptBR })}</TableCell>
                      <TableCell>
                        {record.truck ? `${record.truck.number} - ${record.truck.plate}` : "—"}
                      </TableCell>
                      <TableCell>{record.vendor || "—"}</TableCell>
                      <TableCell className="text-right">{formatNumber(Number(record.liters))} L</TableCell>
                      <TableCell className="text-right">{formatCurrency(Number(record.pricePerLiter))}</TableCell>
                      <TableCell className="text-right font-medium text-cyan-600">
                        {formatCurrency(Number(record.totalCost))}
                      </TableCell>
                      <TableCell>{record.paymentMethod || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Fuel className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-lg font-medium">Nenhum registro encontrado</h3>
              <p className="text-muted-foreground mt-1">Ajuste os filtros ou cadastre abastecimentos</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
