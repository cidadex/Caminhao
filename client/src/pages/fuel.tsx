import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Truck, FuelExpense } from "@shared/schema";
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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Plus, Fuel, Loader2, CalendarIcon, Filter, Sparkles, DollarSign, X, Droplets } from "lucide-react";
import { cn } from "@/lib/utils";

const paymentMethods = ["Dinheiro", "Cartão Frota", "PIX", "Cartão Crédito", "Cartão Débito"];

const fuelFormSchema = z.object({
  truckId: z.string().min(1, "Selecione um caminhão"),
  liters: z.coerce.number().min(1, "Litros deve ser maior que zero"),
  pricePerLiter: z.coerce.number().min(0.01, "Preço por litro é obrigatório"),
  odometer: z.coerce.number().min(0, "Odômetro é obrigatório"),
  vendor: z.string().optional(),
  paymentMethod: z.string().optional(),
  date: z.date({ required_error: "Data é obrigatória" }),
});

type FuelFormData = z.infer<typeof fuelFormSchema>;

interface FuelWithTruck extends FuelExpense {
  truck?: Truck;
}

function FuelFormDialog({
  open,
  onOpenChange,
  trucks,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trucks: Truck[];
}) {
  const { toast } = useToast();

  const form = useForm<FuelFormData>({
    resolver: zodResolver(fuelFormSchema),
    defaultValues: {
      truckId: "",
      liters: 0,
      pricePerLiter: 0,
      odometer: 0,
      vendor: "",
      paymentMethod: "",
      date: new Date(),
    },
  });

  const liters = form.watch("liters");
  const pricePerLiter = form.watch("pricePerLiter");
  const totalCost = liters * pricePerLiter;

  const mutation = useMutation({
    mutationFn: async (data: FuelFormData) => {
      return apiRequest("POST", "/api/fuel-expenses", {
        ...data,
        date: data.date.toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fuel-expenses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({
        title: "Abastecimento registrado!",
        description: "O registro de combustível foi salvo com sucesso.",
      });
      onOpenChange(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message || "Ocorreu um erro ao salvar",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FuelFormData) => {
    mutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl">Novo Abastecimento</DialogTitle>
          <DialogDescription>
            Registre os gastos com combustível do caminhão
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
                      <SelectTrigger className="h-11" data-testid="select-fuel-truck">
                        <SelectValue placeholder="Selecione o caminhão" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {trucks.map((truck) => (
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
                name="liters"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Litros</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" className="h-11" data-testid="input-fuel-liters" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="pricePerLiter"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preço/Litro (R$)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.001" className="h-11" data-testid="input-fuel-price" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="p-3 rounded-lg bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Total do Abastecimento:</span>
                <span className="text-lg font-bold text-green-700 dark:text-green-400">
                  {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(totalCost)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="odometer"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Odômetro (KM)</FormLabel>
                    <FormControl>
                      <Input type="number" className="h-11" data-testid="input-fuel-odometer" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
                            data-testid="button-select-fuel-date"
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
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="vendor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Posto</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome do posto" className="h-11" data-testid="input-fuel-vendor" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="paymentMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Forma de Pagamento</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-11" data-testid="select-fuel-payment">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {paymentMethods.map((method) => (
                          <SelectItem key={method} value={method}>
                            {method}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={mutation.isPending} data-testid="button-save-fuel">
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
        <Skeleton className="h-10 w-40" />
      </div>
      <Skeleton className="h-24 w-full rounded-xl" />
      <Skeleton className="h-96 w-full rounded-xl" />
    </div>
  );
}

export default function FuelPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [startDate, setStartDate] = useState<Date | undefined>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date | undefined>(endOfMonth(new Date()));
  const [selectedTruck, setSelectedTruck] = useState<string>("all");

  const { data: fuelExpenses, isLoading: fuelLoading } = useQuery<FuelWithTruck[]>({
    queryKey: ["/api/fuel-expenses"],
  });

  const { data: trucks, isLoading: trucksLoading } = useQuery<Truck[]>({
    queryKey: ["/api/trucks"],
  });

  if (fuelLoading || trucksLoading) {
    return <LoadingSkeleton />;
  }

  const formatCurrency = (value: string | number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(Number(value));
  };

  const filteredFuel = fuelExpenses?.filter((fuel) => {
    const fuelDate = new Date(fuel.date);
    const matchesDateRange = (!startDate || fuelDate >= startDate) && (!endDate || fuelDate <= endDate);
    const matchesTruck = selectedTruck === "all" || fuel.truckId === selectedTruck;
    return matchesDateRange && matchesTruck;
  }) || [];

  const totalCost = filteredFuel.reduce((sum, f) => sum + Number(f.totalCost), 0);
  const totalLiters = filteredFuel.reduce((sum, f) => sum + Number(f.liters), 0);

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
            <span className="text-sm font-medium text-primary">Controle</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-fuel-title">Combustível</h1>
          <p className="text-muted-foreground mt-1">
            Controle os gastos com abastecimento da frota
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="shadow-lg" data-testid="button-add-fuel">
          <Plus className="mr-2 h-4 w-4" />
          Novo Abastecimento
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
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
              <label className="text-sm font-medium">Total Litros</label>
              <div className="flex items-center gap-2 h-10 px-3 rounded-md bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/20">
                <Droplets className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-bold text-blue-700 dark:text-blue-400">
                  {totalLiters.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} L
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Total Gasto</label>
              <div className="flex items-center gap-2 h-10 px-3 rounded-md bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20">
                <DollarSign className="h-4 w-4 text-green-600" />
                <span className="text-sm font-bold text-green-700 dark:text-green-400">
                  {formatCurrency(totalCost)}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-lg">
        <CardContent className="p-0">
          {filteredFuel.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Caminhão</TableHead>
                  <TableHead className="text-right">Litros</TableHead>
                  <TableHead className="text-right">R$/Litro</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Odômetro</TableHead>
                  <TableHead>Posto</TableHead>
                  <TableHead>Pagamento</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFuel.map((fuel) => (
                  <TableRow key={fuel.id} data-testid={`row-fuel-${fuel.id}`}>
                    <TableCell>
                      {format(new Date(fuel.date), "dd/MM/yyyy", { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">Caminhão {fuel.truck?.number}</div>
                        <div className="text-xs text-muted-foreground">{fuel.truck?.plate}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {Number(fuel.liters).toLocaleString("pt-BR")} L
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(fuel.pricePerLiter)}
                    </TableCell>
                    <TableCell className="text-right font-bold text-green-700 dark:text-green-400">
                      {formatCurrency(fuel.totalCost)}
                    </TableCell>
                    <TableCell className="text-right">
                      {Number(fuel.odometer).toLocaleString("pt-BR")} km
                    </TableCell>
                    <TableCell>
                      {fuel.vendor || "-"}
                    </TableCell>
                    <TableCell>
                      {fuel.paymentMethod ? (
                        <Badge variant="outline">{fuel.paymentMethod}</Badge>
                      ) : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
                <Fuel className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold">Nenhum abastecimento encontrado</h3>
              <p className="text-muted-foreground mt-1 max-w-sm">
                {hasActiveFilters
                  ? "Tente ajustar os filtros para ver mais resultados"
                  : "Comece registrando o primeiro abastecimento da frota"}
              </p>
              {!hasActiveFilters && (
                <Button className="mt-4" onClick={() => setDialogOpen(true)} data-testid="button-add-first-fuel">
                  <Plus className="mr-2 h-4 w-4" />
                  Registrar Abastecimento
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <FuelFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        trucks={trucks || []}
      />
    </div>
  );
}
