import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { loginSchema, type LoginInput } from "@shared/schema";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Truck, Loader2, Eye, EyeOff, Shield, BarChart3, Route } from "lucide-react";

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginInput) => {
      const response = await apiRequest("POST", "/api/auth/login", data);
      return response;
    },
    onSuccess: (data) => {
      login(data.user, data.token);
      toast({
        title: "Login realizado!",
        description: `Bem-vindo, ${data.user.name}!`,
      });
      setLocation("/");
    },
    onError: (error: Error) => {
      toast({
        title: "Erro no login",
        description: error.message || "Usuário ou senha incorretos",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: LoginInput) => {
    loginMutation.mutate(data);
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-[#0B3A78] via-[#0D6EFD] to-[#3B82F6]">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.05%22%3E%3Cpath%20d%3D%22M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6%2034v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6%204V0H4v4H0v2h4v4h2V6h4V4H6z%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E')] opacity-30" />
        
        <div className="relative z-10 flex flex-col justify-center p-12 text-white">
          <div className="flex items-center gap-3 mb-12">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
              <Truck className="h-7 w-7" />
            </div>
            <span className="text-3xl font-bold tracking-tight">TruckFlow</span>
          </div>
          
          <h1 className="text-4xl font-bold leading-tight mb-6">
            Gestão completa<br />
            da sua frota
          </h1>
          
          <p className="text-xl text-white/80 mb-12 max-w-md">
            Controle quilometragem, manutenções e faturamento de forma simples e eficiente.
          </p>
          
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm">
                <BarChart3 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold">Dashboard em tempo real</h3>
                <p className="text-sm text-white/70">Acompanhe métricas e performance</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm">
                <Route className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold">Controle de rotas</h3>
                <p className="text-sm text-white/70">Registre km e calcule automaticamente</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold">Seguro e confiável</h3>
                <p className="text-sm text-white/70">Seus dados protegidos na nuvem</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-white/5 blur-3xl" />
      </div>
      
      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
              <Truck className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold">TruckFlow</span>
          </div>
          
          <Card className="border-0 shadow-xl bg-card/50 backdrop-blur-sm">
            <CardContent className="p-8">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold">Bem-vindo de volta</h2>
                <p className="text-muted-foreground mt-2">
                  Entre com suas credenciais para acessar
                </p>
              </div>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">Usuário</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Digite seu usuário"
                            className="h-12 px-4 bg-background/50"
                            data-testid="input-username"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">Senha</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showPassword ? "text" : "password"}
                              placeholder="Digite sua senha"
                              className="h-12 px-4 pr-12 bg-background/50"
                              data-testid="input-password"
                              {...field}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute right-1 top-1/2 -translate-y-1/2 h-10 w-10"
                              onClick={() => setShowPassword(!showPassword)}
                              data-testid="button-toggle-password"
                            >
                              {showPassword ? (
                                <EyeOff className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <Eye className="h-4 w-4 text-muted-foreground" />
                              )}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    className="w-full h-12 text-base font-semibold bg-gradient-to-r from-[#0B3A78] to-[#0D6EFD] hover:opacity-90 transition-opacity"
                    disabled={loginMutation.isPending}
                    data-testid="button-login"
                  >
                    {loginMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Entrando...
                      </>
                    ) : (
                      "Entrar no Sistema"
                    )}
                  </Button>
                </form>
              </Form>
              
              <div className="mt-8 p-4 rounded-lg bg-muted/50 border border-border/50">
                <p className="text-xs text-center text-muted-foreground mb-3 font-medium uppercase tracking-wide">
                  Credenciais de demonstração
                </p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="text-center p-3 rounded-md bg-background/50">
                    <p className="font-semibold text-primary">Admin</p>
                    <p className="text-muted-foreground text-xs mt-1">admin / admin123</p>
                  </div>
                  <div className="text-center p-3 rounded-md bg-background/50">
                    <p className="font-semibold text-primary">Operador</p>
                    <p className="text-muted-foreground text-xs mt-1">operador / usuario123</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <p className="text-center text-xs text-muted-foreground mt-6">
            Sistema de Gestão de Frota v1.0
          </p>
        </div>
      </div>
    </div>
  );
}
