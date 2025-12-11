import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Truck, Maintenance } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Plus, Wrench, Loader2, CalendarIcon, Upload, FileText, ExternalLink, Sparkles, Truck as TruckIcon, DollarSign, Settings } from "lucide-react";
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
    <div className="space-y-8">
      <div className="flex justify-between">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-5 w-72" />
        </div>
        <Skeleton className="h-10 w-40" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="h-40 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

function getTypeConfig(type: string) {
  const configs: Record<string, { color: string; icon: typeof Wrench }> = {
    "Troca de óleo": { color: "from-yellow-500 to-amber-600", icon: Settings },
    "Troca de pneus": { color: "from-blue-500 to-indigo-600", icon: Settings },
    "Revisão de freios": { color: "from-red-500 to-rose-600", icon: Settings },
    "Manutenção preventiva": { color: "from-green-500 to-emerald-600", icon: Wrench },
    "Troca de filtros": { color: "from-cyan-500 to-teal-600", icon: Settings },
    "Alinhamento e balanceamento": { color: "from-purple-500 to-violet-600", icon: Settings },
    "Revisão elétrica": { color: "from-orange-500 to-amber-600", icon: Settings },
    "Troca de embreagem": { color: "from-pink-500 to-rose-600", icon: Settings },
  };
  return configs[type] || { color: "from-slate-500 to-slate-600", icon: Wrench };
}

export default function MaintenancesPage() {
  const [dialogOpen, setDialogOpen] = useState(false);

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

  const totalCost = maintenances?.reduce((sum, m) => sum + Number(m.value), 0) || 0;

  return (
    <div className="space-y-8">
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
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-red-500/10 to-orange-500/10 border border-red-500/20">
            <DollarSign className="h-4 w-4 text-red-600" />
            <span className="text-sm font-medium text-red-700 dark:text-red-400">
              Total: {formatCurrency(totalCost)}
            </span>
          </div>
          <Button onClick={() => setDialogOpen(true)} className="shadow-lg" data-testid="button-add-maintenance">
            <Plus className="mr-2 h-4 w-4" />
            Nova Manutenção
          </Button>
        </div>
      </div>

      {maintenances && maintenances.length > 0 ? (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {maintenances.map((maintenance) => {
            const typeConfig = getTypeConfig(maintenance.type);
            const TypeIcon = typeConfig.icon;
            return (
              <Card 
                key={maintenance.id}
                className="group relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                data-testid={`row-maintenance-${maintenance.id}`}
              >
                <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${typeConfig.color}`} />
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${typeConfig.color} shadow-lg`}>
                      <TypeIcon className="h-5 w-5 text-white" />
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-red-600">
                        -{formatCurrency(maintenance.value)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(maintenance.date), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Badge variant="outline" className="bg-muted/50">
                      {maintenance.type}
                    </Badge>
                    
                    <div className="flex items-center gap-2 text-sm">
                      <TruckIcon className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Caminhão {maintenance.truck?.number || "-"}</span>
                      <span className="text-muted-foreground">({maintenance.truck?.plate})</span>
                    </div>

                    {maintenance.observations && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {maintenance.observations}
                      </p>
                    )}
                  </div>

                  {maintenance.receiptUrl && (
                    <div className="mt-4 pt-4 border-t border-border/50">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        asChild
                      >
                        <a
                          href={maintenance.receiptUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          data-testid={`link-receipt-${maintenance.id}`}
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          Ver Comprovante
                          <ExternalLink className="h-3 w-3 ml-auto" />
                        </a>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="border-0 shadow-lg">
          <CardContent className="text-center py-16">
            <div className="flex h-20 w-20 mx-auto mb-6 items-center justify-center rounded-2xl bg-muted/50">
              <Wrench className="h-10 w-10 text-muted-foreground/50" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Nenhuma manutenção registrada</h3>
            <p className="text-muted-foreground max-w-sm mx-auto">
              Registre a primeira manutenção da sua frota para controlar os custos
            </p>
            <Button className="mt-6 shadow-lg" onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Manutenção
            </Button>
          </CardContent>
        </Card>
      )}

      <MaintenanceFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        trucks={trucks || []}
      />
    </div>
  );
}
