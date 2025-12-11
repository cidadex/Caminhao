import { useQuery } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { 
  Calculator, 
  CalendarIcon, 
  TrendingUp, 
  TrendingDown, 
  ArrowUpCircle, 
  ArrowDownCircle,
  DollarSign,
  Truck,
  Wrench,
  Fuel,
  Receipt,
  FileText
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FinancialSummary {
  receivables: {
    frete: number;
    manual: number;
    total: number;
    pending: number;
    received: number;
  };
  payables: {
    manual: number;
    maintenance: number;
    fuel: number;
    extras: number;
    total: number;
    pending: number;
    paid: number;
  };
  netProfit: number;
  profitMargin: number;
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-5 w-72" />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </div>
  );
}

export default function FinancialSummaryPage() {
  const [startDate, setStartDate] = useState<Date | undefined>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date | undefined>(endOfMonth(new Date()));

  const queryParams = new URLSearchParams();
  if (startDate) queryParams.set("startDate", startDate.toISOString());
  if (endDate) queryParams.set("endDate", endDate.toISOString());

  const { data: summary, isLoading } = useQuery<FinancialSummary>({
    queryKey: [`/api/financial-summary?${queryParams.toString()}`],
  });

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const receivablesData = summary?.receivables || { frete: 0, manual: 0, total: 0, pending: 0, received: 0 };
  const payablesData = summary?.payables || { manual: 0, maintenance: 0, fuel: 0, extras: 0, total: 0, pending: 0, paid: 0 };
  const netProfit = summary?.netProfit || 0;
  const profitMargin = summary?.profitMargin || 0;

  const isPositive = netProfit >= 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Calculator className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium text-primary">Financeiro</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-financial-title">
            Resumo Financeiro
          </h1>
          <p className="text-muted-foreground mt-1">
            Visão consolidada de entradas, saídas e lucro
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "justify-start text-left font-normal",
                  !startDate && "text-muted-foreground"
                )}
                data-testid="filter-financial-start-date"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {startDate ? format(startDate, "dd/MM/yyyy", { locale: ptBR }) : "Data Inicial"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus />
            </PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "justify-start text-left font-normal",
                  !endDate && "text-muted-foreground"
                )}
                data-testid="filter-financial-end-date"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {endDate ? format(endDate, "dd/MM/yyyy", { locale: ptBR }) : "Data Final"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-green-500/5 to-emerald-500/10">
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total a Receber
            </CardTitle>
            <ArrowUpCircle className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700 dark:text-green-400" data-testid="text-total-receivables">
              {formatCurrency(receivablesData.total)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatCurrency(receivablesData.pending)} pendente
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-red-500/5 to-rose-500/10">
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total a Pagar
            </CardTitle>
            <ArrowDownCircle className="h-5 w-5 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700 dark:text-red-400" data-testid="text-total-payables">
              {formatCurrency(payablesData.total)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatCurrency(payablesData.pending)} pendente
            </p>
          </CardContent>
        </Card>

        <Card className={cn(
          "border-0 shadow-lg",
          isPositive 
            ? "bg-gradient-to-br from-blue-500/5 to-primary/10" 
            : "bg-gradient-to-br from-orange-500/5 to-amber-500/10"
        )}>
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Lucro Líquido
            </CardTitle>
            {isPositive ? (
              <TrendingUp className="h-5 w-5 text-blue-500" />
            ) : (
              <TrendingDown className="h-5 w-5 text-orange-500" />
            )}
          </CardHeader>
          <CardContent>
            <div 
              className={cn(
                "text-2xl font-bold",
                isPositive ? "text-blue-700 dark:text-blue-400" : "text-orange-700 dark:text-orange-400"
              )}
              data-testid="text-net-profit"
            >
              {formatCurrency(netProfit)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Margem: {profitMargin.toFixed(1)}%
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowUpCircle className="h-5 w-5 text-green-500" />
              Detalhamento de Entradas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-blue-500" />
                  <span className="text-sm">Fretes (Registro de KM)</span>
                </div>
                <span className="font-semibold text-green-700 dark:text-green-400">
                  {formatCurrency(receivablesData.frete)}
                </span>
              </div>
              <Progress 
                value={receivablesData.total > 0 ? (receivablesData.frete / receivablesData.total) * 100 : 0} 
                className="h-2"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-purple-500" />
                  <span className="text-sm">Outros Recebimentos</span>
                </div>
                <span className="font-semibold text-green-700 dark:text-green-400">
                  {formatCurrency(receivablesData.manual)}
                </span>
              </div>
              <Progress 
                value={receivablesData.total > 0 ? (receivablesData.manual / receivablesData.total) * 100 : 0} 
                className="h-2"
              />
            </div>

            <div className="pt-4 border-t">
              <div className="flex items-center justify-between">
                <span className="font-medium">Total de Entradas</span>
                <span className="text-lg font-bold text-green-700 dark:text-green-400">
                  {formatCurrency(receivablesData.total)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowDownCircle className="h-5 w-5 text-red-500" />
              Detalhamento de Saídas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-orange-500" />
                  <span className="text-sm">Manutenções</span>
                </div>
                <span className="font-semibold text-red-700 dark:text-red-400">
                  {formatCurrency(payablesData.maintenance)}
                </span>
              </div>
              <Progress 
                value={payablesData.total > 0 ? (payablesData.maintenance / payablesData.total) * 100 : 0} 
                className="h-2"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Fuel className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm">Combustível</span>
                </div>
                <span className="font-semibold text-red-700 dark:text-red-400">
                  {formatCurrency(payablesData.fuel)}
                </span>
              </div>
              <Progress 
                value={payablesData.total > 0 ? (payablesData.fuel / payablesData.total) * 100 : 0} 
                className="h-2"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-purple-500" />
                  <span className="text-sm">Gastos Extras</span>
                </div>
                <span className="font-semibold text-red-700 dark:text-red-400">
                  {formatCurrency(payablesData.extras)}
                </span>
              </div>
              <Progress 
                value={payablesData.total > 0 ? (payablesData.extras / payablesData.total) * 100 : 0} 
                className="h-2"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-red-500" />
                  <span className="text-sm">Contas a Pagar (INSS, FGTS, etc)</span>
                </div>
                <span className="font-semibold text-red-700 dark:text-red-400">
                  {formatCurrency(payablesData.manual)}
                </span>
              </div>
              <Progress 
                value={payablesData.total > 0 ? (payablesData.manual / payablesData.total) * 100 : 0} 
                className="h-2"
              />
            </div>

            <div className="pt-4 border-t">
              <div className="flex items-center justify-between">
                <span className="font-medium">Total de Saídas</span>
                <span className="text-lg font-bold text-red-700 dark:text-red-400">
                  {formatCurrency(payablesData.total)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className={cn(
        "border-0 shadow-lg",
        isPositive 
          ? "bg-gradient-to-r from-green-500/5 via-blue-500/5 to-emerald-500/5" 
          : "bg-gradient-to-r from-red-500/5 via-orange-500/5 to-amber-500/5"
      )}>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold">Resultado do Período</h3>
              <p className="text-sm text-muted-foreground">
                {startDate && endDate 
                  ? `${format(startDate, "dd/MM/yyyy", { locale: ptBR })} até ${format(endDate, "dd/MM/yyyy", { locale: ptBR })}`
                  : "Todo o período"}
              </p>
            </div>
            <div className="text-right">
              <div 
                className={cn(
                  "text-3xl font-bold",
                  isPositive ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"
                )}
              >
                {formatCurrency(netProfit)}
              </div>
              <div className="flex items-center justify-end gap-2 mt-1">
                {isPositive ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                )}
                <span className={cn(
                  "text-sm font-medium",
                  isPositive ? "text-green-600" : "text-red-600"
                )}>
                  {isPositive ? "Lucro" : "Prejuízo"} de {Math.abs(profitMargin).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
