import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Truck, Maintenance } from "@shared/schema";
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
import { Plus, Wrench, Loader2, CalendarIcon, Upload, FileText, ExternalLink, Filter, Sparkles, DollarSign, X } from "lucide-react";
import { cn } from "@/lib/utils";

const maintenanceTypes = [
  "Troca de óleo",
  "Troca de pneus",
  "Revisão de freios",
  "Manutenção preventiva",
  "Troca de filtros",
  "Alinhamento e balanceamento",
  "Revisão elétrica",
  "Troca de embreagem",
  "Outros",
];

const maintenanceFormSchema = z.object({
  truckId: z.string().min(1, "Selecione um caminhão"),
  type: z.string().min(1, "Tipo é obrigatório"),
  observations: z.string().optional(),
  value: z.coerce.number().min(0.01, "Valor deve ser maior que zero"),
  date: z.date({ required_error: "Data é obrigatória" }),
});

type MaintenanceFormData = z.infer<typeof maintenanceFormSchema>;

interface MaintenanceWithTruck extends Maintenance {
  truck?: Truck;
}

function MaintenanceFormDialog({
  open,
  onOpenChange,
  trucks,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trucks: Truck[];
}) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const form = useForm<MaintenanceFormData>({
    resolver: zodResolver(maintenanceFormSchema),
    defaultValues: {
      truckId: "",
      type: "",
      observations: "",
      value: 0,
      date: new Date(),
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: MaintenanceFormData) => {
      let receiptUrl = null;

      if (uploadedFile) {
        setIsUploading(true);
        const formData = new FormData();
        formData.append("file", uploadedFile);

        try {
          const uploadResponse = await fetch("/api/upload", {
            method: "POST",
            body: formData,
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          });

          if (!uploadResponse.ok) {
            throw new Error("Erro ao fazer upload do arquivo");
          }

          const uploadResult = await uploadResponse.json();
          receiptUrl = uploadResult.url;
        } finally {
          setIsUploading(false);
        }
      }

      return apiRequest("POST", "/api/maintenances", {
        ...data,
        date: data.date.toISOString(),
        receiptUrl,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maintenances"] });
      queryClient.invalidateQueries({ queryKey: ["/api/trucks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({
        title: "Manutenção registrada!",
        description: "O registro de manutenção foi salvo com sucesso.",
      });
      onOpenChange(false);
      form.reset();
      setUploadedFile(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message || "Ocorreu um erro ao salvar",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: MaintenanceFormData) => {
    mutation.mutate(data);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Arquivo muito grande",
          description: "O arquivo deve ter no máximo 5MB",
          variant: "destructive",
        });
        return;
      }
      setUploadedFile(file);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl">Nova Manutenção</DialogTitle>
          <DialogDescription>
            Registre os gastos com manutenção do caminhão
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
                      <SelectTrigger className="h-11" data-testid="select-maintenance-truck">
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
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Manutenção</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-11" data-testid="select-maintenance-type">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {maintenanceTypes.map((type) => (
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
              <FormField
                control={form.control}
                name="value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor (R$)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" className="h-11" data-testid="input-maintenance-value" {...field} />
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
                          data-testid="button-select-maintenance-date"
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
              name="observations"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Detalhes adicionais sobre a manutenção..."
                      className="resize-none min-h-[80px]"
                      data-testid="input-maintenance-observations"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div>
              <FormLabel>Comprovante (opcional)</FormLabel>
              <div className="mt-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*,.pdf"
                  className="hidden"
                  data-testid="input-maintenance-receipt"
                />
                {uploadedFile ? (
                  <div className="flex items-center gap-3 p-4 border rounded-xl bg-muted/30">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <span className="text-sm flex-1 truncate font-medium">{uploadedFile.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setUploadedFile(null)}
                    >
                      Remover
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-11"
                    onClick={() => fileInputRef.current?.click()}
                    data-testid="button-upload-receipt"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Anexar Comprovante
                  </Button>
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  Aceita imagens e PDF (máx. 5MB)
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={mutation.isPending || isUploading} data-testid="button-save-maintenance">
                {mutation.isPending || isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isUploading ? "Enviando..." : "Salvando..."}
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

function getTypeBadgeColor(type: string) {
  const colors: Record<string, string> = {
    "Troca de óleo": "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20",
    "Troca de pneus": "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
    "Revisão de freios": "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
    "Manutenção preventiva": "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
    "Troca de filtros": "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/20",
    "Alinhamento e balanceamento": "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20",
    "Revisão elétrica": "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20",
    "Troca de embreagem": "bg-pink-500/10 text-pink-700 dark:text-pink-400 border-pink-500/20",
  };
  return colors[type] || "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20";
}

export default function MaintenancesPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [startDate, setStartDate] = useState<Date | undefined>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date | undefined>(endOfMonth(new Date()));
  const [selectedTruck, setSelectedTruck] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");

  const { data: maintenances, isLoading: maintenancesLoading } = useQuery<MaintenanceWithTruck[]>({
    queryKey: ["/api/maintenances"],
  });

  const { data: trucks, isLoading: trucksLoading } = useQuery<Truck[]>({
    queryKey: ["/api/trucks"],
  });

  if (maintenancesLoading || trucksLoading) {
    return <LoadingSkeleton />;
  }

  const formatCurrency = (value: string | number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(Number(value));
  };

  const filteredMaintenances = maintenances?.filter((maintenance) => {
    const maintenanceDate = new Date(maintenance.date);
    const matchesDateRange = (!startDate || maintenanceDate >= startDate) && (!endDate || maintenanceDate <= endDate);
    const matchesTruck = selectedTruck === "all" || maintenance.truckId === selectedTruck;
    const matchesType = selectedType === "all" || maintenance.type === selectedType;
    return matchesDateRange && matchesTruck && matchesType;
  }) || [];

  const totalCost = filteredMaintenances.reduce((sum, m) => sum + Number(m.value), 0);

  const clearFilters = () => {
    setStartDate(undefined);
    setEndDate(undefined);
    setSelectedTruck("all");
    setSelectedType("all");
  };

  const hasActiveFilters = startDate || endDate || selectedTruck !== "all" || selectedType !== "all";

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium text-primary">Controle</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-maintenances-title">Manutenções</h1>
          <p className="text-muted-foreground mt-1">
            Controle os gastos com manutenção da frota
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="shadow-lg" data-testid="button-add-maintenance">
          <Plus className="mr-2 h-4 w-4" />
          Nova Manutenção
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
              <label className="text-sm font-medium">Tipo</label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="h-10" data-testid="filter-type">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  {maintenanceTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Total do Período</label>
              <div className="flex items-center gap-2 h-10 px-3 rounded-md bg-gradient-to-r from-red-500/10 to-orange-500/10 border border-red-500/20">
                <DollarSign className="h-4 w-4 text-red-600" />
                <span className="text-sm font-bold text-red-700 dark:text-red-400">
                  {formatCurrency(totalCost)}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-lg">
        <CardContent className="p-0">
          {filteredMaintenances.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Caminhão</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Observações</TableHead>
                  <TableHead className="text-center">Comprovante</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMaintenances.map((maintenance) => (
                  <TableRow key={maintenance.id} data-testid={`row-maintenance-${maintenance.id}`}>
                    <TableCell>
                      {format(new Date(maintenance.date), "dd/MM/yyyy", { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">Caminhão {maintenance.truck?.number || "-"}</p>
                        <p className="text-xs text-muted-foreground">{maintenance.truck?.plate}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getTypeBadgeColor(maintenance.type)}>
                        {maintenance.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-bold text-red-600">
                      -{formatCurrency(maintenance.value)}
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <span className="truncate block text-muted-foreground">
                        {maintenance.observations || "-"}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      {maintenance.receiptUrl ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                        >
                          <a
                            href={maintenance.receiptUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            data-testid={`link-receipt-${maintenance.id}`}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-16">
              <div className="flex h-16 w-16 mx-auto mb-4 items-center justify-center rounded-2xl bg-muted/50">
                <Wrench className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <h3 className="text-lg font-semibold mb-1">Nenhuma manutenção encontrada</h3>
              <p className="text-muted-foreground max-w-sm mx-auto">
                {hasActiveFilters
                  ? "Tente ajustar os filtros para encontrar registros"
                  : "Registre a primeira manutenção da sua frota"}
              </p>
              {!hasActiveFilters && (
                <Button className="mt-4" onClick={() => setDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nova Manutenção
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <MaintenanceFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        trucks={trucks || []}
      />
    </div>
  );
}
