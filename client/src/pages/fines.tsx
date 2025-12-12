import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Truck, Driver, FineWithDetails } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Plus,
  AlertTriangle,
  Loader2,
  CalendarIcon,
  Trash2,
  Check,
  Clock,
  DollarSign,
} from "lucide-react";
import { cn } from "@/lib/utils";

const infractionTypes = [
  "Excesso de velocidade",
  "Avanço de sinal vermelho",
  "Estacionamento proibido",
  "Ultrapassagem indevida",
  "Uso de celular",
  "Documentação irregular",
  "Carga irregular",
  "Falta de equipamento obrigatório",
  "Outras infrações",
];

const fineFormSchema = z.object({
  truckId: z.string().optional(),
  driverId: z.string().optional(),
  infraction: z.string().min(1, "Infração é obrigatória"),
  value: z.coerce.number().min(0.01, "Valor deve ser maior que zero"),
  date: z.date({ required_error: "Data é obrigatória" }),
  dueDate: z.date().optional(),
  location: z.string().optional(),
  autoNumber: z.string().optional(),
  notes: z.string().optional(),
});

type FineFormData = z.infer<typeof fineFormSchema>;

function FineFormDialog({
  open,
  onOpenChange,
  trucks,
  drivers,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trucks: Truck[];
  drivers: Driver[];
}) {
  const { toast } = useToast();

  const form = useForm<FineFormData>({
    resolver: zodResolver(fineFormSchema),
    defaultValues: {
      truckId: "",
      driverId: "",
      infraction: "",
      value: 0,
      date: new Date(),
      location: "",
      autoNumber: "",
      notes: "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: FineFormData) => {
      return apiRequest("POST", "/api/fines", {
        ...data,
        value: String(data.value),
        truckId: data.truckId && data.truckId !== "" ? data.truckId : undefined,
        driverId: data.driverId && data.driverId !== "" ? data.driverId : undefined,
        date: data.date.toISOString(),
        dueDate: data.dueDate?.toISOString() || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fines"] });
      toast({
        title: "Multa registrada!",
        description: "O registro da multa foi salvo com sucesso.",
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

  const onSubmit = (data: FineFormData) => {
    mutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Nova Multa</DialogTitle>
          <DialogDescription>
            Registre uma multa de trânsito
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="truckId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Caminhão</FormLabel>
                    <Select onValueChange={(val) => field.onChange(val === "none" ? "" : val)} defaultValue={field.value || "none"}>
                      <FormControl>
                        <SelectTrigger data-testid="select-fine-truck">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Nenhum</SelectItem>
                        {trucks.map((truck) => (
                          <SelectItem key={truck.id} value={truck.id}>
                            {truck.number} - {truck.plate}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="driverId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Motorista</FormLabel>
                    <Select onValueChange={(val) => field.onChange(val === "none" ? "" : val)} defaultValue={field.value || "none"}>
                      <FormControl>
                        <SelectTrigger data-testid="select-fine-driver">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Nenhum</SelectItem>
                        {drivers.map((driver) => (
                          <SelectItem key={driver.id} value={driver.id}>
                            {driver.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="infraction"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Infração</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-fine-infraction">
                        <SelectValue placeholder="Selecione a infração" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {infractionTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
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
                name="value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor (R$)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0,00"
                        data-testid="input-fine-value"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data da Infração</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                            data-testid="button-fine-date"
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
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de Vencimento</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                            data-testid="button-fine-due-date"
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
                name="autoNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>N do Auto</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Número do auto"
                        data-testid="input-fine-auto-number"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Local</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Local da infração"
                      data-testid="input-fine-location"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Observações adicionais"
                      data-testid="input-fine-notes"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={mutation.isPending}
                data-testid="button-submit-fine"
              >
                {mutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                Registrar Multa
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
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-4 w-32 mt-2" />
            </CardContent>
          </Card>
        ))}
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

export default function FinesPage() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: fines, isLoading: finesLoading } = useQuery<FineWithDetails[]>({
    queryKey: ["/api/fines"],
  });

  const { data: trucks, isLoading: trucksLoading } = useQuery<Truck[]>({
    queryKey: ["/api/trucks"],
  });

  const { data: drivers, isLoading: driversLoading } = useQuery<Driver[]>({
    queryKey: ["/api/drivers"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/fines/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fines"] });
      toast({
        title: "Multa excluída",
        description: "O registro foi removido com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível excluir a multa.",
        variant: "destructive",
      });
    },
  });

  const markPaidMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("PATCH", `/api/fines/${id}`, {
        status: "paid",
        paidAt: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fines"] });
      toast({
        title: "Multa paga",
        description: "A multa foi marcada como paga.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a multa.",
        variant: "destructive",
      });
    },
  });

  if (finesLoading || trucksLoading || driversLoading) {
    return <LoadingSkeleton />;
  }

  const formatCurrency = (value: number | string) => {
    const numValue = typeof value === "string" ? parseFloat(value) : value;
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(numValue);
  };

  const totalPending = fines?.filter((f) => f.status === "pending").reduce((sum, f) => sum + Number(f.value), 0) || 0;
  const totalPaid = fines?.filter((f) => f.status === "paid").reduce((sum, f) => sum + Number(f.value), 0) || 0;
  const pendingCount = fines?.filter((f) => f.status === "pending").length || 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <span className="text-sm font-medium text-destructive">Infrações</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-fines-title">
            Multas
          </h1>
          <p className="text-muted-foreground mt-1">
            Controle de multas de trânsito da frota
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} data-testid="button-add-fine">
          <Plus className="mr-2 h-4 w-4" />
          Nova Multa
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-amber-500/5 to-orange-500/5">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg">
                <Clock className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pendentes</p>
                <p className="text-2xl font-bold text-amber-700 dark:text-amber-400" data-testid="stat-pending-fines">
                  {formatCurrency(totalPending)}
                </p>
                <p className="text-xs text-muted-foreground">{pendingCount} multa(s)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-emerald-500/5 to-teal-500/5">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg">
                <Check className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pagas</p>
                <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400" data-testid="stat-paid-fines">
                  {formatCurrency(totalPaid)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-rose-500/5 to-pink-500/5">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 shadow-lg">
                <DollarSign className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold text-rose-700 dark:text-rose-400" data-testid="stat-total-fines">
                  {formatCurrency(totalPending + totalPaid)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle>Registro de Multas</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {fines && fines.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Infração</TableHead>
                    <TableHead>Caminhão</TableHead>
                    <TableHead>Motorista</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fines.map((fine) => (
                    <TableRow key={fine.id} data-testid={`row-fine-${fine.id}`}>
                      <TableCell>
                        {format(new Date(fine.date), "dd/MM/yyyy", { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{fine.infraction}</p>
                          {fine.location && (
                            <p className="text-xs text-muted-foreground">{fine.location}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {fine.truck ? (
                          <Badge variant="outline">
                            {fine.truck.number} - {fine.truck.plate}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {fine.driver ? (
                          <span>{fine.driver.name}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium text-rose-600 dark:text-rose-400">
                        {formatCurrency(fine.value)}
                      </TableCell>
                      <TableCell>
                        {fine.dueDate ? (
                          format(new Date(fine.dueDate), "dd/MM/yyyy", { locale: ptBR })
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={fine.status === "paid" ? "default" : "secondary"}
                          className={cn(
                            fine.status === "paid"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                          )}
                        >
                          {fine.status === "paid" ? "Paga" : "Pendente"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {fine.status === "pending" && (
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => markPaidMutation.mutate(fine.id)}
                              disabled={markPaidMutation.isPending}
                              title="Marcar como paga"
                              data-testid={`button-pay-fine-${fine.id}`}
                            >
                              <Check className="h-4 w-4 text-emerald-600" />
                            </Button>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => deleteMutation.mutate(fine.id)}
                            disabled={deleteMutation.isPending}
                            title="Excluir multa"
                            data-testid={`button-delete-fine-${fine.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-lg font-medium">Nenhuma multa registrada</h3>
              <p className="text-muted-foreground mt-1">
                Clique em "Nova Multa" para adicionar
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <FineFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        trucks={trucks || []}
        drivers={drivers || []}
      />
    </div>
  );
}
