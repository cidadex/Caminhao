import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Truck } from "@shared/schema";
import { useAuth } from "@/lib/auth";
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
  DialogTrigger,
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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Plus, Truck as TruckIcon, Pencil, Trash2, Loader2 } from "lucide-react";

const truckFormSchema = z.object({
  number: z.string().min(1, "Número é obrigatório"),
  plate: z.string().min(1, "Placa é obrigatória").regex(/^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/, "Formato de placa inválido (ex: ABC1D23)"),
  model: z.string().min(1, "Modelo é obrigatório"),
  year: z.coerce.number().min(1900).max(new Date().getFullYear() + 1),
  totalKm: z.coerce.number().min(0).optional(),
  status: z.enum(["active", "maintenance"]),
});

type TruckFormData = z.infer<typeof truckFormSchema>;

function TruckFormDialog({
  truck,
  open,
  onOpenChange,
}: {
  truck?: Truck;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const isEditing = !!truck;

  const form = useForm<TruckFormData>({
    resolver: zodResolver(truckFormSchema),
    defaultValues: {
      number: truck?.number || "",
      plate: truck?.plate || "",
      model: truck?.model || "",
      year: truck?.year || new Date().getFullYear(),
      totalKm: truck?.totalKm ? Number(truck.totalKm) : 0,
      status: (truck?.status as "active" | "maintenance") || "active",
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Caminhão" : "Novo Caminhão"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Atualize as informações do caminhão"
              : "Preencha os dados para cadastrar um novo caminhão"}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número</FormLabel>
                    <FormControl>
                      <Input placeholder="001" data-testid="input-truck-number" {...field} />
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
                      <Input placeholder="Volvo FH 460" data-testid="input-truck-model" {...field} />
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
                      <Input type="number" data-testid="input-truck-year" {...field} />
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
                      <Input type="number" data-testid="input-truck-km" {...field} />
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
                        <SelectTrigger data-testid="select-truck-status">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Ativo</SelectItem>
                        <SelectItem value="maintenance">Em Manutenção</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
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
  truck: Truck;
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
    <div className="space-y-4">
      <div className="flex justify-between">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-9 w-32" />
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
              {[1, 2, 3].map((row) => (
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

export default function TrucksPage() {
  const { isAdmin } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTruck, setEditingTruck] = useState<Truck | undefined>();
  const [deletingTruck, setDeletingTruck] = useState<Truck | undefined>();

  const { data: trucks, isLoading } = useQuery<Truck[]>({
    queryKey: ["/api/trucks"],
  });

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  const formatKm = (km: string | number) => {
    return new Intl.NumberFormat("pt-BR").format(Number(km));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-trucks-title">Caminhões</h1>
          <p className="text-muted-foreground">Gerencie sua frota de veículos</p>
        </div>
        {isAdmin && (
          <Button onClick={() => { setEditingTruck(undefined); setDialogOpen(true); }} data-testid="button-add-truck">
            <Plus className="mr-2 h-4 w-4" />
            Novo Caminhão
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          {trucks && trucks.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Placa</TableHead>
                  <TableHead>Modelo</TableHead>
                  <TableHead>Ano</TableHead>
                  <TableHead>KM Total</TableHead>
                  <TableHead>Status</TableHead>
                  {isAdmin && <TableHead className="text-right">Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {trucks.map((truck) => (
                  <TableRow key={truck.id} data-testid={`row-truck-${truck.id}`}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <TruckIcon className="h-4 w-4 text-muted-foreground" />
                        {truck.number}
                      </div>
                    </TableCell>
                    <TableCell>{truck.plate}</TableCell>
                    <TableCell>{truck.model}</TableCell>
                    <TableCell>{truck.year}</TableCell>
                    <TableCell>{formatKm(truck.totalKm)} km</TableCell>
                    <TableCell>
                      <Badge
                        variant={truck.status === "active" ? "default" : "secondary"}
                        className={truck.status === "active" ? "bg-green-500/10 text-green-600 border-green-500/20" : "bg-orange-500/10 text-orange-600 border-orange-500/20"}
                      >
                        {truck.status === "active" ? "Ativo" : "Manutenção"}
                      </Badge>
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => { setEditingTruck(truck); setDialogOpen(true); }}
                            data-testid={`button-edit-truck-${truck.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeletingTruck(truck)}
                            data-testid={`button-delete-truck-${truck.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <TruckIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-lg font-medium">Nenhum caminhão cadastrado</h3>
              <p className="text-muted-foreground mt-1">
                Adicione seu primeiro caminhão para começar
              </p>
              {isAdmin && (
                <Button className="mt-4" onClick={() => setDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Cadastrar Caminhão
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

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
