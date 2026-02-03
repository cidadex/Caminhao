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
  Route, 
  Check, 
  ChevronRight,
  Sparkles,
  AlertTriangle,
  Clock,
  Target,
  Zap,
  ArrowRight,
  User
} from "lucide-react";

import logoLight from "@/assets/logo-light.png";
import logoDark from "@/assets/logo-dark.png";
import screenshotDashboard from "@assets/Screenshot_11-12-2025_213658_29cfa244-559c-410b-876c-a69000e2_1765499979208.jpeg";
import screenshotCaminhoes from "@assets/Screenshot_11-12-2025_213713_29cfa244-559c-410b-876c-a69000e2_1765499979207.jpeg";
import screenshotSaudeFrota from "@assets/Screenshot_11-12-2025_213730_29cfa244-559c-410b-876c-a69000e2_1765499979207.jpeg";
import screenshotDiagnosticoIA from "@assets/Screenshot_11-12-2025_21387_29cfa244-559c-410b-876c-a69000e25_1765499979207.jpeg";
import screenshotQuilometragem from "@assets/Screenshot_11-12-2025_213821_29cfa244-559c-410b-876c-a69000e2_1765499979206.jpeg";
import screenshotManutencoes from "@assets/Screenshot_11-12-2025_213836_29cfa244-559c-410b-876c-a69000e2_1765499979206.jpeg";
import screenshotCombustivel from "@assets/Screenshot_11-12-2025_213849_29cfa244-559c-410b-876c-a69000e2_1765499979205.jpeg";
import screenshotGastosExtras from "@assets/Screenshot_11-12-2025_213859_29cfa244-559c-410b-876c-a69000e2_1765499979204.jpeg";
import screenshotFinanceiro from "@assets/Screenshot_11-12-2025_213914_29cfa244-559c-410b-876c-a69000e2_1765499979203.jpeg";

const screenshots = [
  { src: screenshotDashboard, title: "Dashboard Pessoal", description: "Veja o faturamento, custos e lucro do seu caminhão de forma clara" },
  { src: screenshotCaminhoes, title: "Seu Caminhão", description: "Todas as informações do seu veículo em um só lugar" },
  { src: screenshotSaudeFrota, title: "Saúde do Caminhão com IA", description: "Score de saúde 0-100 calculado automaticamente pela IA" },
  { src: screenshotDiagnosticoIA, title: "Diagnóstico Completo com IA", description: "Análise detalhada gerada pela IA com previsão de custos" },
  { src: screenshotQuilometragem, title: "Registro de Viagens", description: "Controle suas viagens com origem, destino, KM e valor recebido" },
  { src: screenshotManutencoes, title: "Controle de Manutenções", description: "Histórico de manutenções com valores e comprovantes anexados" },
  { src: screenshotCombustivel, title: "Gestão de Combustível", description: "Registro de abastecimentos com litros, preço por litro e posto" },
  { src: screenshotGastosExtras, title: "Gastos Extras", description: "Controle todas as despesas extras do dia a dia" },
  { src: screenshotFinanceiro, title: "Resumo Financeiro", description: "Visão completa de entradas, saídas e seu lucro líquido" },
];

const features = [
  { icon: Truck, title: "Seu Caminhão", description: "Cadastre seu caminhão com todos os dados importantes" },
  { icon: Brain, title: "Diagnóstico com IA", description: "Análise inteligente da saúde do seu veículo usando GPT-4o" },
  { icon: Route, title: "Controle de Viagens", description: "Registre suas viagens e calcule automaticamente seu faturamento" },
  { icon: Fuel, title: "Controle de Combustível", description: "Registre abastecimentos e saiba quanto gasta por km" },
  { icon: Wrench, title: "Manutenções", description: "Histórico completo de manutenções com upload de comprovantes" },
  { icon: DollarSign, title: "Financeiro Pessoal", description: "Contas a pagar, receber e lucro líquido por período" },
  { icon: User, title: "Gestão Simples", description: "Tudo em um só lugar, fácil de usar no celular ou computador" },
  { icon: BarChart3, title: "Relatórios", description: "Relatórios do seu desempenho com exportação em PDF" },
];

