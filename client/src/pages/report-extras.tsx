import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Truck, ExtraExpense } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Receipt, CalendarIcon, Filter, Sparkles, Hash, DollarSign, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface ExtrasReportData {
  records: (ExtraExpense & { truck?: Truck })[];
  totals: { count: number; totalCost: number; avgCost: number };
  byCategory: { category: string; value: number }[];
  byTruck: { truck: string; value: number }[];
}

const COLORS = ["#f59e0b", "#8b5cf6", "#10b981", "#06b6d4", "#ef4444", "#f97316", "#ec4899", "#6366f1"];

const categoryLabels: Record<string, string> = {
  "Pedágio": "Pedágio",
  "Estacionamento": "Estacionamento",
  "Alimentação": "Alimentação",
  "Hospedagem": "Hospedagem",
  "Lavagem": "Lavagem",
  "Documentação": "Documentação",
  "Multa": "Multa",
  "Seguro": "Seguro",
  "Outros": "Outros",
};

export default function ExtrasReportPage() {
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

  const { data, isLoading } = useQuery<ExtrasReportData>({
    queryKey: ["/api/reports/extras", queryParams.toString()],
  });

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32" />)}
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
        <h1 className="text-3xl font-bold tracking-tight" data-testid="text-report-extras-title">
          Relatório de Gastos Extras
        </h1>
        <p className="text-muted-foreground mt-1">Análise completa das despesas adicionais</p>
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
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !startDate && "text-muted-foreground")} data-testid="button-extras-start-date">
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
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !endDate && "text-muted-foreground")} data-testid="button-extras-end-date">
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
                <SelectTrigger data-testid="select-extras-truck">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="none">Gastos Gerais</SelectItem>
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
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-0 shadow-lg bg-gradient-to-br from-amber-500/5 to-orange-500/5">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg">
                  <DollarSign className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Gasto</p>
                  <p className="text-2xl font-bold text-amber-700 dark:text-amber-400" data-testid="stat-extras-total">
                    {formatCurrency(data.totals.totalCost)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-lg bg-gradient-to-br from-violet-500/5 to-purple-500/5">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg">
                  <Hash className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total de Registros</p>
                  <p className="text-2xl font-bold text-violet-700 dark:text-violet-400" data-testid="stat-extras-count">
                    {data.totals.count}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-lg bg-gradient-to-br from-cyan-500/5 to-blue-500/5">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg">
                  <TrendingDown className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Média por Registro</p>
                  <p className="text-2xl font-bold text-cyan-700 dark:text-cyan-400" data-testid="stat-extras-avg">
                    {formatCurrency(data.totals.avgCost)}
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
              <Receipt className="h-5 w-5" />
              Gastos por Categoria
            </CardTitle>
            <CardDescription>Distribuição por tipo de despesa</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              {data?.byCategory && data.byCategory.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={data.byCategory} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value" nameKey="category" label={({ category }) => categoryLabels[category] || category}>
                      {data.byCategory.map((_, index) => (
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
              <Receipt className="h-5 w-5" />
              Gastos por Caminhão
            </CardTitle>
            <CardDescription>Comparativo entre veículos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              {data?.byTruck && data.byTruck.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.byTruck} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
                    <XAxis type="number" tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                    <YAxis dataKey="truck" type="category" width={80} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Bar dataKey="value" fill="#f59e0b" radius={[0, 4, 4, 0]} />
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
          <CardTitle>Histórico Detalhado</CardTitle>
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
                    <TableHead>Categoria</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.records.slice(0, 50).map((record) => (
                    <TableRow key={record.id} data-testid={`row-extras-${record.id}`}>
                      <TableCell>{format(new Date(record.date), "dd/MM/yyyy", { locale: ptBR })}</TableCell>
                      <TableCell>
                        {record.truck ? `${record.truck.number} - ${record.truck.plate}` : <Badge variant="secondary">Geral</Badge>}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{categoryLabels[record.category] || record.category}</Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{record.description}</TableCell>
                      <TableCell className="text-right font-medium text-amber-600">
                        {formatCurrency(Number(record.totalCost))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Receipt className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-lg font-medium">Nenhum registro encontrado</h3>
              <p className="text-muted-foreground mt-1">Ajuste os filtros ou cadastre gastos extras</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
