# TruckFlow — App nativo do motorista

Aplicativo React Native (Expo) que registra a viagem do caminhão usando o GPS do celular do motorista, **inclusive com a tela bloqueada e o app em segundo plano**. Ele conversa com a API do TruckFlow (Express + PostgreSQL) e reaproveita o esquema de `tracking_sessions` / `location_points` já existente no projeto principal.

## Funcionalidades

- Login do motorista com usuário e senha (definidos pelo gestor em `Painel → Motoristas → 🔑`)
- Tela inicial com botão **Iniciar viagem** (escolhe o caminhão vinculado automaticamente)
- Coleta GPS em segundo plano (`expo-location` + `expo-task-manager`) com notificação persistente no Android
- Buffer local em SQLite: pontos coletados sem internet ficam salvos no celular e são enviados em lote quando a conexão volta
- Tela de viagem ativa com cronômetro, status de GPS, status de conexão e fila pendente
- Encerramento da viagem com tela de **Resumo** (km percorridos, duração, velocidade média, total de pontos)
- Histórico das viagens do motorista, com pull-to-refresh
- Token JWT armazenado de forma segura via `expo-secure-store`
- Retomada automática se a viagem ficar aberta (queda de bateria, app encerrado pelo SO etc.)

## Arquitetura

```
mobile/
├── App.tsx                    # Navegação + providers
├── app.json                   # Configuração Expo (permissões iOS/Android)
├── eas.json                   # Perfis de build EAS
├── package.json
├── tsconfig.json
└── src/
    ├── api.ts                 # Wrapper fetch + URL configurável (EXPO_PUBLIC_API_URL)
    ├── auth.ts                # Contexto de autenticação + storage seguro
    ├── buffer.ts              # SQLite: sessão ativa + fila de pontos pendentes
    ├── sync.ts                # Envia lotes de pontos pro backend
    ├── tracking-task.ts       # Task de GPS em background (foreground service Android)
    └── screens/
        ├── LoginScreen.tsx
        ├── HomeScreen.tsx
        ├── TripScreen.tsx
        ├── SummaryScreen.tsx
        └── HistoryScreen.tsx
```

## Endpoints consumidos

Todos protegidos por JWT com claim `role: "driver"`:

| Método | Rota | Uso |
| ------ | ---- | --- |
| POST   | `/api/driver/login` | Autenticação |
| GET    | `/api/driver/me` | Sessão ativa + caminhão vinculado |
| POST   | `/api/driver/trips/start` | Cria sessão (ou retoma a aberta) |
| POST   | `/api/driver/trips/:id/locations` | Envia lote de pontos (até 200/req) |
| POST   | `/api/driver/trips/:id/end` | Encerra a viagem e devolve resumo |
| GET    | `/api/driver/trips` | Histórico do motorista |

## Como rodar localmente

> **Pré-requisitos**: Node 18+, conta no [expo.dev](https://expo.dev), app **Expo Go** instalado no celular *(ou um build de desenvolvimento — recomendado para validar o GPS em background, pois o Expo Go tem limitações)*.

1. Entre na pasta `mobile/` e instale as dependências:
   ```bash
   cd mobile
   npm install
   ```

2. Aponte para o backend:
   ```bash
   export EXPO_PUBLIC_API_URL="https://SEU-DOMINIO.replit.app"
   ```
   No Windows (PowerShell): `$env:EXPO_PUBLIC_API_URL = "https://..."`.
   Em desenvolvimento contra o servidor local, use o IP da máquina na rede Wi-Fi (ex.: `http://192.168.0.10:5000`) — `localhost` não funciona no celular.

3. Rode:
   ```bash
   npm start
   ```
   Escaneie o QR Code com o Expo Go (Android) ou a câmera (iOS).

4. Crie credenciais para um motorista no painel web em **Motoristas → 🔑**, faça login no app e teste **Iniciar viagem**.

## Build de produção (EAS)

1. Instale o EAS CLI: `npm install -g eas-cli && eas login`.
2. Crie o projeto no Expo: `eas init` dentro de `mobile/` e atualize `extra.eas.projectId` em `app.json`.
3. Edite `eas.json` e troque `EXPO_PUBLIC_API_URL` pelo domínio público da sua API.
4. Build Android (APK para distribuição interna):
   ```bash
   eas build --profile preview --platform android
   ```
5. Build iOS (TestFlight):
   ```bash
   eas build --profile production --platform ios
   eas submit --platform ios
   ```

> **Por que não usar Expo Go em produção?** Para `expo-location` em background com foreground service no Android (essencial para GPS com tela bloqueada), o app precisa ser compilado como um **development/standalone build** via EAS. O Expo Go funciona apenas para a primeira rodada de testes em foreground.

## Permissões necessárias

### Android (`app.json` já configurado)
- `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`
- `ACCESS_BACKGROUND_LOCATION` — obrigatório para tela bloqueada
- `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_LOCATION` — mantém o app vivo
- `WAKE_LOCK`

### iOS (`app.json` já configurado)
- `NSLocationWhenInUseUsageDescription`
- `NSLocationAlwaysAndWhenInUseUsageDescription`
- `UIBackgroundModes`: `location`, `fetch`

O motorista precisa escolher **"Permitir o tempo todo"** quando solicitado — o app explica isso em um alerta antes da primeira viagem.

## Estratégia anti-perda de dados

1. Cada ponto recebido pela task de background é gravado no **SQLite local** antes de qualquer tentativa de envio.
2. A cada 5 s a UI tenta enviar lotes de até 50 pontos para `/api/driver/trips/:id/locations`.
3. Se o servidor responder `409 session_ended`, o buffer é limpo (sessão foi encerrada por outro caminho).
4. Sem rede, os pontos continuam acumulando localmente e são enviados quando a conexão volta — o usuário vê na tela quantos pontos estão pendentes.
5. Antes de finalizar a viagem, o app tenta drenar até **6 lotes** consecutivos para minimizar pontos perdidos.
6. Se o app for morto pelo SO durante a viagem, ao reabrir a `HomeScreen` detecta a sessão ativa via `/api/driver/me` ou no buffer local e oferece **Retomar viagem**.

## Limitações conhecidas

- O Expo Go não permite ativar `foregroundService` no Android — para validar isso é necessário gerar um **development build** (`eas build --profile development`).
- O resumo é calculado pelo backend via Haversine ignorando pontos com precisão > 100 m e velocidade implícita > 200 km/h. Em estradas com perda de sinal pode haver pequena divergência em relação ao odômetro.
- Não há offline-first para `Histórico` — a tela exige conexão para listar as viagens.
