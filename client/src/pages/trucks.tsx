import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { TruckWithDriver, Driver } from "@shared/schema";
import { useAuth } from "@/lib/auth";
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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Plus, Truck as TruckIcon, Pencil, Trash2, Loader2, Gauge, Calendar, Hash, Sparkles, User } from "lucide-react";

const truckFormSchema = z.object({
  number: z.string().min(1, "Número é obrigatório"),
  plate: z.string().min(1, "Placa é obrigatória").regex(/^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/, "Formato de placa inválido (ex: ABC1D23)"),
  model: z.string().min(1, "Modelo é obrigatório"),
  year: z.coerce.number().min(1900).max(new Date().getFullYear() + 1),
  totalKm: z.coerce.number().min(0).optional(),
  status: z.enum(["active", "maintenance", "inactive"]),
  mainDriverId: z.string().nullable().optional(),
});

type TruckFormData = z.infer<typeof truckFormSchema>;

function TruckFormDialog({
  truck,
  open,
  onOpenChange,
}: {
  truck?: TruckWithDriver;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const isEditing = !!truck;

  const { data: drivers } = useQuery<Driver[]>({
    queryKey: ["/api/drivers"],
  });

  const form = useForm<TruckFormData>({
    resolver: zodResolver(truckFormSchema),
    defaultValues: {
      number: truck?.number || "",
      plate: truck?.plate || "",
      model: truck?.model || "",
      year: truck?.year || new Date().getFullYear(),
      totalKm: truck?.totalKm ? Number(truck.totalKm) : 0,
      status: (truck?.status as "active" | "maintenance" | "inactive") || "active",
      mainDriverId: truck?.mainDriverId || null,
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: TruckFormData) => {
      if (isEditing) {
        return apiRequest("PATCH", `/api/trucks/${truck.id}`, data);
      }
      return apiRequest("POST", "/api/trucks", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trucks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({
        title: isEditing ? "Caminhão atualizado!" : "Caminhão cadastrado!",
        description: isEditing
          ? "As informações foram atualizadas com sucesso."
          : "O caminhão foi adicionado à frota.",
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

  const onSubmit = (data: TruckFormData) => {
    mutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {isEditing ? "Editar Caminhão" : "Novo Caminhão"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Atualize as informações do caminhão"
              : "Preencha os dados para cadastrar um novo caminhão"}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número</FormLabel>
                    <FormControl>
                      <Input placeholder="001" className="h-11" data-testid="input-truck-number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="plate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Placa</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="ABC1D23"
                        className="h-11 uppercase"
                        data-testid="input-truck-plate"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="model"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Modelo</FormLabel>
                    <FormControl>
                      <Input placeholder="Volvo FH 460" className="h-11" data-testid="input-truck-model" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="year"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ano</FormLabel>
                    <FormControl>
                      <Input type="number" className="h-11" data-testid="input-truck-year" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="totalKm"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>KM Total</FormLabel>
                    <FormControl>
                      <Input type="number" className="h-11" data-testid="input-truck-km" {...field} />
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
                        <SelectTrigger className="h-11" data-testid="select-truck-status">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Ativo</SelectItem>
                        <SelectItem value="maintenance">Em Manutenção</SelectItem>
                        <SelectItem value="inactive">Inativo</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="mainDriverId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Motorista Principal</FormLabel>
                  <Select 
                    onValueChange={(value) => field.onChange(value === "_none_" ? null : value)} 
                    value={field.value || "_none_"}
                  >
                    <FormControl>
                      <SelectTrigger className="h-11" data-testid="select-truck-driver">
                        <SelectValue placeholder="Selecione um motorista" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="_none_">Nenhum motorista</SelectItem>
                      {drivers?.map((driver) => (
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
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={mutation.isPending} data-testid="button-save-truck">
                {mutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : isEditing ? (
                  "Atualizar"
                ) : (
                  "Cadastrar"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteConfirmDialog({
  truck,
  open,
  onOpenChange,
}: {
  truck: TruckWithDriver;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/trucks/${truck.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trucks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({
        title: "Caminhão excluído",
        description: "O caminhão foi removido da frota.",
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message || "Ocorreu um erro ao excluir",
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Excluir Caminhão</DialogTitle>
          <DialogDescription>
            Tem certeza que deseja excluir o caminhão {truck.number} ({truck.plate})?
            Esta ação não pode ser desfeita e todos os registros associados serão removidos.
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
            data-testid="button-confirm-delete"
          >
            {deleteMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Excluindo...
              </>
            ) : (
              "Excluir"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <div>
          <Skeleton className="h-8 w-40 mb-2" />
          <Skeleton className="h-5 w-64" />
        </div>
        <Skeleton className="h-10 w-36" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-48 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

function getStatusConfig(status: string) {
  switch (status) {
    case "active":
      return { label: "Ativo", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" };
    case "maintenance":
      return { label: "Manutenção", color: "bg-orange-500/10 text-orange-600 border-orange-500/30" };
    case "inactive":
      return { label: "Inativo", color: "bg-slate-500/10 text-slate-600 border-slate-500/30" };
    default:
      return { label: status, color: "bg-slate-500/10 text-slate-600 border-slate-500/30" };
  }
}

export default function TrucksPage() {
  const { isAdmin } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTruck, setEditingTruck] = useState<TruckWithDriver | undefined>();
  const [deletingTruck, setDeletingTruck] = useState<TruckWithDriver | undefined>();

  const { data: trucks, isLoading } = useQuery<TruckWithDriver[]>({
    queryKey: ["/api/trucks"],
  });

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  const formatKm = (km: string | number) => {
    return new Intl.NumberFormat("pt-BR").format(Number(km));
  };

  const activeTrucks = trucks?.filter(t => t.status === "active").length || 0;
  const maintenanceTrucks = trucks?.filter(t => t.status === "maintenance").length || 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium text-primary">Frota</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-trucks-title">Caminhões</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie sua frota de {trucks?.length || 0} veículos
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-4 px-4 py-2 rounded-xl bg-muted/50 border border-border/50">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-sm text-muted-foreground">{activeTrucks} ativos</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-orange-500" />
              <span className="text-sm text-muted-foreground">{maintenanceTrucks} em manutenção</span>
            </div>
          </div>
          {isAdmin && (
            <Button onClick={() => { setEditingTruck(undefined); setDialogOpen(true); }} data-testid="button-add-truck" className="shadow-lg">
              <Plus className="mr-2 h-4 w-4" />
              Novo Caminhão
            </Button>
          )}
        </div>
      </div>

      {trucks && trucks.length > 0 ? (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {trucks.map((truck) => {
            const statusConfig = getStatusConfig(truck.status);
            return (
              <Card 
                key={truck.id} 
                className="group relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                data-testid={`row-truck-${truck.id}`}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <CardContent className="relative p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/10">
                      <TruckIcon className="h-6 w-6 text-primary" />
                    </div>
                    <Badge variant="outline" className={statusConfig.color}>
                      {statusConfig.label}
                    </Badge>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <p className="text-2xl font-bold">Caminhão {truck.number}</p>
                      <p className="text-sm text-muted-foreground font-medium">{truck.plate}</p>
                    </div>
                    
                    <p className="text-sm font-medium text-foreground/80">{truck.model}</p>
                    
                    <div className="flex items-center gap-4 pt-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>{truck.year}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Gauge className="h-3.5 w-3.5" />
                        <span>{formatKm(truck.totalKm)} km</span>
                      </div>
                    </div>
                    {truck.mainDriver && (
                      <div className="flex items-center gap-1.5 pt-2 text-sm text-primary">
                        <User className="h-3.5 w-3.5" />
                        <span>{truck.mainDriver.name}</span>
                      </div>
                    )}
                  </div>

                  {isAdmin && (
                    <div className="flex justify-end gap-1 mt-4 pt-4 border-t border-border/50">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setEditingTruck(truck); setDialogOpen(true); }}
                        data-testid={`button-edit-truck-${truck.id}`}
                      >
                        <Pencil className="h-4 w-4 mr-1.5" />
                        Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeletingTruck(truck)}
                        className="text-destructive hover:text-destructive"
                        data-testid={`button-delete-truck-${truck.id}`}
                      >
                        <Trash2 className="h-4 w-4 mr-1.5" />
                        Excluir
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
              <TruckIcon className="h-10 w-10 text-muted-foreground/50" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Nenhum caminhão cadastrado</h3>
            <p className="text-muted-foreground max-w-sm mx-auto">
              Adicione seu primeiro caminhão para começar a gerenciar sua frota
            </p>
            {isAdmin && (
              <Button className="mt-6 shadow-lg" onClick={() => setDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Cadastrar Caminhão
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <TruckFormDialog
        truck={editingTruck}
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingTruck(undefined);
        }}
      />

      {deletingTruck && (
        <DeleteConfirmDialog
          truck={deletingTruck}
          open={!!deletingTruck}
          onOpenChange={(open) => !open && setDeletingTruck(undefined)}
        />
      )}
    </div>
  );
}
