import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Route } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
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
import { Plus, Route as RouteIcon, Pencil, Trash2, Loader2, MapPin, Navigation, Clock } from "lucide-react";

const routeFormSchema = z.object({
  origin: z.string().min(1, "Origem é obrigatória"),
  destination: z.string().min(1, "Destino é obrigatório"),
  distance: z.coerce.number().min(0).optional().nullable(),
  estimatedTime: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  status: z.enum(["active", "inactive"]),
});

type RouteFormData = z.infer<typeof routeFormSchema>;

function RouteFormDialog({
  route,
  open,
  onOpenChange,
}: {
  route?: Route;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const isEditing = !!route;

  const form = useForm<RouteFormData>({
    resolver: zodResolver(routeFormSchema),
    defaultValues: {
      origin: route?.origin || "",
      destination: route?.destination || "",
      distance: route?.distance ? Number(route.distance) : null,
      estimatedTime: route?.estimatedTime || "",
      notes: route?.notes || "",
      status: (route?.status as "active" | "inactive") || "active",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: RouteFormData) => {
      const payload = {
        ...data,
        distance: data.distance ? String(data.distance) : null,
      };
      if (isEditing) {
        return apiRequest("PATCH", `/api/routes/${route.id}`, payload);
      }
      return apiRequest("POST", "/api/routes", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/routes"] });
      toast({
        title: isEditing ? "Rota atualizada!" : "Rota cadastrada!",
        description: isEditing
          ? "As informações foram atualizadas com sucesso."
          : "A rota foi adicionada ao sistema.",
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

  const onSubmit = (data: RouteFormData) => {
    mutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {isEditing ? "Editar Rota" : "Nova Rota"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Atualize as informações da rota"
              : "Preencha os dados para cadastrar uma nova rota"}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="origin"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Origem</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: São Paulo, SP"
                      {...field}
                      data-testid="input-origin"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="destination"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Destino</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: Rio de Janeiro, RJ"
                      {...field}
                      data-testid="input-destination"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="distance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Distância (km)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Ex: 450"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                        data-testid="input-distance"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="estimatedTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tempo Estimado</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: 6 horas"
                        {...field}
                        value={field.value ?? ""}
                        data-testid="input-estimated-time"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-status">
                        <SelectValue placeholder="Selecione o status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="active">Ativa</SelectItem>
                      <SelectItem value="inactive">Inativa</SelectItem>
                    </SelectContent>
                  </Select>
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
                      placeholder="Observações sobre a rota..."
                      {...field}
                      value={field.value ?? ""}
                      data-testid="input-notes"
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
                data-testid="button-cancel"
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={mutation.isPending} data-testid="button-submit">
                {mutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {isEditing ? "Salvar" : "Cadastrar"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function RouteCard({
  route,
  onEdit,
  onDelete,
}: {
  route: Route;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <Card className="hover-elevate" data-testid={`card-route-${route.id}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted">
              <RouteIcon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold truncate">
                  {route.origin} → {route.destination}
                </h3>
                <Badge
                  variant={route.status === "active" ? "default" : "secondary"}
                >
                  {route.status === "active" ? "Ativa" : "Inativa"}
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1 flex-wrap">
                {route.distance && (
                  <span className="flex items-center gap-1">
                    <Navigation className="h-3 w-3" />
                    {Number(route.distance).toLocaleString("pt-BR")} km
                  </span>
                )}
                {route.estimatedTime && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {route.estimatedTime}
                  </span>
                )}
              </div>
              {route.notes && (
                <p className="text-sm text-muted-foreground mt-1 truncate">
                  {route.notes}
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={onEdit}
              data-testid={`button-edit-${route.id}`}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onDelete}
              data-testid={`button-delete-${route.id}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function RoutesPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState<Route | undefined>();
  const { toast } = useToast();

  const { data: routes, isLoading } = useQuery<Route[]>({
    queryKey: ["/api/routes"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/routes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/routes"] });
      toast({
        title: "Rota excluída",
        description: "A rota foi removida com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao excluir rota",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (route: Route) => {
    setEditingRoute(route);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Tem certeza que deseja excluir esta rota?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setEditingRoute(undefined);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MapPin className="h-6 w-6" />
            Rotas Cadastradas
          </h1>
          <p className="text-muted-foreground">
            Gerencie as rotas frequentes do sistema
          </p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} data-testid="button-new-route">
          <Plus className="h-4 w-4 mr-2" />
          Nova Rota
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : routes && routes.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {routes.map((route) => (
            <RouteCard
              key={route.id}
              route={route}
              onEdit={() => handleEdit(route)}
              onDelete={() => handleDelete(route.id)}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma rota cadastrada</h3>
            <p className="text-muted-foreground mb-4">
              Cadastre rotas frequentes para facilitar o registro de viagens.
            </p>
            <Button onClick={() => setIsDialogOpen(true)} data-testid="button-new-route-empty">
              <Plus className="h-4 w-4 mr-2" />
              Cadastrar Primeira Rota
            </Button>
          </CardContent>
        </Card>
      )}

      <RouteFormDialog
        route={editingRoute}
        open={isDialogOpen}
        onOpenChange={handleOpenChange}
      />
    </div>
  );
}
