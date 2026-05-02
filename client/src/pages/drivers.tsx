import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Driver } from "@shared/schema";
import {
  User,
  Plus,
  Phone,
  MapPin,
  AlertTriangle,
  Heart,
  Pencil,
  Trash2,
  Loader2,
  Search,
  KeyRound,
} from "lucide-react";

const driverFormSchema = z.object({
  name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  birthDate: z.string().optional(),
  cpf: z.string().optional(),
  cnh: z.string().optional(),
  cnhExpiry: z.string().optional(),
  phone: z.string().optional(),
  cep: z.string().optional(),
  street: z.string().optional(),
  number: z.string().optional(),
  complement: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  emergencyContactRelation: z.string().optional(),
  healthInsurance: z.string().optional(),
  status: z.string().default("active"),
});

type DriverFormData = z.infer<typeof driverFormSchema>;

function calculateAge(birthDate: Date): number {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

function DriverFormDialog({
  driver,
  open,
  onOpenChange,
}: {
  driver?: Driver;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const [isLoadingCep, setIsLoadingCep] = useState(false);

  const form = useForm<DriverFormData>({
    resolver: zodResolver(driverFormSchema),
    defaultValues: {
      name: driver?.name || "",
      birthDate: driver?.birthDate
        ? format(new Date(driver.birthDate), "yyyy-MM-dd")
        : "",
      cpf: driver?.cpf || "",
      cnh: driver?.cnh || "",
      cnhExpiry: driver?.cnhExpiry
        ? format(new Date(driver.cnhExpiry), "yyyy-MM-dd")
        : "",
      phone: driver?.phone || "",
      cep: driver?.cep || "",
      street: driver?.street || "",
      number: driver?.number || "",
      complement: driver?.complement || "",
      neighborhood: driver?.neighborhood || "",
      city: driver?.city || "",
      state: driver?.state || "",
      emergencyContactName: driver?.emergencyContactName || "",
      emergencyContactPhone: driver?.emergencyContactPhone || "",
      emergencyContactRelation: driver?.emergencyContactRelation || "",
      healthInsurance: driver?.healthInsurance || "",
      status: driver?.status || "active",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: DriverFormData) => {
      const payload = {
        ...data,
        birthDate: data.birthDate ? new Date(data.birthDate).toISOString() : null,
        cnhExpiry: data.cnhExpiry ? new Date(data.cnhExpiry).toISOString() : null,
      };
      return apiRequest("POST", "/api/drivers", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/drivers"] });
      toast({ title: "Motorista cadastrado com sucesso" });
      onOpenChange(false);
      form.reset();
    },
    onError: () => {
      toast({ title: "Erro ao cadastrar motorista", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: DriverFormData) => {
      const payload = {
        ...data,
        birthDate: data.birthDate ? new Date(data.birthDate).toISOString() : null,
        cnhExpiry: data.cnhExpiry ? new Date(data.cnhExpiry).toISOString() : null,
      };
      return apiRequest("PATCH", `/api/drivers/${driver?.id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/drivers"] });
      toast({ title: "Motorista atualizado com sucesso" });
      onOpenChange(false);
    },
    onError: () => {
      toast({ title: "Erro ao atualizar motorista", variant: "destructive" });
    },
  });

  const handleCepSearch = async () => {
    const cep = form.getValues("cep")?.replace(/\D/g, "");
    if (!cep || cep.length !== 8) {
      toast({ title: "CEP inválido", variant: "destructive" });
      return;
    }

    setIsLoadingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();

      if (data.erro) {
        toast({ title: "CEP não encontrado", variant: "destructive" });
        return;
      }

      form.setValue("street", data.logradouro || "");
      form.setValue("neighborhood", data.bairro || "");
      form.setValue("city", data.localidade || "");
      form.setValue("state", data.uf || "");
      toast({ title: "Endereço preenchido automaticamente" });
    } catch {
      toast({ title: "Erro ao buscar CEP", variant: "destructive" });
    } finally {
      setIsLoadingCep(false);
    }
  };

  const onSubmit = (data: DriverFormData) => {
    if (driver) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {driver ? "Editar Motorista" : "Novo Motorista"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <User className="h-4 w-4" />
                Dados Pessoais
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Completo *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Nome do motorista"
                          {...field}
                          data-testid="input-driver-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="birthDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data de Nascimento</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          data-testid="input-driver-birthdate"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="cpf"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CPF</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="000.000.000-00"
                          {...field}
                          data-testid="input-driver-cpf"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefone</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="(00) 00000-0000"
                          {...field}
                          data-testid="input-driver-phone"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="cnh"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CNH</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Número da CNH"
                          {...field}
                          data-testid="input-driver-cnh"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="cnhExpiry"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Validade CNH</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          data-testid="input-driver-cnh-expiry"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Endereço
              </h3>
              <div className="grid gap-4 md:grid-cols-3">
                <FormField
                  control={form.control}
                  name="cep"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CEP</FormLabel>
                      <div className="flex gap-2">
                        <FormControl>
                          <Input
                            placeholder="00000-000"
                            {...field}
                            data-testid="input-driver-cep"
                          />
                        </FormControl>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={handleCepSearch}
                          disabled={isLoadingCep}
                          data-testid="button-search-cep"
                        >
                          {isLoadingCep ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Search className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="street"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Rua</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Nome da rua"
                          {...field}
                          data-testid="input-driver-street"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="123"
                          {...field}
                          data-testid="input-driver-number"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="complement"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Complemento</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Apto, Bloco..."
                          {...field}
                          data-testid="input-driver-complement"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="neighborhood"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bairro</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Bairro"
                          {...field}
                          data-testid="input-driver-neighborhood"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cidade</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Cidade"
                          {...field}
                          data-testid="input-driver-city"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estado</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="UF"
                          maxLength={2}
                          {...field}
                          data-testid="input-driver-state"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Contato de Emergência
              </h3>
              <div className="grid gap-4 md:grid-cols-3">
                <FormField
                  control={form.control}
                  name="emergencyContactName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Nome do contato"
                          {...field}
                          data-testid="input-emergency-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="emergencyContactPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefone</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="(00) 00000-0000"
                          {...field}
                          data-testid="input-emergency-phone"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="emergencyContactRelation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Grau de Parentesco</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-emergency-relation">
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="conjuge">Cônjuge</SelectItem>
                          <SelectItem value="pai">Pai</SelectItem>
                          <SelectItem value="mae">Mãe</SelectItem>
                          <SelectItem value="filho">Filho(a)</SelectItem>
                          <SelectItem value="irmao">Irmão(ã)</SelectItem>
                          <SelectItem value="outro">Outro</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Heart className="h-4 w-4" />
                Plano de Saúde
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="healthInsurance"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Plano de Saúde</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Nome do plano"
                          {...field}
                          data-testid="input-health-insurance"
                        />
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
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-driver-status">
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="active">Ativo</SelectItem>
                          <SelectItem value="inactive">Inativo</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending} data-testid="button-save-driver">
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                {driver ? "Atualizar" : "Cadastrar"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function CredentialsDialog({
  driver,
  open,
  onOpenChange,
}: {
  driver: Driver | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const hasUsername = !!driver?.username;

  const setMutation = useMutation({
    mutationFn: async () => {
      if (!driver) throw new Error("Motorista não selecionado");
      return apiRequest("POST", `/api/drivers/${driver.id}/credentials`, { username, password });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/drivers"] });
      toast({ title: "Credenciais salvas", description: "O motorista já pode entrar no app." });
      onOpenChange(false);
      setUsername("");
      setPassword("");
    },
    onError: (err: any) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const resetMutation = useMutation({
    mutationFn: async () => {
      if (!driver) throw new Error("Motorista não selecionado");
      return apiRequest("POST", `/api/drivers/${driver.id}/reset-password`, { password });
    },
    onSuccess: () => {
      toast({ title: "Senha redefinida" });
      onOpenChange(false);
      setPassword("");
    },
    onError: (err: any) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) {
          setUsername("");
          setPassword("");
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" /> Credenciais do app
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {hasUsername
              ? `Usuário atual: ${driver?.username}. Você pode redefinir a senha ou trocar o usuário.`
              : "Defina um usuário e senha para o motorista entrar no aplicativo móvel."}
          </p>
          <div>
            <label className="text-sm font-medium">Usuário</label>
            <Input
              placeholder={driver?.username || "ex: joao.silva"}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              data-testid="input-driver-username"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Senha</label>
            <Input
              type="password"
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              data-testid="input-driver-password"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          {hasUsername && (
            <Button
              variant="secondary"
              disabled={!password || password.length < 6 || resetMutation.isPending}
              onClick={() => resetMutation.mutate()}
              data-testid="button-reset-password"
            >
              {resetMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Redefinir senha
            </Button>
          )}
          <Button
            disabled={!username || username.length < 3 || !password || password.length < 6 || setMutation.isPending}
            onClick={() => setMutation.mutate()}
            data-testid="button-save-credentials"
          >
            {setMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {hasUsername ? "Trocar usuário" : "Salvar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DriverCard({
  driver,
  onEdit,
  onDelete,
  onCredentials,
}: {
  driver: Driver;
  onEdit: (driver: Driver) => void;
  onDelete: (driver: Driver) => void;
  onCredentials: (driver: Driver) => void;
}) {
  const age = driver.birthDate ? calculateAge(new Date(driver.birthDate)) : null;

  return (
    <Card className="hover-elevate" data-testid={`card-driver-${driver.id}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
              <User className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold">{driver.name}</h3>
                <Badge variant={driver.status === "active" ? "default" : "secondary"}>
                  {driver.status === "active" ? "Ativo" : "Inativo"}
                </Badge>
              </div>
              {age !== null && (
                <p className="text-sm text-muted-foreground">{age} anos</p>
              )}
            </div>
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onCredentials(driver)}
              data-testid={`button-credentials-driver-${driver.id}`}
              title={driver.username ? `Usuário: ${driver.username}` : "Definir credenciais do app"}
            >
              <KeyRound className={`h-4 w-4 ${driver.username ? "text-primary" : ""}`} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(driver)}
              data-testid={`button-edit-driver-${driver.id}`}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(driver)}
              data-testid={`button-delete-driver-${driver.id}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="mt-4 grid gap-2 text-sm">
          {driver.username && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <KeyRound className="h-3 w-3" />
              App: {driver.username}
            </div>
          )}
          {driver.phone && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-3 w-3" />
              {driver.phone}
            </div>
          )}
          {driver.city && driver.state && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-3 w-3" />
              {driver.city} - {driver.state}
            </div>
          )}
          {driver.emergencyContactName && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <AlertTriangle className="h-3 w-3" />
              Emergência: {driver.emergencyContactName}
              {driver.emergencyContactRelation && ` (${driver.emergencyContactRelation})`}
            </div>
          )}
          {driver.healthInsurance && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Heart className="h-3 w-3" />
              {driver.healthInsurance}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function DriversPage() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | undefined>();
  const [deletingDriver, setDeletingDriver] = useState<Driver | null>(null);
  const [credentialsDriver, setCredentialsDriver] = useState<Driver | null>(null);

  const { data: drivers, isLoading } = useQuery<Driver[]>({
    queryKey: ["/api/drivers"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/drivers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/drivers"] });
      toast({ title: "Motorista excluído com sucesso" });
      setDeletingDriver(null);
    },
    onError: () => {
      toast({ title: "Erro ao excluir motorista", variant: "destructive" });
    },
  });

  const handleEdit = (driver: Driver) => {
    setEditingDriver(driver);
    setDialogOpen(true);
  };

  const handleDelete = (driver: Driver) => {
    setDeletingDriver(driver);
  };

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditingDriver(undefined);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2" data-testid="text-drivers-title">
            <User className="h-8 w-8" />
            Motoristas
          </h1>
          <p className="text-muted-foreground">
            Gerencie os motoristas da sua frota
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} data-testid="button-add-driver">
          <Plus className="h-4 w-4 mr-2" />
          Novo Motorista
        </Button>
      </div>

      {drivers && drivers.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {drivers.map((driver) => (
            <DriverCard
              key={driver.id}
              driver={driver}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onCredentials={setCredentialsDriver}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum motorista cadastrado</h3>
            <p className="text-muted-foreground mb-4">
              Cadastre motoristas para associá-los aos caminhões.
            </p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Cadastrar Motorista
            </Button>
          </CardContent>
        </Card>
      )}

      <DriverFormDialog
        driver={editingDriver}
        open={dialogOpen}
        onOpenChange={handleDialogClose}
      />

      <CredentialsDialog
        driver={credentialsDriver}
        open={!!credentialsDriver}
        onOpenChange={(o) => {
          if (!o) setCredentialsDriver(null);
        }}
      />

      <AlertDialog open={!!deletingDriver} onOpenChange={() => setDeletingDriver(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir motorista?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir {deletingDriver?.name}? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingDriver && deleteMutation.mutate(deletingDriver.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
