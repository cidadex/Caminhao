import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { 
  Truck, 
  Brain, 
  TrendingUp, 
  Shield, 
  DollarSign, 
  BarChart3, 
  Fuel, 
  Wrench, 
  Users, 
  Route, 
  Check, 
  ChevronRight,
  Sparkles,
  AlertTriangle,
  Clock,
  Target,
  Zap,
  ArrowRight
} from "lucide-react";

import screenshot1 from "@assets/Screenshot_11-12-2025_201046_29cfa244-559c-410b-876c-a69000e2_1765499979208.jpeg";
import screenshot2 from "@assets/Screenshot_11-12-2025_213658_29cfa244-559c-410b-876c-a69000e2_1765499979208.jpeg";
import screenshot3 from "@assets/Screenshot_11-12-2025_213713_29cfa244-559c-410b-876c-a69000e2_1765499979207.jpeg";
import screenshot4 from "@assets/Screenshot_11-12-2025_213730_29cfa244-559c-410b-876c-a69000e2_1765499979207.jpeg";
import screenshot5 from "@assets/Screenshot_11-12-2025_21387_29cfa244-559c-410b-876c-a69000e25_1765499979207.jpeg";
import screenshot6 from "@assets/Screenshot_11-12-2025_213821_29cfa244-559c-410b-876c-a69000e2_1765499979206.jpeg";
import screenshot7 from "@assets/Screenshot_11-12-2025_213836_29cfa244-559c-410b-876c-a69000e2_1765499979206.jpeg";
import screenshot8 from "@assets/Screenshot_11-12-2025_213849_29cfa244-559c-410b-876c-a69000e2_1765499979205.jpeg";
import screenshot9 from "@assets/Screenshot_11-12-2025_213859_29cfa244-559c-410b-876c-a69000e2_1765499979204.jpeg";
import screenshot10 from "@assets/Screenshot_11-12-2025_213914_29cfa244-559c-410b-876c-a69000e2_1765499979203.jpeg";

const screenshots = [
  { src: screenshot1, title: "Dashboard - Ranking de Lucratividade", description: "Visualize o desempenho de cada caminhão em tempo real" },
  { src: screenshot2, title: "Gestão de Caminhões", description: "Cadastre e gerencie toda sua frota em um só lugar" },
  { src: screenshot3, title: "Saúde da Frota com IA", description: "Análise inteligente com score de saúde por veículo" },
  { src: screenshot4, title: "Diagnóstico Detalhado IA", description: "Relatório completo gerado por inteligência artificial" },
  { src: screenshot5, title: "Previsão de Custos IA", description: "A IA prevê manutenções e custos futuros" },
  { src: screenshot6, title: "Registro de Quilometragem", description: "Controle rotas, KM e faturamento por viagem" },
  { src: screenshot7, title: "Controle de Manutenções", description: "Registre todas as manutenções com comprovantes" },
  { src: screenshot8, title: "Gestão de Combustível", description: "Acompanhe consumo, custo por litro e postos" },
  { src: screenshot9, title: "Gastos Extras", description: "Controle despesas adicionais por categoria" },
  { src: screenshot10, title: "Resumo Financeiro", description: "Visão consolidada de receitas, despesas e lucro" },
];

const features = [
  { icon: Truck, title: "Gestão de Frota", description: "Cadastre caminhões com todos os dados, status e motorista responsável" },
  { icon: Brain, title: "Diagnóstico com IA", description: "Análise inteligente da saúde de cada veículo usando GPT-4o" },
  { icon: Route, title: "Rotas Inteligentes", description: "Cadastre rotas fixas ou registre viagens avulsas com cálculo automático" },
  { icon: Fuel, title: "Controle de Combustível", description: "Registre abastecimentos com custo por litro, posto e forma de pagamento" },
  { icon: Wrench, title: "Manutenções", description: "Histórico completo de manutenções com upload de comprovantes" },
  { icon: DollarSign, title: "Financeiro Completo", description: "Contas a pagar, receber e resumo financeiro com lucro por período" },
  { icon: Users, title: "Gestão de Motoristas", description: "Cadastro completo com CNH, contato de emergência e plano de saúde" },
  { icon: BarChart3, title: "Relatórios Avançados", description: "Relatórios filtráveis com exportação em PDF e Excel" },
];

