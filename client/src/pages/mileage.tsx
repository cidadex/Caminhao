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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Plus, Route, Loader2, CalendarIcon, MapPin } from "lucide-react";
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
          <DialogTitle>Novo Registro de KM</DialogTitle>
          <DialogDescription>
            Registre a quilometragem percorrida e o valor recebido pelo serviço
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="truckId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Caminhão</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-mileage-truck">
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
                      <Input type="number" data-testid="input-km-final" {...field} />
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
                              "pl-3 text-left font-normal",
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
                      <Input type="number" step="0.01" data-testid="input-value-received" {...field} />
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
                    <Input placeholder="Ex: São Paulo - Rio de Janeiro" data-testid="input-route" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {kmTraveled > 0 && (
              <Card className="bg-muted/50">
                <CardContent className="p-4">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-xs text-muted-foreground">KM Percorrido</p>
                      <p className="text-lg font-bold">{kmTraveled.toLocaleString("pt-BR")} km</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Valor/KM</p>
                      <p className="text-lg font-bold">{formatCurrency(valuePerKm)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Faturamento</p>
                      <p className="text-lg font-bold text-green-600">{formatCurrency(valueReceived)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
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
    <div className="space-y-4">
      <div className="flex justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-9 w-36" />
      </div>
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-mileage-title">Registro de KM</h1>
          <p className="text-muted-foreground">Registre os quilômetros percorridos e valores</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} data-testid="button-add-mileage">
          <Plus className="mr-2 h-4 w-4" />
          Novo Registro
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {records && records.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Caminhão</TableHead>
                  <TableHead>Rota</TableHead>
                  <TableHead className="text-right">KM Inicial</TableHead>
                  <TableHead className="text-right">KM Final</TableHead>
                  <TableHead className="text-right">Percorrido</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-right">R$/KM</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((record) => (
                  <TableRow key={record.id} data-testid={`row-mileage-${record.id}`}>
                    <TableCell>
                      {format(new Date(record.date), "dd/MM/yyyy", { locale: ptBR })}
                    </TableCell>
                    <TableCell className="font-medium">
                      {record.truck?.number || "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        {record.route}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{formatNumber(record.kmInitial)}</TableCell>
                    <TableCell className="text-right">{formatNumber(record.kmFinal)}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatNumber(record.kmTraveled)} km
                    </TableCell>
                    <TableCell className="text-right text-green-600 font-medium">
                      {formatCurrency(record.valueReceived)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatCurrency(record.valuePerKm)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <Route className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-lg font-medium">Nenhum registro de KM</h3>
              <p className="text-muted-foreground mt-1">
                Adicione seu primeiro registro de quilometragem
              </p>
              <Button className="mt-4" onClick={() => setDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Novo Registro
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <MileageFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        trucks={trucks || []}
      />
    </div>
  );
}
