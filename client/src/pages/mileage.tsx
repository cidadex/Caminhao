import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Truck, MileageRecord, Route as RouteType } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Plus, Route, Loader2, CalendarIcon, Filter, Sparkles, DollarSign, Gauge, X } from "lucide-react";
import { cn } from "@/lib/utils";

const mileageFormSchema = z.object({
  truckId: z.string().min(1, "Selecione um caminhão"),
  kmInitial: z.coerce.number().min(0, "KM inicial deve ser positivo"),
  kmFinal: z.coerce.number().min(0, "KM final deve ser positivo"),
  valueReceived: z.coerce.number().min(0, "Valor deve ser positivo"),
  route: z.string().min(1, "Rota é obrigatória"),
  date: z.date({ required_error: "Data é obrigatória" }),
}).refine((data) => data.kmFinal > data.kmInitial, {
  message: "KM final deve ser maior que KM inicial",
  path: ["kmFinal"],
});

type MileageFormData = z.infer<typeof mileageFormSchema>;

interface MileageRecordWithTruck extends MileageRecord {
  truck?: Truck;
}

function MileageFormDialog({
  open,
  onOpenChange,
  trucks,
  routes,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trucks: Truck[];
  routes: RouteType[];
}) {
  const { toast } = useToast();
  const [routeMode, setRouteMode] = useState<"select" | "manual">("select");
  const [selectedRouteId, setSelectedRouteId] = useState<string>("");
  const activeRoutes = routes.filter((r) => r.status === "active");

  const form = useForm<MileageFormData>({
    resolver: zodResolver(mileageFormSchema),
    defaultValues: {
      truckId: "",
      kmInitial: 0,
      kmFinal: 0,
      valueReceived: 0,
      route: "",
      date: new Date(),
    },
  });

  const resetDialog = () => {
    form.reset();
    setRouteMode(activeRoutes.length > 0 ? "select" : "manual");
    setSelectedRouteId("");
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetDialog();
    } else {
      setRouteMode(activeRoutes.length > 0 ? "select" : "manual");
      setSelectedRouteId("");
    }
    onOpenChange(newOpen);
  };

  const handleRouteSelect = (routeId: string) => {
    if (routeId === "__manual__") {
      setRouteMode("manual");
      setSelectedRouteId("");
      form.setValue("route", "");
    } else {
      setSelectedRouteId(routeId);
      const selectedRoute = routes.find((r) => r.id === routeId);
      if (selectedRoute) {
        form.setValue("route", `${selectedRoute.origin} - ${selectedRoute.destination}`);
      }
    }
  };

  const selectedTruck = trucks.find((t) => t.id === form.watch("truckId"));
  const kmInitial = form.watch("kmInitial");
  const kmFinal = form.watch("kmFinal");
  const valueReceived = form.watch("valueReceived");

  const kmTraveled = kmFinal > kmInitial ? kmFinal - kmInitial : 0;
  const valuePerKm = kmTraveled > 0 ? valueReceived / kmTraveled : 0;

  const mutation = useMutation({
    mutationFn: async (data: MileageFormData) => {
      return apiRequest("POST", "/api/mileage", {
        ...data,
        date: data.date.toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mileage"] });
      queryClient.invalidateQueries({ queryKey: ["/api/trucks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({
        title: "Registro salvo!",
        description: "O registro de quilometragem foi salvo com sucesso.",
      });
      resetDialog();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message || "Ocorreu um erro ao salvar",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: MileageFormData) => {
    mutation.mutate(data);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl">Novo Registro de KM</DialogTitle>
          <DialogDescription>
            Registre a quilometragem percorrida e o valor recebido pelo serviço
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="truckId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Caminhão</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-11" data-testid="select-mileage-truck">
                        <SelectValue placeholder="Selecione o caminhão" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {trucks.filter((t) => t.status === "active").map((truck) => (
                        <SelectItem key={truck.id} value={truck.id}>
                          Caminhão {truck.number} - {truck.plate}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="kmInitial"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>KM Inicial</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        className="h-11"
                        placeholder={selectedTruck ? String(Number(selectedTruck.totalKm)) : "0"}
                        data-testid="input-km-initial"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="kmFinal"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>KM Final</FormLabel>
                    <FormControl>
                      <Input type="number" className="h-11" data-testid="input-km-final" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Data</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "h-11 pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                            data-testid="button-select-date"
                          >
                            {field.value ? (
                              format(field.value, "dd/MM/yyyy", { locale: ptBR })
                            ) : (
                              <span>Selecione</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date > new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="valueReceived"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor Recebido (R$)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" className="h-11" data-testid="input-value-received" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="route"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cidade/Rota</FormLabel>
                  {routeMode === "select" && activeRoutes.length > 0 ? (
                    <div className="space-y-2">
                      <Select value={selectedRouteId} onValueChange={handleRouteSelect}>
                        <FormControl>
                          <SelectTrigger className="h-11" data-testid="select-route">
                            <SelectValue placeholder="Selecione uma rota cadastrada" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {activeRoutes.map((route) => (
                            <SelectItem key={route.id} value={route.id}>
                              {route.origin} → {route.destination}
                              {route.distance && ` (${Number(route.distance)} km)`}
                            </SelectItem>
                          ))}
                          <SelectItem value="__manual__">
                            Digitar rota manualmente...
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      {field.value && (
                        <p className="text-sm text-muted-foreground">
                          Rota selecionada: {field.value}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <FormControl>
                        <Input 
                          placeholder="Ex: São Paulo - Rio de Janeiro" 
                          className="h-11" 
                          data-testid="input-route" 
                          {...field} 
                        />
                      </FormControl>
                      {activeRoutes.length > 0 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setRouteMode("select");
                            setSelectedRouteId("");
                            form.setValue("route", "");
                          }}
                          className="text-xs"
                          data-testid="button-show-routes"
                        >
                          Ver rotas cadastradas
                        </Button>
                      )}
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {kmTraveled > 0 && (
              <div className="grid grid-cols-3 gap-3 p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">KM Percorrido</p>
                  <p className="text-lg font-bold">{kmTraveled.toLocaleString("pt-BR")} km</p>
                </div>
                <div className="text-center border-x border-emerald-500/20">
                  <p className="text-xs text-muted-foreground mb-1">Valor/KM</p>
                  <p className="text-lg font-bold">{formatCurrency(valuePerKm)}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">Faturamento</p>
                  <p className="text-lg font-bold text-emerald-600">{formatCurrency(valueReceived)}</p>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={mutation.isPending} data-testid="button-save-mileage">
                {mutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Registrar"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-5 w-72" />
        </div>
        <Skeleton className="h-10 w-36" />
      </div>
      <Skeleton className="h-24 w-full rounded-xl" />
      <Skeleton className="h-96 w-full rounded-xl" />
    </div>
  );
}

export default function MileagePage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [startDate, setStartDate] = useState<Date | undefined>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date | undefined>(endOfMonth(new Date()));
  const [selectedTruck, setSelectedTruck] = useState<string>("all");

  const { data: records, isLoading: recordsLoading } = useQuery<MileageRecordWithTruck[]>({
    queryKey: ["/api/mileage"],
  });

  const { data: trucks, isLoading: trucksLoading } = useQuery<Truck[]>({
    queryKey: ["/api/trucks"],
  });

  const { data: routes } = useQuery<RouteType[]>({
    queryKey: ["/api/routes"],
  });

  if (recordsLoading || trucksLoading) {
    return <LoadingSkeleton />;
  }

  const formatCurrency = (value: string | number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(Number(value));
  };

  const formatNumber = (value: string | number) => {
    return new Intl.NumberFormat("pt-BR").format(Number(value));
  };

  const filteredRecords = records?.filter((record) => {
    const recordDate = new Date(record.date);
    const matchesDateRange = (!startDate || recordDate >= startDate) && (!endDate || recordDate <= endDate);
    const matchesTruck = selectedTruck === "all" || record.truckId === selectedTruck;
    return matchesDateRange && matchesTruck;
  }) || [];

  const totalRevenue = filteredRecords.reduce((sum, r) => sum + Number(r.valueReceived), 0);
  const totalKm = filteredRecords.reduce((sum, r) => sum + Number(r.kmTraveled), 0);

  const clearFilters = () => {
    setStartDate(undefined);
    setEndDate(undefined);
    setSelectedTruck("all");
  };

  const hasActiveFilters = startDate || endDate || selectedTruck !== "all";

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium text-primary">Registro</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-mileage-title">Quilometragem</h1>
          <p className="text-muted-foreground mt-1">
            Registre os quilômetros percorridos e valores recebidos
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="shadow-lg" data-testid="button-add-mileage">
          <Plus className="mr-2 h-4 w-4" />
          Novo Registro
        </Button>
      </div>

      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="h-4 w-4" />
            Filtros
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="ml-auto h-8">
                <X className="h-4 w-4 mr-1" />
                Limpar
              </Button>
            )}
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
                      "w-full h-10 justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                    data-testid="filter-start-date"
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
                      "w-full h-10 justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                    data-testid="filter-end-date"
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
                <SelectTrigger className="h-10" data-testid="filter-truck">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os caminhões</SelectItem>
                  {trucks?.map((truck) => (
                    <SelectItem key={truck.id} value={truck.id}>
                      Caminhão {truck.number} - {truck.plate}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Resumo do Período</label>
              <div className="flex items-center gap-3 h-10 px-3 rounded-md bg-muted/50 border">
                <div className="flex items-center gap-1.5">
                  <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="text-sm font-medium">{formatCurrency(totalRevenue)}</span>
                </div>
                <div className="w-px h-4 bg-border" />
                <div className="flex items-center gap-1.5">
                  <Gauge className="h-3.5 w-3.5 text-violet-600" />
                  <span className="text-sm font-medium">{formatNumber(totalKm)} km</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-lg">
        <CardContent className="p-0">
          {filteredRecords.length > 0 ? (
            <div className="overflow-x-auto">
            <Table className="min-w-[900px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Caminhão</TableHead>
                  <TableHead>Rota</TableHead>
                  <TableHead className="text-right">KM Inicial</TableHead>
                  <TableHead className="text-right">KM Final</TableHead>
                  <TableHead className="text-right">KM Percorrido</TableHead>
                  <TableHead className="text-right">Valor Recebido</TableHead>
                  <TableHead className="text-right">R$/KM</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.map((record) => (
                  <TableRow key={record.id} data-testid={`row-mileage-${record.id}`}>
                    <TableCell>
                      {format(new Date(record.date), "dd/MM/yyyy", { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">Caminhão {record.truck?.number || "-"}</p>
                        <p className="text-xs text-muted-foreground">{record.truck?.plate}</p>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <span className="truncate block">{record.route}</span>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatNumber(record.kmInitial)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatNumber(record.kmFinal)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatNumber(record.kmTraveled)} km
                    </TableCell>
                    <TableCell className="text-right font-bold text-emerald-600">
                      {formatCurrency(record.valueReceived)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatCurrency(record.valuePerKm)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="flex h-16 w-16 mx-auto mb-4 items-center justify-center rounded-2xl bg-muted/50">
                <Route className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <h3 className="text-lg font-semibold mb-1">Nenhum registro encontrado</h3>
              <p className="text-muted-foreground max-w-sm mx-auto">
                {hasActiveFilters
                  ? "Tente ajustar os filtros para encontrar registros"
                  : "Adicione seu primeiro registro de quilometragem"}
              </p>
              {!hasActiveFilters && (
                <Button className="mt-4" onClick={() => setDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Registro
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <MileageFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        trucks={trucks || []}
        routes={routes || []}
      />
    </div>
  );
}
