import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Truck, MileageRecord } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Plus, Route, Loader2, CalendarIcon, MapPin, Truck as TruckIcon, Sparkles, DollarSign, Gauge, ArrowRight } from "lucide-react";
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
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trucks: Truck[];
}) {
  const { toast } = useToast();

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
    <Dialog open={open} onOpenChange={onOpenChange}>
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
                  <FormControl>
                    <Input placeholder="Ex: São Paulo - Rio de Janeiro" className="h-11" data-testid="input-route" {...field} />
                  </FormControl>
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
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
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
    <div className="space-y-8">
      <div className="flex justify-between">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-5 w-72" />
        </div>
        <Skeleton className="h-10 w-36" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="h-48 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

export default function MileagePage() {
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: records, isLoading: recordsLoading } = useQuery<MileageRecordWithTruck[]>({
    queryKey: ["/api/mileage"],
  });

  const { data: trucks, isLoading: trucksLoading } = useQuery<Truck[]>({
    queryKey: ["/api/trucks"],
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

  const totalRevenue = records?.reduce((sum, r) => sum + Number(r.valueReceived), 0) || 0;
  const totalKm = records?.reduce((sum, r) => sum + Number(r.kmTraveled), 0) || 0;

  return (
    <div className="space-y-8">
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
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-4 px-4 py-2 rounded-xl bg-muted/50 border border-border/50">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-emerald-600" />
              <span className="text-sm font-medium">{formatCurrency(totalRevenue)}</span>
            </div>
            <div className="w-px h-4 bg-border" />
            <div className="flex items-center gap-2">
              <Gauge className="h-4 w-4 text-violet-600" />
              <span className="text-sm font-medium">{formatNumber(totalKm)} km</span>
            </div>
          </div>
          <Button onClick={() => setDialogOpen(true)} className="shadow-lg" data-testid="button-add-mileage">
            <Plus className="mr-2 h-4 w-4" />
            Novo Registro
          </Button>
        </div>
      </div>

      {records && records.length > 0 ? (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {records.map((record) => (
            <Card 
              key={record.id}
              className="group relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
              data-testid={`row-mileage-${record.id}`}
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-600" />
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg">
                    <Route className="h-5 w-5 text-white" />
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-emerald-600">
                      {formatCurrency(record.valueReceived)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(record.date), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <TruckIcon className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Caminhão {record.truck?.number || "-"}</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">{record.route}</span>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-border/50">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">{formatNumber(record.kmInitial)}</span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">{formatNumber(record.kmFinal)}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-semibold">{formatNumber(record.kmTraveled)} km</span>
                      <span className="text-xs text-muted-foreground ml-1">
                        ({formatCurrency(Number(record.valuePerKm))}/km)
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-0 shadow-lg">
          <CardContent className="text-center py-16">
            <div className="flex h-20 w-20 mx-auto mb-6 items-center justify-center rounded-2xl bg-muted/50">
              <Route className="h-10 w-10 text-muted-foreground/50" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Nenhum registro de KM</h3>
            <p className="text-muted-foreground max-w-sm mx-auto">
              Adicione seu primeiro registro de quilometragem para começar a rastrear suas viagens
            </p>
            <Button className="mt-6 shadow-lg" onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Registro
            </Button>
          </CardContent>
        </Card>
      )}

      <MileageFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        trucks={trucks || []}
      />
    </div>
  );
}
