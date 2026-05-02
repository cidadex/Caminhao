import { useEffect, useRef, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  MapPin,
  Navigation,
  Play,
  Square,
  Loader2,
  AlertTriangle,
  Truck as TruckIcon,
  Gauge,
  CheckCircle,
  Wifi,
  WifiOff,
} from "lucide-react";

interface ShareInfo {
  id: string;
  status: string;
  truck: { number: string; plate: string; model: string } | null;
  driver: { name: string } | null;
  startedAt: string;
  endedAt: string | null;
}

interface PendingPoint {
  lat: number;
  lng: number;
  speed: number | null;
  heading: number | null;
  accuracy: number | null;
  altitude: number | null;
  capturedAt: string;
}

const SEND_INTERVAL_MS = 8000; // batch send every 8s

export default function DriverTrackingPage() {
  const [match, params] = useRoute<{ token: string }>("/rastrear/:token");
  const [, setLocation] = useLocation();
  const token = match ? params?.token : null;
  const { toast } = useToast();

  const [info, setInfo] = useState<ShareInfo | null>(null);
  const [loadingInfo, setLoadingInfo] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [tracking, setTracking] = useState(false);
  const [latest, setLatest] = useState<GeolocationPosition | null>(null);
  const [sentCount, setSentCount] = useState(0);
  const [bufferedCount, setBufferedCount] = useState(0);
  const [online, setOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);

  const watchIdRef = useRef<number | null>(null);
  const intervalRef = useRef<number | null>(null);
  const pendingRef = useRef<PendingPoint[]>([]);
  const wakeLockRef = useRef<any>(null);

  // fetch share info
  useEffect(() => {
    if (!token) return;
    setLoadingInfo(true);
    fetch(`/api/tracking/share/${token}`)
      .then(async (r) => {
        if (!r.ok) {
          const data = await r.json().catch(() => ({}));
          throw new Error(data.message || "Link inválido");
        }
        return r.json();
      })
      .then((d) => setInfo(d))
      .catch((e) => setError(e.message))
      .finally(() => setLoadingInfo(false));
  }, [token]);

  // Online/offline tracking
  useEffect(() => {
    const onOn = () => setOnline(true);
    const onOff = () => setOnline(false);
    window.addEventListener("online", onOn);
    window.addEventListener("offline", onOff);
    return () => {
      window.removeEventListener("online", onOn);
      window.removeEventListener("offline", onOff);
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopWatching();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function requestWakeLock() {
    try {
      const anyNav = navigator as any;
      if (anyNav.wakeLock?.request) {
        wakeLockRef.current = await anyNav.wakeLock.request("screen");
      }
    } catch {
      // ignore
    }
  }

  function releaseWakeLock() {
    try {
      wakeLockRef.current?.release?.();
      wakeLockRef.current = null;
    } catch {
      // ignore
    }
  }

  async function flushPending() {
    if (!token || !navigator.onLine || pendingRef.current.length === 0) return;
    const batch = [...pendingRef.current].sort((a, b) =>
      a.capturedAt.localeCompare(b.capturedAt)
    );
    pendingRef.current = [];
    setBufferedCount(pendingRef.current.length);

    let okCount = 0;
    // Send strictly in chronological order; on failure, requeue rest and stop.
    for (let i = 0; i < batch.length; i++) {
      const p = batch[i];
      try {
        const r = await fetch(`/api/tracking/share/${token}/location`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(p),
        });
        if (!r.ok) throw new Error("send failed");
        okCount++;
      } catch {
        pendingRef.current.unshift(...batch.slice(i));
        break;
      }
    }
    if (okCount > 0) setSentCount((c) => c + okCount);
    setBufferedCount(pendingRef.current.length);
  }

  function startWatching() {
    if (!navigator.geolocation) {
      toast({
        title: "GPS indisponível",
        description: "Este dispositivo não suporta geolocalização.",
        variant: "destructive",
      });
      return;
    }

    setTracking(true);
    requestWakeLock();

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setLatest(pos);
        const c = pos.coords;
        pendingRef.current.push({
          lat: c.latitude,
          lng: c.longitude,
          speed: c.speed != null && !Number.isNaN(c.speed) ? c.speed : null,
          heading: c.heading != null && !Number.isNaN(c.heading) ? c.heading : null,
          accuracy: c.accuracy != null && !Number.isNaN(c.accuracy) ? c.accuracy : null,
          altitude: c.altitude != null && !Number.isNaN(c.altitude) ? c.altitude : null,
          capturedAt: new Date(pos.timestamp || Date.now()).toISOString(),
        });
        setBufferedCount(pendingRef.current.length);
      },
      (err) => {
        toast({
          title: "Erro de localização",
          description: err.message,
          variant: "destructive",
        });
        if (err.code === err.PERMISSION_DENIED) stopWatching();
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 30000,
      }
    );

    // periodic flush
    intervalRef.current = window.setInterval(flushPending, SEND_INTERVAL_MS);
    // initial flush soon
    window.setTimeout(flushPending, 2000);

    toast({ title: "Rastreamento iniciado", description: "Mantenha esta tela aberta." });
  }

  function stopWatching() {
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (intervalRef.current != null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    flushPending();
    releaseWakeLock();
    setTracking(false);
  }

  if (!match) {
    setLocation("/");
    return null;
  }

  if (loadingInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" /> Link inválido
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{error}</p>
            <p className="text-sm mt-2">Solicite um novo link ao gestor da frota.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const sessionEnded = info?.status !== "active";
  const coords = latest?.coords;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/40 p-4 flex flex-col items-center">
      <div className="w-full max-w-md space-y-4 py-6">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 text-primary text-2xl font-bold">
            <Navigation className="h-7 w-7" />
            TruckFlow GPS
          </div>
          <p className="text-sm text-muted-foreground mt-1">Compartilhamento de localização</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <TruckIcon className="h-5 w-5" />
                {info?.truck?.number ?? "-"}
              </span>
              <Badge variant={sessionEnded ? "secondary" : "default"} data-testid="badge-session-status">
                {sessionEnded ? "Sessão encerrada" : "Sessão ativa"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>
              <span className="text-muted-foreground">Placa: </span>
              <span className="font-medium">{info?.truck?.plate ?? "-"}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Modelo: </span>
              <span>{info?.truck?.model ?? "-"}</span>
            </div>
            {info?.driver?.name && (
              <div>
                <span className="text-muted-foreground">Motorista: </span>
                <span>{info.driver.name}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {sessionEnded ? (
          <Card>
            <CardContent className="py-6 text-center">
              <CheckCircle className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">Esta sessão foi encerrada pelo gestor.</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-6 space-y-4">
              {!tracking ? (
                <>
                  <div className="text-center space-y-2">
                    <MapPin className="h-12 w-12 text-primary mx-auto" />
                    <p className="text-sm text-muted-foreground">
                      Toque em iniciar para começar a transmitir sua localização. Mantenha esta tela aberta durante a
                      viagem.
                    </p>
                  </div>
                  <Button
                    size="lg"
                    className="w-full"
                    onClick={startWatching}
                    data-testid="button-start-tracking"
                  >
                    <Play className="h-5 w-5 mr-2" />
                    Iniciar Compartilhamento
                  </Button>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-center gap-2">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                    </span>
                    <span className="font-semibold">Transmitindo</span>
                    {online ? (
                      <Wifi className="h-4 w-4 text-green-600" />
                    ) : (
                      <WifiOff className="h-4 w-4 text-amber-500" />
                    )}
                  </div>

                  {coords ? (
                    <div className="grid grid-cols-2 gap-3 text-sm bg-muted/40 rounded p-3">
                      <div>
                        <div className="text-xs text-muted-foreground">Latitude</div>
                        <div className="font-mono" data-testid="text-current-lat">
                          {coords.latitude.toFixed(5)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Longitude</div>
                        <div className="font-mono" data-testid="text-current-lng">
                          {coords.longitude.toFixed(5)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <Gauge className="h-3 w-3" /> Velocidade
                        </div>
                        <div>
                          {coords.speed != null && !Number.isNaN(coords.speed)
                            ? `${(coords.speed * 3.6).toFixed(0)} km/h`
                            : "-"}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Precisão</div>
                        <div>{coords.accuracy ? `${coords.accuracy.toFixed(0)} m` : "-"}</div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-center text-muted-foreground">Aguardando primeira leitura GPS...</p>
                  )}

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span data-testid="text-sent-count">Enviados: {sentCount}</span>
                    <span data-testid="text-buffer-count">Na fila: {bufferedCount}</span>
                  </div>

                  <Button
                    size="lg"
                    variant="destructive"
                    className="w-full"
                    onClick={stopWatching}
                    data-testid="button-stop-tracking"
                  >
                    <Square className="h-5 w-5 mr-2" />
                    Parar Compartilhamento
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        )}

        <p className="text-xs text-center text-muted-foreground">
          Sua localização é enviada apenas enquanto esta tela está aberta. Permaneça com o aplicativo em primeiro plano
          para garantir o envio.
        </p>
      </div>
    </div>
  );
}
