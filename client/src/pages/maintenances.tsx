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
import { Plus, Wrench, Loader2, CalendarIcon, Upload, FileText, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

const maintenanceTypes = [
  "Troca de óleo",
  "Troca de pneus",
  "Freios",
  "Suspensão",
  "Motor",
  "Elétrica",
  "Revisão geral",
  "Outros",
];

const maintenanceFormSchema = z.object({
  truckId: z.string().min(1, "Selecione um caminhão"),
  type: z.string().min(1, "Tipo é obrigatório"),
  value: z.coerce.number().min(0.01, "Valor deve ser maior que zero"),
  date: z.date({ required_error: "Data é obrigatória" }),
  observations: z.string().optional(),
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
      value: 0,
      date: new Date(),
      observations: "",
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
          <DialogTitle>Nova Manutenção</DialogTitle>
          <DialogDescription>
            Registre os gastos com manutenção do caminhão
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
                      <SelectTrigger data-testid="select-maintenance-truck">
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
                        <SelectTrigger data-testid="select-maintenance-type">
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
                      <Input type="number" step="0.01" data-testid="input-maintenance-value" {...field} />
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
                            "pl-3 text-left font-normal",
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
                      className="resize-none"
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
                  <div className="flex items-center gap-2 p-3 border rounded-md bg-muted/50">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm flex-1 truncate">{uploadedFile.name}</span>
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
                    className="w-full"
                    onClick={() => fileInputRef.current?.click()}
                    data-testid="button-upload-receipt"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Anexar Comprovante
                  </Button>
                )}
                <p className="text-xs text-muted-foreground mt-1">
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
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <TableHead key={i}>
                    <Skeleton className="h-4 w-20" />
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {[1, 2, 3, 4].map((row) => (
                <TableRow key={row}>
                  {[1, 2, 3, 4, 5, 6].map((cell) => (
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

  const getTypeBadgeColor = (type: string) => {
    const colors: Record<string, string> = {
      "Troca de óleo": "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
      "Troca de pneus": "bg-blue-500/10 text-blue-600 border-blue-500/20",
      Freios: "bg-red-500/10 text-red-600 border-red-500/20",
      Suspensão: "bg-purple-500/10 text-purple-600 border-purple-500/20",
      Motor: "bg-orange-500/10 text-orange-600 border-orange-500/20",
      Elétrica: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20",
      "Revisão geral": "bg-green-500/10 text-green-600 border-green-500/20",
    };
    return colors[type] || "bg-gray-500/10 text-gray-600 border-gray-500/20";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-maintenances-title">Manutenções</h1>
          <p className="text-muted-foreground">Controle os gastos com manutenção da frota</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} data-testid="button-add-maintenance">
          <Plus className="mr-2 h-4 w-4" />
          Nova Manutenção
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {maintenances && maintenances.length > 0 ? (
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
                {maintenances.map((maintenance) => (
                  <TableRow key={maintenance.id} data-testid={`row-maintenance-${maintenance.id}`}>
                    <TableCell>
                      {format(new Date(maintenance.date), "dd/MM/yyyy", { locale: ptBR })}
                    </TableCell>
                    <TableCell className="font-medium">
                      {maintenance.truck?.number || "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getTypeBadgeColor(maintenance.type)}>
                        {maintenance.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium text-red-600">
                      -{formatCurrency(maintenance.value)}
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-muted-foreground">
                      {maintenance.observations || "-"}
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
            <div className="text-center py-12">
              <Wrench className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-lg font-medium">Nenhuma manutenção registrada</h3>
              <p className="text-muted-foreground mt-1">
                Registre a primeira manutenção da sua frota
              </p>
              <Button className="mt-4" onClick={() => setDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Nova Manutenção
              </Button>
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
