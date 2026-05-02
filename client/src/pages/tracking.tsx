import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { TrackingMap, TrackingMarker } from "@/components/tracking-map";
import {
  MapPin,
  Plus,
  Copy,
  Square,
  Trash2,
  Navigation,
  Gauge,
  Clock,
  History,
  Truck as TruckIcon,
  User as UserIcon,
  ArrowLeft,
  RefreshCw,
} from "lucide-react";
import type { Truck, Driver, TrackingSessionWithDetails, LocationPoint } from "@shared/schema";

function formatDateTime(d: string | Date | null | undefined) {
  if (!d) return "-";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString("pt-BR");
}

function relativeTime(d: string | Date | null | undefined) {
  if (!d) return "Sem dados";
  const date = typeof d === "string" ? new Date(d) : d;
  const diff = (Date.now() - date.getTime()) / 1000;
  if (diff < 60) return `há ${Math.floor(diff)}s`;
  if (diff < 3600) return `há ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `há ${Math.floor(diff / 3600)} h`;
  return formatDateTime(d);
}

function speedKmh(speed: string | null | undefined): string {
  if (!speed) return "-";
  const n = Number(speed);
  if (Number.isNaN(n)) return "-";
  return `${(n * 3.6).toFixed(0)} km/h`;
}

export default function TrackingPage() {
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [shareDialogSession, setShareDialogSession] = useState<TrackingSessionWithDetails | null>(null);
  const { toast } = useToast();

  const { data: sessions = [], isLoading: sessionsLoading } = useQuery<TrackingSessionWithDetails[]>({
    queryKey: ["/api/tracking/sessions"],
    refetchInterval: 5000,
  });

  const activeSessions = sessions.filter((s) => s.status === "active");
  const endedSessions = sessions.filter((s) => s.status !== "active");

  const selected = sessions.find((s) => s.id === selectedSessionId) ?? null;

  const { data: history = [], isLoading: historyLoading } = useQuery<LocationPoint[]>({
    queryKey: ["/api/tracking/sessions", selectedSessionId, "locations"],
    enabled: !!selectedSessionId,
    refetchInterval: selected?.status === "active" ? 5000 : false,
  });

  const endMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("POST", `/api/tracking/sessions/${id}/end`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tracking/sessions"] });
      toast({ title: "Sessão encerrada" });
    },
    onError: (err: any) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/tracking/sessions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tracking/sessions"] });
      if (selectedSessionId) setSelectedSessionId(null);
      toast({ title: "Sessão excluída" });
    },
    onError: (err: any) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  // Build live map markers (only sessions with a known location)
  const liveMarkers: TrackingMarker[] = activeSessions
    .filter((s) => s.lastLat && s.lastLng)
    .map((s) => ({
      id: s.id,
      lat: Number(s.lastLat),
      lng: Number(s.lastLng),
      label: s.truck?.number || "Caminhão",
      popup: `<b>Caminhão ${s.truck?.number || "-"}</b><br/>Placa: ${s.truck?.plate || "-"}<br/>Motorista: ${
        s.driver?.name || "-"
      }<br/>Velocidade: ${speedKmh(s.lastSpeed)}<br/>Atualizado ${relativeTime(s.lastUpdateAt)}`,
      color: "#2563eb",
    }));

  // History path (chronological)
  const historyPath = [...history]
    .reverse()
    .map((p) => ({ lat: Number(p.lat), lng: Number(p.lng) }));

  const historyMarkers: TrackingMarker[] = historyPath.length
    ? [
        { id: "start", lat: historyPath[0].lat, lng: historyPath[0].lng, label: "Início", color: "#16a34a" },
        {
          id: "end",
          lat: historyPath[historyPath.length - 1].lat,
          lng: historyPath[historyPath.length - 1].lng,
          label: "Atual",
          color: "#dc2626",
        },
      ]
    : [];

  if (selected) {
    return (
      <SessionDetail
        session={selected}
        history={history}
        historyLoading={historyLoading}
        path={historyPath}
        markers={historyMarkers}
        onBack={() => setSelectedSessionId(null)}
        onEnd={() => endMutation.mutate(selected.id)}
        onDelete={() => deleteMutation.mutate(selected.id)}
        onShare={() => setShareDialogSession(selected)}
        endPending={endMutation.isPending}
        deletePending={deleteMutation.isPending}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Navigation className="h-6 w-6 text-primary" />
            Rastreamento em Tempo Real
          </h1>
          <p className="text-muted-foreground text-sm">
            Acompanhe a localização da frota usando o smartphone do motorista.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/tracking/sessions"] })}
            data-testid="button-refresh-tracking"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <NewSessionDialog
            open={createOpen}
            onOpenChange={setCreateOpen}
            onCreated={(s) => {
              setCreateOpen(false);
              setShareDialogSession(s);
            }}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Mapa ao Vivo</span>
            <Badge variant="outline" data-testid="badge-active-count">
              {activeSessions.length} sessão(ões) ativa(s)
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <TrackingMap markers={liveMarkers} height="500px" />
          {liveMarkers.length === 0 && (
            <p className="text-sm text-muted-foreground mt-3">
              Nenhuma localização recebida ainda. Crie uma sessão e envie o link para o motorista iniciar o
              compartilhamento.
            </p>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active" data-testid="tab-active-sessions">Ativas ({activeSessions.length})</TabsTrigger>
          <TabsTrigger value="ended" data-testid="tab-ended-sessions">Histórico ({endedSessions.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-3 mt-4">
          {sessionsLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : activeSessions.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                Nenhuma sessão ativa.
              </CardContent>
            </Card>
          ) : (
            activeSessions.map((s) => (
              <SessionCard
                key={s.id}
                session={s}
                onSelect={() => setSelectedSessionId(s.id)}
                onShare={() => setShareDialogSession(s)}
                onEnd={() => endMutation.mutate(s.id)}
                onDelete={() => deleteMutation.mutate(s.id)}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="ended" className="space-y-3 mt-4">
          {endedSessions.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                Nenhuma sessão encerrada.
              </CardContent>
            </Card>
          ) : (
            endedSessions.map((s) => (
              <SessionCard
                key={s.id}
                session={s}
                onSelect={() => setSelectedSessionId(s.id)}
                onShare={() => setShareDialogSession(s)}
                onEnd={() => endMutation.mutate(s.id)}
                onDelete={() => deleteMutation.mutate(s.id)}
              />
            ))
          )}
        </TabsContent>
      </Tabs>

      <ShareDialog session={shareDialogSession} onClose={() => setShareDialogSession(null)} />
    </div>
  );
}

function SessionCard({
  session,
  onSelect,
  onShare,
  onEnd,
  onDelete,
}: {
  session: TrackingSessionWithDetails;
  onSelect: () => void;
  onShare: () => void;
  onEnd: () => void;
  onDelete: () => void;
}) {
  const isActive = session.status === "active";
  return (
    <Card data-testid={`card-session-${session.id}`}>
      <CardContent className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2 flex-1 min-w-[260px]">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={isActive ? "default" : "secondary"} data-testid={`badge-status-${session.id}`}>
                {isActive ? "Ativa" : "Encerrada"}
              </Badge>
              <span className="font-semibold flex items-center gap-1">
                <TruckIcon className="h-4 w-4" />
                {session.truck?.number ?? "-"} · {session.truck?.plate ?? "-"}
              </span>
              {session.driver?.name && (
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <UserIcon className="h-3 w-3" />
                  {session.driver.name}
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Iniciada
                </div>
                <div>{formatDateTime(session.startedAt)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Navigation className="h-3 w-3" /> Última posição
                </div>
                <div data-testid={`text-last-update-${session.id}`}>{relativeTime(session.lastUpdateAt)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Gauge className="h-3 w-3" /> Velocidade
                </div>
                <div>{speedKmh(session.lastSpeed)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Coordenadas</div>
                <div className="font-mono text-xs">
                  {session.lastLat && session.lastLng
                    ? `${Number(session.lastLat).toFixed(5)}, ${Number(session.lastLng).toFixed(5)}`
                    : "-"}
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={onSelect} data-testid={`button-detail-${session.id}`}>
              <History className="h-4 w-4 mr-1" /> Detalhes
            </Button>
            <Button size="sm" variant="outline" onClick={onShare} data-testid={`button-share-${session.id}`}>
              <Copy className="h-4 w-4 mr-1" /> Link
            </Button>
            {isActive && (
              <Button size="sm" variant="secondary" onClick={onEnd} data-testid={`button-end-${session.id}`}>
                <Square className="h-4 w-4 mr-1" /> Encerrar
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                if (confirm("Excluir sessão e todos os pontos GPS?")) onDelete();
              }}
              data-testid={`button-delete-${session.id}`}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SessionDetail({
  session,
  history,
  historyLoading,
  path,
  markers,
  onBack,
  onEnd,
  onDelete,
  onShare,
  endPending,
  deletePending,
}: {
  session: TrackingSessionWithDetails;
  history: LocationPoint[];
  historyLoading: boolean;
  path: { lat: number; lng: number }[];
  markers: TrackingMarker[];
  onBack: () => void;
  onEnd: () => void;
  onDelete: () => void;
  onShare: () => void;
  endPending: boolean;
  deletePending: boolean;
}) {
  const isActive = session.status === "active";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Button variant="ghost" onClick={onBack} data-testid="button-back-to-list">
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
        </Button>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={onShare} data-testid="button-share-detail">
            <Copy className="h-4 w-4 mr-1" /> Link do motorista
          </Button>
          {isActive && (
            <Button variant="secondary" onClick={onEnd} disabled={endPending} data-testid="button-end-detail">
              <Square className="h-4 w-4 mr-1" /> Encerrar sessão
            </Button>
          )}
          <Button
            variant="ghost"
            onClick={() => {
              if (confirm("Excluir sessão e todos os pontos GPS?")) onDelete();
            }}
            disabled={deletePending}
            data-testid="button-delete-detail"
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-3">
            <TruckIcon className="h-5 w-5 text-primary" />
            Caminhão {session.truck?.number} · {session.truck?.plate}
            <Badge variant={isActive ? "default" : "secondary"}>{isActive ? "Ativa" : "Encerrada"}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div>
              <div className="text-xs text-muted-foreground">Motorista</div>
              <div>{session.driver?.name || "-"}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Iniciada</div>
              <div>{formatDateTime(session.startedAt)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Última atualização</div>
              <div>{relativeTime(session.lastUpdateAt)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Pontos coletados</div>
              <div data-testid="text-points-count">{history.length}</div>
            </div>
          </div>

          <TrackingMap markers={markers} path={path} height="500px" />

          <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <History className="h-4 w-4" /> Últimas posições
            </h3>
            {historyLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : history.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem pontos registrados ainda.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs text-muted-foreground border-b">
                    <tr>
                      <th className="py-2 text-left">Hora</th>
                      <th className="py-2 text-left">Coordenadas</th>
                      <th className="py-2 text-left">Velocidade</th>
                      <th className="py-2 text-left">Precisão</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.slice(0, 30).map((p) => (
                      <tr key={p.id} className="border-b last:border-0">
                        <td className="py-2">{formatDateTime(p.timestamp)}</td>
                        <td className="py-2 font-mono text-xs">
                          {Number(p.lat).toFixed(5)}, {Number(p.lng).toFixed(5)}
                        </td>
                        <td className="py-2">{speedKmh(p.speed)}</td>
                        <td className="py-2">{p.accuracy ? `${Number(p.accuracy).toFixed(0)} m` : "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function NewSessionDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: (s: TrackingSessionWithDetails) => void;
}) {
  const [truckId, setTruckId] = useState<string>("");
  const [driverId, setDriverId] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const { toast } = useToast();

  const { data: trucks = [] } = useQuery<Truck[]>({ queryKey: ["/api/trucks"] });
  const { data: drivers = [] } = useQuery<Driver[]>({ queryKey: ["/api/drivers"] });

  const createMutation = useMutation({
    mutationFn: async () => {
      return apiRequest<TrackingSessionWithDetails>("POST", "/api/tracking/sessions", {
        truckId,
        driverId: driverId || null,
        notes: notes || null,
      });
    },
    onSuccess: (s) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tracking/sessions"] });
      setTruckId("");
      setDriverId("");
      setNotes("");
      onCreated(s);
      toast({ title: "Sessão criada", description: "Envie o link gerado para o motorista." });
    },
    onError: (err: any) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button data-testid="button-new-session">
          <Plus className="h-4 w-4 mr-1" /> Nova sessão
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova sessão de rastreamento</DialogTitle>
          <DialogDescription>
            Selecione o caminhão e gere um link único para o motorista abrir no celular.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label>Caminhão *</Label>
            <Select value={truckId} onValueChange={setTruckId}>
              <SelectTrigger data-testid="select-truck">
                <SelectValue placeholder="Selecione um caminhão" />
              </SelectTrigger>
              <SelectContent>
                {trucks.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.number} · {t.plate} · {t.model}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Motorista (opcional)</Label>
            <Select value={driverId} onValueChange={setDriverId}>
              <SelectTrigger data-testid="select-driver">
                <SelectValue placeholder="Selecione um motorista" />
              </SelectTrigger>
              <SelectContent>
                {drivers.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Observações (opcional)</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Viagem São Paulo → Curitiba"
              data-testid="input-notes"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={!truckId || createMutation.isPending}
            data-testid="button-create-session"
          >
            {createMutation.isPending ? "Criando..." : "Criar sessão"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ShareDialog({
  session,
  onClose,
}: {
  session: TrackingSessionWithDetails | null;
  onClose: () => void;
}) {
  const { toast } = useToast();
  if (!session) return null;
  const shareUrl = `${window.location.origin}/rastrear/${session.shareToken}`;

  return (
    <Dialog open={!!session} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" /> Link para o motorista
          </DialogTitle>
          <DialogDescription>
            Envie este link para o motorista abrir no celular dele. Ao tocar em "Iniciar Compartilhamento", o GPS começa
            a transmitir a localização em tempo real.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="rounded border bg-muted p-3 font-mono text-sm break-all" data-testid="text-share-url">
            {shareUrl}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => {
                navigator.clipboard.writeText(shareUrl);
                toast({ title: "Link copiado!" });
              }}
              data-testid="button-copy-link"
            >
              <Copy className="h-4 w-4 mr-1" /> Copiar link
            </Button>
            {typeof navigator !== "undefined" && "share" in navigator && (
              <Button
                variant="outline"
                onClick={() => {
                  navigator.share?.({
                    title: "Rastreamento TruckFlow",
                    text: "Abra para iniciar o compartilhamento de localização",
                    url: shareUrl,
                  });
                }}
              >
                Compartilhar
              </Button>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            O link funciona em qualquer navegador moderno (Chrome, Safari) e exige permissão de localização.
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
