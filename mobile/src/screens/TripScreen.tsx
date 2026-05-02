import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Network from 'expo-network';
import { useKeepAwake } from 'expo-keep-awake';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { api } from '../api';
import { useAuth } from '../auth';
import { clearActiveSession, pendingCount } from '../buffer';
import { drainSession, syncBatchOnce } from '../sync';
import { isTrackingRunning, stopBackgroundTracking } from '../tracking-task';
import type { RootStackParamList } from '../../App';

type Props = NativeStackScreenProps<RootStackParamList, 'Trip'>;

export default function TripScreen({ route, navigation }: Props) {
  useKeepAwake();
  const { token } = useAuth();
  const { sessionId } = route.params;
  const [pending, setPending] = useState(0);
  const [tracking, setTracking] = useState(false);
  const [online, setOnline] = useState(true);
  const [endingTrip, setEndingTrip] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);
  const startedAtRef = useRef<Date>(new Date());
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loop() {
      while (!cancelled) {
        try {
          const net = await Network.getNetworkStateAsync();
          setOnline(!!net.isConnected && !!net.isInternetReachable);
          setTracking(await isTrackingRunning());
          const c = await pendingCount(sessionId);
          setPending(c);
          if (net.isConnected) {
            const r = await syncBatchOnce();
            if (r && r.flushed > 0) setLastSyncAt(new Date());
          }
        } catch (e) {
          // swallow — UI loop must keep running
        }
        await new Promise((r) => setTimeout(r, 5000));
      }
    }
    loop();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  async function endTrip() {
    Alert.alert('Encerrar viagem', 'Tem certeza que deseja encerrar a viagem agora?', [
      { text: 'Cancelar' },
      {
        text: 'Encerrar',
        style: 'destructive',
        onPress: async () => {
          setEndingTrip(true);
          try {
            // Drain the local buffer entirely before closing. If the network drops
            // mid-drain we abort and keep the session active so no points are lost.
            await drainSession(sessionId);
            const remaining = await pendingCount(sessionId);
            if (remaining > 0) {
              Alert.alert(
                'Pontos pendentes',
                `Ainda há ${remaining} pontos para enviar. Verifique sua conexão e tente novamente.`,
              );
              setEndingTrip(false);
              return;
            }
            await api(`/api/driver/trips/${sessionId}/end`, { method: 'POST', token });
            await stopBackgroundTracking();
            await clearActiveSession();
            navigation.replace('Summary', { sessionId });
          } catch (e: any) {
            Alert.alert('Erro', e?.message ?? 'Tente novamente');
          } finally {
            setEndingTrip(false);
          }
        },
      },
    ]);
  }

  const elapsedSec = Math.floor((Date.now() - startedAtRef.current.getTime()) / 1000);
  const hh = String(Math.floor(elapsedSec / 3600)).padStart(2, '0');
  const mm = String(Math.floor((elapsedSec % 3600) / 60)).padStart(2, '0');
  const ss = String(elapsedSec % 60).padStart(2, '0');

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.heroCard}>
        <View style={[styles.dot, { backgroundColor: tracking ? '#22c55e' : '#ef4444' }]} />
        <Text style={styles.heroTitle}>{tracking ? 'Registrando viagem' : 'GPS parado'}</Text>
        <Text style={styles.heroTime}>{hh}:{mm}:{ss}</Text>
        <Text style={styles.heroSub}>Você pode bloquear a tela e guardar o celular no bolso.</Text>
      </View>

      <View style={styles.statusGrid}>
        <Status label="Conexão" value={online ? 'Online' : 'Offline'} color={online ? '#22c55e' : '#f59e0b'} />
        <Status label="Pontos pendentes" value={String(pending)} color={pending > 50 ? '#f59e0b' : '#94a3b8'} />
        <Status label="GPS" value={tracking ? 'Ativo' : 'Parado'} color={tracking ? '#22c55e' : '#ef4444'} />
        <Status label="Última sync" value={lastSyncAt ? lastSyncAt.toLocaleTimeString('pt-BR') : '—'} color="#94a3b8" />
      </View>

      <View style={{ flex: 1 }} />

      <TouchableOpacity style={styles.endButton} onPress={endTrip} disabled={endingTrip}>
        {endingTrip ? <ActivityIndicator color="#fff" /> : <Text style={styles.endText}>Encerrar viagem</Text>}
      </TouchableOpacity>
      <Text style={styles.note} key={tick}>
        {pending > 0 && !online
          ? 'Sem internet — os pontos estão sendo salvos no celular e serão enviados quando voltar online.'
          : 'O envio acontece automaticamente em segundo plano.'}
      </Text>
    </SafeAreaView>
  );
}

function Status({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.statusBox}>
      <Text style={styles.statusLabel}>{label}</Text>
      <Text style={[styles.statusValue, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 20 },
  heroCard: { backgroundColor: '#1e293b', padding: 24, borderRadius: 16, alignItems: 'center' },
  dot: { width: 12, height: 12, borderRadius: 6, marginBottom: 8 },
  heroTitle: { color: '#fff', fontSize: 16, fontWeight: '600' },
  heroTime: { color: '#fff', fontSize: 48, fontWeight: '800', marginTop: 8, letterSpacing: 2 },
  heroSub: { color: '#94a3b8', marginTop: 8, textAlign: 'center' },
  statusGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 16, gap: 10 },
  statusBox: { flexBasis: '48%', backgroundColor: '#1e293b', padding: 14, borderRadius: 12 },
  statusLabel: { color: '#94a3b8', fontSize: 12 },
  statusValue: { fontSize: 18, fontWeight: '700', marginTop: 2 },
  endButton: { backgroundColor: '#dc2626', padding: 18, borderRadius: 12, alignItems: 'center' },
  endText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  note: { color: '#94a3b8', fontSize: 12, textAlign: 'center', marginTop: 10 },
});
