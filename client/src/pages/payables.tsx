import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Payable } from "@shared/schema";
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
import { Plus, ArrowDownCircle, Loader2, CalendarIcon, Filter, DollarSign, X, Check, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

const payableCategories = [
  "INSS",
  "FGTS",
  "DARF",
  "Alvará",
  "Licença",
  "Salário Motorista",
  "Salário Funcionário",
  "Contador",
  "Aluguel",
  "Energia",
  "Água",
  "Telefone/Internet",
  "Imposto Municipal",
  "Imposto Estadual",
  "Imposto Federal",
  "Seguro",
  "Financiamento",
  "Outros",
];

const payableFormSchema = z.object({
  description: z.string().min(1, "Descrição é obrigatória"),
  category: z.string().min(1, "Categoria é obrigatória"),
  value: z.coerce.number().min(0.01, "Valor deve ser maior que zero"),
  date: z.date({ required_error: "Data é obrigatória" }),
  dueDate: z.date().optional().nullable(),
  notes: z.string().optional(),
  status: z.enum(["pending", "paid", "overdue"]),
});

type PayableFormData = z.infer<typeof payableFormSchema>;

function PayableFormDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();

  const form = useForm<PayableFormData>({
    resolver: zodResolver(payableFormSchema),
    defaultValues: {
      description: "",
      category: "",
      value: 0,
      date: new Date(),
      dueDate: null,
      notes: "",
      status: "pending",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: PayableFormData) => {
      return apiRequest("POST", "/api/payables", {
        ...data,
        date: data.date.toISOString(),
        dueDate: data.dueDate?.toISOString() || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payables"] });
      queryClient.invalidateQueries({ queryKey: ["/api/financial-summary"] });
      toast({
        title: "Conta registrada!",
        description: "A conta a pagar foi salva com sucesso.",
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

  const onSubmit = (data: PayableFormData) => {
    mutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl">Nova Conta a Pagar</DialogTitle>
          <DialogDescription>
            Registre uma nova despesa ou conta a pagar
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoria</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-11" data-testid="select-payable-category">
                        <SelectValue placeholder="Selecione a categoria" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {payableCategories.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
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
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: INSS competência 11/2024" className="h-11" data-testid="input-payable-description" {...field} />
                  </FormControl>
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
                      <Input type="number" step="0.01" className="h-11" data-testid="input-payable-value" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-11" data-testid="select-payable-status">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="pending">Pendente</SelectItem>
                        <SelectItem value="paid">Pago</SelectItem>
                        <SelectItem value="overdue">Vencido</SelectItem>
                      </SelectContent>
                    </Select>
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
                            data-testid="button-select-payable-date"
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
                name="dueDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Vencimento (opcional)</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "h-11 pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                            data-testid="button-select-payable-due-date"
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
                          selected={field.value || undefined}
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

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações (opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Detalhes adicionais..."
                      className="resize-none min-h-[80px]"
                      data-testid="input-payable-notes"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={mutation.isPending} data-testid="button-save-payable">
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

function getStatusBadge(status: string) {
  switch (status) {
    case "paid":
      return <Badge className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20">Pago</Badge>;
    case "overdue":
      return <Badge className="bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20">Vencido</Badge>;
    default:
      return <Badge className="bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20">Pendente</Badge>;
  }
}

function getCategoryBadgeColor(category: string) {
  const colors: Record<string, string> = {
    "INSS": "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
    "FGTS": "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
    "DARF": "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
    "Salário Motorista": "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20",
    "Salário Funcionário": "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20",
    "Contador": "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/20",
  };
  return colors[category] || "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20";
}

export default function PayablesPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [startDate, setStartDate] = useState<Date | undefined>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date | undefined>(endOfMonth(new Date()));
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const { toast } = useToast();

  const { data: payables, isLoading } = useQuery<Payable[]>({
    queryKey: ["/api/payables"],
  });

  const markAsPaidMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("PATCH", `/api/payables/${id}`, { status: "paid", paidAt: new Date().toISOString() });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payables"] });
      queryClient.invalidateQueries({ queryKey: ["/api/financial-summary"] });
      toast({ title: "Conta marcada como paga!" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/payables/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payables"] });
      queryClient.invalidateQueries({ queryKey: ["/api/financial-summary"] });
      toast({ title: "Conta excluída!" });
    },
  });

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  const formatCurrency = (value: string | number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(Number(value));
  };

  const filteredPayables = payables?.filter((p) => {
    const pDate = new Date(p.date);
    const matchesDateRange = (!startDate || pDate >= startDate) && (!endDate || pDate <= endDate);
    const matchesCategory = selectedCategory === "all" || p.category === selectedCategory;
    const matchesStatus = selectedStatus === "all" || p.status === selectedStatus;
    return matchesDateRange && matchesCategory && matchesStatus;
  }) || [];

  const totalValue = filteredPayables.reduce((sum, p) => sum + Number(p.value), 0);
  const pendingValue = filteredPayables.filter(p => p.status === "pending").reduce((sum, p) => sum + Number(p.value), 0);

  const clearFilters = () => {
    setStartDate(undefined);
    setEndDate(undefined);
    setSelectedCategory("all");
    setSelectedStatus("all");
  };

  const hasActiveFilters = startDate || endDate || selectedCategory !== "all" || selectedStatus !== "all";

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ArrowDownCircle className="h-5 w-5 text-red-500" />
            <span className="text-sm font-medium text-red-500">Saídas</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-payables-title">Contas a Pagar</h1>
          <p className="text-muted-foreground mt-1">
            Controle de despesas: INSS, FGTS, salários, impostos e mais
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="shadow-lg" data-testid="button-add-payable">
          <Plus className="mr-2 h-4 w-4" />
          Nova Conta
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
                    data-testid="filter-payables-start-date"
                  >
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
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full h-10 justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                    data-testid="filter-payables-end-date"
                  >
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
              <label className="text-sm font-medium">Categoria</label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="h-10" data-testid="filter-payables-category">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {payableCategories.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="h-10" data-testid="filter-payables-status">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="paid">Pago</SelectItem>
                  <SelectItem value="overdue">Vencido</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Total</label>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2 h-10 px-3 rounded-md bg-gradient-to-r from-red-500/10 to-rose-500/10 border border-red-500/20">
                  <DollarSign className="h-4 w-4 text-red-600" />
                  <span className="text-sm font-bold text-red-700 dark:text-red-400">
                    {formatCurrency(totalValue)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-lg">
        <CardContent className="p-0">
          {filteredPayables.length > 0 ? (
            <div className="overflow-x-auto">
              <Table className="min-w-[800px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[100px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayables.map((payable) => (
                    <TableRow key={payable.id} data-testid={`row-payable-${payable.id}`}>
                      <TableCell>
                        {format(new Date(payable.date), "dd/MM/yyyy", { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getCategoryBadgeColor(payable.category)}>
                          {payable.category}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="line-clamp-1">{payable.description}</span>
                      </TableCell>
                      <TableCell>
                        {payable.dueDate
                          ? format(new Date(payable.dueDate), "dd/MM/yyyy", { locale: ptBR })
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right font-bold text-red-700 dark:text-red-400">
                        {formatCurrency(payable.value)}
                      </TableCell>
                      <TableCell>{getStatusBadge(payable.status)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {payable.status !== "paid" && (
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => markAsPaidMutation.mutate(payable.id)}
                              disabled={markAsPaidMutation.isPending}
                              data-testid={`button-mark-paid-${payable.id}`}
                            >
                              <Check className="h-4 w-4 text-green-600" />
                            </Button>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => deleteMutation.mutate(payable.id)}
                            disabled={deleteMutation.isPending}
                            data-testid={`button-delete-payable-${payable.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
                <ArrowDownCircle className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold">Nenhuma conta encontrada</h3>
              <p className="text-muted-foreground mt-1 max-w-sm">
                {hasActiveFilters
                  ? "Tente ajustar os filtros para ver mais resultados"
                  : "Comece registrando a primeira conta a pagar"}
              </p>
              {!hasActiveFilters && (
                <Button className="mt-4" onClick={() => setDialogOpen(true)} data-testid="button-add-first-payable">
                  <Plus className="mr-2 h-4 w-4" />
                  Registrar Conta
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <PayableFormDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
