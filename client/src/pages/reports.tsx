import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Truck } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  FileText,
  FileSpreadsheet,
  FileDown,
  CalendarIcon,
  Filter,
  Loader2,
  TrendingUp,
  TrendingDown,
  Truck as TruckIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ReportData {
  truck: {
    id: string;
    number: string;
    plate: string;
    model: string;
  };
  grossRevenue: number;
  maintenanceCost: number;
  netRevenue: number;
  totalKm: number;
  avgValuePerKm: number;
  tripCount: number;
  maintenanceCount: number;
}

interface ReportResponse {
  data: ReportData[];
  totals: {
    grossRevenue: number;
    maintenanceCost: number;
    netRevenue: number;
    totalKm: number;
  };
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <Skeleton className="h-8 w-40" />
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                  <TableHead key={i}>
                    <Skeleton className="h-4 w-20" />
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {[1, 2, 3, 4].map((row) => (
                <TableRow key={row}>
                  {[1, 2, 3, 4, 5, 6, 7].map((cell) => (
                    <TableCell key={cell}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ReportsPage() {
  const { toast } = useToast();
  const [startDate, setStartDate] = useState<Date | undefined>(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  );
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  const [selectedTruck, setSelectedTruck] = useState<string>("all");
  const [isExporting, setIsExporting] = useState<string | null>(null);

  const { data: trucks, isLoading: trucksLoading } = useQuery<Truck[]>({
    queryKey: ["/api/trucks"],
  });

  const queryParams = new URLSearchParams();
  if (startDate) queryParams.set("startDate", startDate.toISOString());
  if (endDate) queryParams.set("endDate", endDate.toISOString());
  if (selectedTruck !== "all") queryParams.set("truckId", selectedTruck);

  const { data: reportData, isLoading: reportLoading } = useQuery<ReportResponse>({
    queryKey: ["/api/reports", queryParams.toString()],
  });

  const handleExport = async (formatType: "pdf" | "excel" | "csv") => {
    setIsExporting(formatType);
    try {
      const params = new URLSearchParams();
      if (startDate) params.set("startDate", startDate.toISOString());
      if (endDate) params.set("endDate", endDate.toISOString());
      if (selectedTruck !== "all") params.set("truckId", selectedTruck);
      params.set("format", formatType);

      const token = localStorage.getItem("token");
      const response = await fetch(`/api/reports/export?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Erro ao exportar relatório");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;

      const extensions: Record<string, string> = {
        pdf: "pdf",
        excel: "xlsx",
        csv: "csv",
      };

      a.download = `relatorio-frota-${format(new Date(), "yyyy-MM-dd")}.${extensions[formatType]}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Relatório exportado!",
        description: `O arquivo foi baixado com sucesso.`,
      });
    } catch (error) {
      toast({
        title: "Erro ao exportar",
        description: "Ocorreu um erro ao gerar o relatório.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(null);
    }
  };

  if (trucksLoading) {
    return <LoadingSkeleton />;
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat("pt-BR").format(value);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-reports-title">Relatórios</h1>
        <p className="text-muted-foreground">Analise o desempenho da sua frota</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="h-4 w-4" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Data Inicial</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                    data-testid="button-start-date"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecione"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Data Final</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                    data-testid="button-end-date"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecione"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Caminhão</label>
              <Select value={selectedTruck} onValueChange={setSelectedTruck}>
                <SelectTrigger data-testid="select-report-truck">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os caminhões</SelectItem>
                  {trucks?.map((truck) => (
                    <SelectItem key={truck.id} value={truck.id}>
                      Caminhão {truck.number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Exportar</label>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleExport("pdf")}
                  disabled={isExporting !== null}
                  data-testid="button-export-pdf"
                >
                  {isExporting === "pdf" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileText className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleExport("excel")}
                  disabled={isExporting !== null}
                  data-testid="button-export-excel"
                >
                  {isExporting === "excel" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileSpreadsheet className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleExport("csv")}
                  disabled={isExporting !== null}
                  data-testid="button-export-csv"
                >
                  {isExporting === "csv" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileDown className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {reportData?.totals && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-green-500/10">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Faturamento Bruto</p>
                  <p className="text-xl font-bold">{formatCurrency(reportData.totals.grossRevenue)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-red-500/10">
                  <TrendingDown className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Gastos Manutenção</p>
                  <p className="text-xl font-bold">{formatCurrency(reportData.totals.maintenanceCost)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Faturamento Líquido</p>
                  <p className="text-xl font-bold">{formatCurrency(reportData.totals.netRevenue)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-blue-500/10">
                  <TruckIcon className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total KM</p>
                  <p className="text-xl font-bold">{formatNumber(reportData.totals.totalKm)} km</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Detalhamento por Caminhão</CardTitle>
          <CardDescription>
            {startDate && endDate
              ? `Período: ${format(startDate, "dd/MM/yyyy", { locale: ptBR })} - ${format(endDate, "dd/MM/yyyy", { locale: ptBR })}`
              : "Selecione um período para filtrar"}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {reportLoading ? (
            <div className="p-8 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
              <p className="mt-2 text-muted-foreground">Carregando dados...</p>
            </div>
          ) : reportData?.data && reportData.data.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Caminhão</TableHead>
                  <TableHead className="text-right">Viagens</TableHead>
                  <TableHead className="text-right">KM Total</TableHead>
                  <TableHead className="text-right">Faturamento Bruto</TableHead>
                  <TableHead className="text-right">Manutenções</TableHead>
                  <TableHead className="text-right">Faturamento Líquido</TableHead>
                  <TableHead className="text-right">Média R$/KM</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.data.map((row) => (
                  <TableRow key={row.truck.id} data-testid={`row-report-${row.truck.id}`}>
                    <TableCell>
                      <div>
                        <p className="font-medium">Caminhão {row.truck.number}</p>
                        <p className="text-xs text-muted-foreground">{row.truck.plate}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{row.tripCount}</TableCell>
                    <TableCell className="text-right">{formatNumber(row.totalKm)} km</TableCell>
                    <TableCell className="text-right text-green-600">
                      {formatCurrency(row.grossRevenue)}
                    </TableCell>
                    <TableCell className="text-right text-red-600">
                      -{formatCurrency(row.maintenanceCost)}
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      {formatCurrency(row.netRevenue)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatCurrency(row.avgValuePerKm)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-lg font-medium">Nenhum dado encontrado</h3>
              <p className="text-muted-foreground mt-1">
                Ajuste os filtros ou adicione registros de viagens
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