const aiCapabilities = [
  { icon: Target, title: "Score de Saúde", description: "Nota de 0 a 100 calculada automaticamente para seu caminhão" },
  { icon: AlertTriangle, title: "Identificação de Riscos", description: "Detecta problemas antes que se tornem críticos" },
  { icon: Clock, title: "Previsão de Manutenção", description: "Sugere quando fazer a próxima revisão preventiva" },
  { icon: TrendingUp, title: "Projeção de Custos", description: "Estima seus gastos mensais com manutenção" },
  { icon: Sparkles, title: "Análise de Rotas", description: "Avalia desgaste baseado nas suas rotas" },
  { icon: Shield, title: "Alertas Preventivos", description: "Notifica sobre riscos identificados" },
];

export default function GestaoTruckPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto flex h-16 items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-2">
            <img src={logoDark} alt="Seu Truck" className="h-8 dark:hidden" />
            <img src={logoLight} alt="Seu Truck" className="h-8 hidden dark:block" />
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/login">
              <Button data-testid="button-login-gt">Acessar Sistema</Button>
            </Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden py-20 sm:py-32">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5" />
        <div className="container relative mx-auto px-4">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="secondary" className="mb-4">
              <User className="mr-1 h-3 w-3" />
              Para Caminhoneiros Autônomos
            </Badge>
            <p className="mb-4 text-lg text-muted-foreground">
              Cansado de perder dinheiro sem saber pra onde vai?
            </p>
            <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Controle Seu Caminhão{" "}
              <span className="text-primary">Como um Empresário</span>
            </h1>
            <p className="mb-8 text-lg text-muted-foreground sm:text-xl">
              Sistema simples para você que trabalha sozinho saber exatamente 
              quanto ganha, quanto gasta e quanto sobra no final do mês.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <a href="#precos">
                <Button size="lg" data-testid="button-ver-precos-gt">
                  Ver Preço
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </a>
              <a href="#telas">
                <Button size="lg" variant="outline" data-testid="button-conhecer-gt">
                  Ver o Sistema
                </Button>
              </a>
            </div>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" />
                <span>Feito para autônomos</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" />
                <span>IA inclusa</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" />
                <span>Fácil de usar</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="funcionalidades" className="py-16 sm:py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="mb-4 text-3xl font-bold sm:text-4xl">
              Tudo que você precisa, sem complicação
            </h2>
            <p className="text-muted-foreground">
              Controle seu caminhão e suas finanças em um sistema simples e direto
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
              Inteligência Artificial Cuida do Seu Caminhão
            </h2>
            <p className="text-muted-foreground">
              Nossa IA analisa os dados do seu caminhão e avisa quando você precisa 
              fazer manutenção antes de dar problema na estrada
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
                    "Padrões de desgaste do seu caminhão",
                    "Se você está gastando muito combustível",
                    "Quando fazer manutenção preventiva",
                    "Problemas antes de quebrar na estrada",
                    "Quanto você vai gastar no próximo mês",
                    "Se alguma rota está desgastando demais",
                    "Recomendações para economizar",
                    "Alertas de peças que precisam de atenção"
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
                    "Quando fazer a próxima revisão",
                    "Quanto você vai gastar com manutenção",
                    "Quantos km até a próxima troca de óleo",
                    "Quais peças precisam de atenção",
                    "Quanto você economiza com preventiva",
                    "Risco de quebrar na estrada",
                    "Vida útil das peças do caminhão",
                    "Seu lucro real por viagem"
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

      <section id="telas" className="py-16 sm:py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <Badge variant="secondary" className="mb-4">
              <Zap className="mr-1 h-3 w-3" />
              Simples de Usar
            </Badge>
            <h2 className="mb-4 text-3xl font-bold sm:text-4xl">
              Veja como é fácil
            </h2>
            <p className="text-muted-foreground">
              Você aprende a usar em minutos. Funciona no celular e no computador.
            </p>
          </div>
          
          <div className="grid gap-8 lg:grid-cols-2">
            {screenshots.map((screenshot, index) => (
              <Card key={index} className="group overflow-visible hover-elevate" data-testid={`card-screenshot-gt-${index}`}>
                <div className="relative aspect-video overflow-hidden rounded-t-lg border-b">
                  <img 
                    src={screenshot.src} 
                    alt={screenshot.title}
                    className="h-full w-full object-cover object-left-top transition-transform duration-300 group-hover:scale-[1.02]"
                    data-testid={`img-screenshot-gt-${index}`}
                  />
                </div>
                <CardContent className="pt-4">
                  <h3 className="mb-1 text-lg font-semibold" data-testid={`text-screenshot-title-gt-${index}`}>{screenshot.title}</h3>
                  <p className="text-muted-foreground">{screenshot.description}</p>
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
              Investimento que se Paga
            </h2>
            <p className="text-muted-foreground">
              Preço justo para você que trabalha sozinho. Economize mais do que paga 
              evitando manutenções de emergência.
            </p>
          </div>

          <div className="mx-auto max-w-md">
            <Card className="relative overflow-visible border-primary">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="shadow-lg">Para 1 Caminhão</Badge>
              </div>
              <CardHeader className="pb-4 text-center">
                <CardTitle className="text-2xl">Plano Autônomo</CardTitle>
                <CardDescription>
                  Sistema completo para você controlar seu caminhão
                </CardDescription>
              </CardHeader>
              <CardContent className="pb-4">
                <div className="mb-6 text-center">
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-bold">R$ 180</span>
                    <span className="text-muted-foreground">/mês</span>
                  </div>
                  <div className="mt-2 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <span>+</span>
                    <span className="font-semibold text-foreground">R$ 880</span>
                    <span>de implantação (único)</span>
                  </div>
                </div>
                <ul className="space-y-3">
                  {[
                    "Sistema completo para 1 caminhão",
                    "Diagnóstico com IA incluído",
                    "Controle de combustível e manutenções",
                    "Registro de viagens e faturamento",
                    "Relatórios financeiros pessoais",
                    "Contas a pagar e receber",
                    "Funciona no celular",
                    "Suporte por WhatsApp",
                    "Implantação e treinamento inclusos",
                    "Backup automático na nuvem"
                  ].map((item, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 shrink-0 text-primary" />
                      {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button className="w-full" size="lg" data-testid="button-contratar-gt">
                  Quero Controlar Meu Caminhão
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          </div>

          <div className="mx-auto mt-8 max-w-2xl text-center">
            <p className="text-sm text-muted-foreground">
              Você vai saber exatamente quanto ganha, quanto gasta e quanto sobra. 
              A IA ainda vai te avisar antes de dar problema no caminhão.
            </p>
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="mb-4 text-3xl font-bold sm:text-4xl">
              Pare de perder dinheiro
            </h2>
            <p className="mb-8 text-lg text-muted-foreground">
              Chega de anotação em caderno e conta de cabeça. Com o Seu Truck você 
              sabe exatamente quanto está ganhando e quanto está gastando.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <a href="#precos">
                <Button size="lg" data-testid="button-comecar-gt">
                  Começar Agora
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </a>
              <Link href="/login">
                <Button size="lg" variant="outline" data-testid="button-demo-gt">
                  Testar Demonstração
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
              <img src={logoDark} alt="Seu Truck" className="h-6 inline dark:hidden" />
              <img src={logoLight} alt="Seu Truck" className="h-6 hidden dark:inline" />
            </div>
            <p className="text-sm text-muted-foreground">
              Sistema de Gestão para Caminhoneiros Autônomos
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
