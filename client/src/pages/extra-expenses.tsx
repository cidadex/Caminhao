import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Truck, ExtraExpense } from "@shared/schema";
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
import { Plus, Receipt, Loader2, CalendarIcon, Filter, Sparkles, DollarSign, X } from "lucide-react";
import { cn } from "@/lib/utils";

const expenseCategories = [
  "Pedágio",
  "Estacionamento",
  "Alimentação",
  "Hospedagem",
  "Lavagem",
  "Documentação",
  "Multa",
  "Seguro",
  "Outros",
];

const extraFormSchema = z.object({
  truckId: z.string().optional(),
  category: z.string().min(1, "Categoria é obrigatória"),
  description: z.string().min(1, "Descrição é obrigatória"),
  totalCost: z.coerce.number().min(0.01, "Valor deve ser maior que zero"),
  notes: z.string().optional(),
  date: z.date({ required_error: "Data é obrigatória" }),
});

type ExtraFormData = z.infer<typeof extraFormSchema>;

interface ExtraWithTruck extends ExtraExpense {
  truck?: Truck;
}

function ExtraFormDialog({
  open,
  onOpenChange,
  trucks,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trucks: Truck[];
}) {
  const { toast } = useToast();

  const form = useForm<ExtraFormData>({
    resolver: zodResolver(extraFormSchema),
    defaultValues: {
      truckId: "",
      category: "",
      description: "",
      totalCost: 0,
      notes: "",
      date: new Date(),
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: ExtraFormData) => {
      return apiRequest("POST", "/api/extra-expenses", {
        ...data,
        truckId: data.truckId || null,
        date: data.date.toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/extra-expenses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({
        title: "Gasto registrado!",
        description: "O gasto extra foi salvo com sucesso.",
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

  const onSubmit = (data: ExtraFormData) => {
    mutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl">Novo Gasto Extra</DialogTitle>
          <DialogDescription>
            Registre despesas adicionais da operação
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="truckId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Caminhão (opcional)</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-11" data-testid="select-extra-truck">
                        <SelectValue placeholder="Gasto geral (sem caminhão)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="">Gasto geral (sem caminhão)</SelectItem>
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
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-11" data-testid="select-extra-category">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {expenseCategories.map((cat) => (
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
                name="totalCost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor (R$)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" className="h-11" data-testid="input-extra-value" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
                          data-testid="button-select-extra-date"
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
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Input placeholder="Descreva o gasto" className="h-11" data-testid="input-extra-description" {...field} />
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
                  <FormLabel>Observações (opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Detalhes adicionais..."
                      className="resize-none min-h-[80px]"
                      data-testid="input-extra-notes"
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
              <Button type="submit" disabled={mutation.isPending} data-testid="button-save-extra">
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

function getCategoryBadgeColor(category: string) {
  const colors: Record<string, string> = {
    "Pedágio": "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
    "Estacionamento": "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20",
    "Alimentação": "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20",
    "Hospedagem": "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/20",
    "Lavagem": "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
    "Documentação": "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20",
    "Multa": "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
    "Seguro": "bg-pink-500/10 text-pink-700 dark:text-pink-400 border-pink-500/20",
  };
  return colors[category] || "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20";
}

export default function ExtraExpensesPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [startDate, setStartDate] = useState<Date | undefined>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date | undefined>(endOfMonth(new Date()));
  const [selectedTruck, setSelectedTruck] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const { data: extraExpenses, isLoading: extraLoading } = useQuery<ExtraWithTruck[]>({
    queryKey: ["/api/extra-expenses"],
  });

  const { data: trucks, isLoading: trucksLoading } = useQuery<Truck[]>({
    queryKey: ["/api/trucks"],
  });

  if (extraLoading || trucksLoading) {
    return <LoadingSkeleton />;
  }

  const formatCurrency = (value: string | number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(Number(value));
  };

  const filteredExpenses = extraExpenses?.filter((expense) => {
    const expDate = new Date(expense.date);
    const matchesDateRange = (!startDate || expDate >= startDate) && (!endDate || expDate <= endDate);
    const matchesTruck = selectedTruck === "all" || 
      (selectedTruck === "none" && !expense.truckId) || 
      expense.truckId === selectedTruck;
    const matchesCategory = selectedCategory === "all" || expense.category === selectedCategory;
    return matchesDateRange && matchesTruck && matchesCategory;
  }) || [];

  const totalCost = filteredExpenses.reduce((sum, e) => sum + Number(e.totalCost), 0);

  const clearFilters = () => {
    setStartDate(undefined);
    setEndDate(undefined);
    setSelectedTruck("all");
    setSelectedCategory("all");
  };

  const hasActiveFilters = startDate || endDate || selectedTruck !== "all" || selectedCategory !== "all";

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium text-primary">Controle</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-extra-title">Gastos Extras</h1>
          <p className="text-muted-foreground mt-1">
            Controle as despesas adicionais da operação
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="shadow-lg" data-testid="button-add-extra">
          <Plus className="mr-2 h-4 w-4" />
          Novo Gasto
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
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="none">Gastos Gerais</SelectItem>
                  {trucks?.map((truck) => (
                    <SelectItem key={truck.id} value={truck.id}>
                      Caminhão {truck.number} - {truck.plate}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Categoria</label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="h-10" data-testid="filter-category">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as categorias</SelectItem>
                  {expenseCategories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Total do Período</label>
              <div className="flex items-center gap-2 h-10 px-3 rounded-md bg-gradient-to-r from-orange-500/10 to-amber-500/10 border border-orange-500/20">
                <DollarSign className="h-4 w-4 text-orange-600" />
                <span className="text-sm font-bold text-orange-700 dark:text-orange-400">
                  {formatCurrency(totalCost)}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-lg">
        <CardContent className="p-0">
          {filteredExpenses.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Caminhão</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Observações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExpenses.map((expense) => (
                  <TableRow key={expense.id} data-testid={`row-extra-${expense.id}`}>
                    <TableCell>
                      {format(new Date(expense.date), "dd/MM/yyyy", { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      {expense.truck ? (
                        <div>
                          <div className="font-medium">Caminhão {expense.truck.number}</div>
                          <div className="text-xs text-muted-foreground">{expense.truck.plate}</div>
                        </div>
                      ) : (
                        <Badge variant="secondary">Gasto Geral</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getCategoryBadgeColor(expense.category)}>
                        {expense.category}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="line-clamp-1">{expense.description}</span>
                    </TableCell>
                    <TableCell className="text-right font-bold text-orange-700 dark:text-orange-400">
                      {formatCurrency(expense.totalCost)}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground line-clamp-1">
                        {expense.notes || "-"}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
                <Receipt className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold">Nenhum gasto encontrado</h3>
              <p className="text-muted-foreground mt-1 max-w-sm">
                {hasActiveFilters
                  ? "Tente ajustar os filtros para ver mais resultados"
                  : "Comece registrando o primeiro gasto extra"}
              </p>
              {!hasActiveFilters && (
                <Button className="mt-4" onClick={() => setDialogOpen(true)} data-testid="button-add-first-extra">
                  <Plus className="mr-2 h-4 w-4" />
                  Registrar Gasto
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <ExtraFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        trucks={trucks || []}
      />
    </div>
  );
}