const aiCapabilities = [
  { icon: Target, title: "Score de Saúde", description: "Nota de 0 a 100 calculada automaticamente para cada caminhão" },
  { icon: AlertTriangle, title: "Identificação de Riscos", description: "Detecta problemas antes que se tornem críticos" },
  { icon: Clock, title: "Previsão de Manutenção", description: "Sugere quando fazer a próxima revisão preventiva" },
  { icon: TrendingUp, title: "Projeção de Custos", description: "Estima gastos mensais com manutenção por veículo" },
  { icon: Sparkles, title: "Análise de Rotas", description: "Avalia desgaste baseado nas rotas realizadas" },
  { icon: Shield, title: "Alertas Preventivos", description: "Notifica sobre riscos identificados na operação" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto flex h-16 items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary">
              <Truck className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">TruckFlow</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/login">
              <Button data-testid="button-login">Acessar Sistema</Button>
            </Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden py-20 sm:py-32">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5" />
        <div className="container relative mx-auto px-4">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="secondary" className="mb-4">
              <Brain className="mr-1 h-3 w-3" />
              Powered by GPT-4o
            </Badge>
            <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Gestão de Frota com{" "}
              <span className="text-primary">Inteligência Artificial</span>
            </h1>
            <p className="mb-8 text-lg text-muted-foreground sm:text-xl">
              O sistema mais completo para transportadoras. Controle sua frota, preveja manutenções 
              e maximize seus lucros com diagnósticos inteligentes gerados por IA.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <a href="#precos">
                <Button size="lg" data-testid="button-ver-precos">
                  Ver Planos
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </a>
              <a href="#funcionalidades">
                <Button size="lg" variant="outline" data-testid="button-conhecer">
                  Conhecer Sistema
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      <section id="funcionalidades" className="py-16 sm:py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="mb-4 text-3xl font-bold sm:text-4xl">
              Tudo que você precisa para gerenciar sua frota
            </h2>
            <p className="text-muted-foreground">
              Sistema completo com todas as funcionalidades que uma transportadora precisa
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature, index) => (
              <Card key={index} className="hover-elevate">
                <CardContent className="pt-6">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="mb-2 font-semibold">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-muted/50 py-16 sm:py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <Badge variant="default" className="mb-4">
              <Sparkles className="mr-1 h-3 w-3" />
              Exclusivo
            </Badge>
            <h2 className="mb-4 text-3xl font-bold sm:text-4xl">
              Diagnóstico Inteligente com IA
            </h2>
            <p className="text-muted-foreground">
              Nossa IA analisa todos os dados da sua frota e gera diagnósticos precisos, 
              identificando problemas e prevendo custos antes que aconteçam
            </p>
          </div>
          
          <div className="mb-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {aiCapabilities.map((item, index) => (
              <Card key={index}>
                <CardContent className="flex items-start gap-4 pt-6">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary">
                    <item.icon className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <div>
                    <h3 className="mb-1 font-semibold">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="mx-auto max-w-4xl overflow-hidden">
            <div className="grid md:grid-cols-2">
              <div className="p-6 sm:p-8">
                <h3 className="mb-4 text-2xl font-bold">O que a IA identifica:</h3>
                <ul className="space-y-3">
                  {[
                    "Padrões de desgaste baseados no histórico",
                    "Consumo anormal de combustível",
                    "Necessidade de manutenção preventiva",
                    "Riscos operacionais por caminhão",
                    "Estimativa de custos futuros",
                    "Análise de performance dos motoristas",
                    "Impacto das rotas no desgaste",
                    "Recomendações personalizadas"
                  ].map((item, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <Check className="h-4 w-4 shrink-0 text-primary" />
                      <span className="text-sm">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-muted/50 p-6 sm:p-8">
                <h3 className="mb-4 text-2xl font-bold">O que a IA prevê:</h3>
                <ul className="space-y-3">
                  {[
                    "Próxima data de manutenção recomendada",
                    "Custo mensal estimado por veículo",
                    "Quilometragem até a próxima revisão",
                    "Componentes que precisam de atenção",
                    "Economia com manutenção preventiva",
                    "Risco de falhas críticas",
                    "Vida útil estimada de peças",
                    "ROI de cada caminhão"
                  ].map((item, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <Zap className="h-4 w-4 shrink-0 text-primary" />
                      <span className="text-sm">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>
        </div>
      </section>

      <section className="py-16 sm:py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="mb-4 text-3xl font-bold sm:text-4xl">
              Conheça as Telas do Sistema
            </h2>
            <p className="text-muted-foreground">
              Interface moderna, intuitiva e completa para gerenciar toda sua operação
            </p>
          </div>
          
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {screenshots.map((screenshot, index) => (
              <Card key={index} className="group overflow-visible hover-elevate" data-testid={`card-screenshot-${index}`}>
                <div className="relative aspect-video overflow-hidden rounded-t-lg">
                  <img 
                    src={screenshot.src} 
                    alt={screenshot.title}
                    className="h-full w-full object-cover object-left-top transition-transform duration-300 group-hover:scale-105"
                    data-testid={`img-screenshot-${index}`}
                  />
                </div>
                <CardContent className="pt-4">
                  <h3 className="mb-1 font-semibold" data-testid={`text-screenshot-title-${index}`}>{screenshot.title}</h3>
                  <p className="text-sm text-muted-foreground">{screenshot.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="precos" className="bg-muted/50 py-16 sm:py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="mb-4 text-3xl font-bold sm:text-4xl">
              Escolha o Modelo Ideal
            </h2>
            <p className="text-muted-foreground">
              Duas opções flexíveis para atender sua necessidade. Ambas com acesso completo 
              e sem limite de caminhões cadastrados.
            </p>
          </div>

          <div className="mx-auto grid max-w-4xl gap-8 md:grid-cols-2">
            <Card className="relative overflow-visible">
              <CardHeader className="pb-4">
                <Badge variant="outline" className="mb-2 w-fit">Mais Vendido</Badge>
                <CardTitle className="text-2xl">Aquisição</CardTitle>
                <CardDescription>
                  Licença permanente do sistema com suporte mensal
                </CardDescription>
              </CardHeader>
              <CardContent className="pb-4">
                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold">R$ 5.800</span>
                    <span className="text-muted-foreground">/único</span>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                    <span>+</span>
                    <span className="font-semibold text-foreground">R$ 180</span>
                    <span>/mês de manutenção</span>
                  </div>
                </div>
                <ul className="space-y-3">
                  {[
                    "Licença permanente do sistema",
                    "Implantação e treinamento inclusos",
                    "Atualizações de segurança",
                    "Suporte técnico mensal",
                    "Diagnóstico com IA incluído",
                    "Sem limite de caminhões",
                    "Sem limite de usuários",
                    "Backup automático"
                  ].map((item, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 shrink-0 text-primary" />
                      {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button className="w-full" size="lg" data-testid="button-aquisicao">
                  Contratar Aquisição
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>

            <Card className="relative overflow-visible border-primary">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="shadow-lg">Recomendado</Badge>
              </div>
              <CardHeader className="pb-4">
                <Badge variant="secondary" className="mb-2 w-fit">Menor Investimento Inicial</Badge>
                <CardTitle className="text-2xl">Locação</CardTitle>
                <CardDescription>
                  Aluguel mensal com baixo custo de implantação
                </CardDescription>
              </CardHeader>
              <CardContent className="pb-4">
                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold">R$ 480</span>
                    <span className="text-muted-foreground">/mês</span>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                    <span>+</span>
                    <span className="font-semibold text-foreground">R$ 2.000</span>
                    <span>de implantação (único)</span>
                  </div>
                </div>
                <ul className="space-y-3">
                  {[
                    "Acesso completo ao sistema",
                    "Implantação e treinamento inclusos",
                    "Todas as atualizações incluídas",
                    "Suporte técnico prioritário",
                    "Diagnóstico com IA incluído",
                    "Sem limite de caminhões",
                    "Sem limite de usuários",
                    "Backup automático"
                  ].map((item, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 shrink-0 text-primary" />
                      {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button className="w-full" size="lg" data-testid="button-locacao">
                  Contratar Locação
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          </div>

          <div className="mx-auto mt-8 max-w-2xl text-center">
            <p className="text-sm text-muted-foreground">
              Ambos os planos incluem implantação completa, treinamento da equipe, 
              suporte técnico e acesso a todas as funcionalidades incluindo o diagnóstico com Inteligência Artificial.
            </p>
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="mb-4 text-3xl font-bold sm:text-4xl">
              Comece a economizar hoje
            </h2>
            <p className="mb-8 text-lg text-muted-foreground">
              Empresas que usam o TruckFlow economizam em média 23% com manutenções 
              ao identificar problemas antes que se tornem críticos.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <a href="#precos">
                <Button size="lg" data-testid="button-comecar">
                  Começar Agora
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </a>
              <Link href="/login">
                <Button size="lg" variant="outline" data-testid="button-demo">
                  Acessar Demonstração
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary">
                <Truck className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-bold">TruckFlow</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Sistema de Gestão de Frotas com Inteligência Artificial
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
