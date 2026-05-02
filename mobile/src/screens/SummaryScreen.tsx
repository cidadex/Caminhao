import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { api } from '../api';
import { useAuth } from '../auth';
import type { RootStackParamList } from '../../App';

type Props = NativeStackScreenProps<RootStackParamList, 'Summary'>;
type Summary = { kmTraveled: number; durationSeconds: number; averageSpeedKmh: number; pointsCount: number };

function formatDuration(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}min`;
  return `${m}min`;
}

export default function SummaryScreen({ route, navigation }: Props) {
  const { token } = useAuth();
  const { sessionId } = route.params;
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await api<Summary>(`/api/tracking/sessions/${sessionId}/summary`, { token }).catch(() =>
          api<{ summary: Summary }>(`/api/driver/trips/${sessionId}/end`, { method: 'POST', token }).then((r) => r.summary),
        );
        setSummary(data);
      } catch (e: any) {
        setError(e?.message ?? 'Erro ao buscar resumo');
      }
    })();
  }, [sessionId, token]);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.card}>
        <Text style={styles.title}>Viagem encerrada</Text>
        <Text style={styles.subtitle}>Resumo</Text>

        {!summary && !error && <ActivityIndicator color="#fff" style={{ marginTop: 24 }} />}
        {error && <Text style={styles.error}>{error}</Text>}
        {summary && (
          <View style={styles.grid}>
            <Stat label="Distância" value={`${summary.kmTraveled.toFixed(1)} km`} />
            <Stat label="Duração" value={formatDuration(summary.durationSeconds)} />
            <Stat label="Vel. média" value={`${summary.averageSpeedKmh.toFixed(0)} km/h`} />
            <Stat label="Pontos GPS" value={String(summary.pointsCount)} />
          </View>
        )}
      </View>

      <TouchableOpacity style={styles.button} onPress={() => navigation.replace('Home')}>
        <Text style={styles.buttonText}>Voltar ao início</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 20 },
  card: { backgroundColor: '#1e293b', padding: 24, borderRadius: 16 },
  title: { color: '#fff', fontSize: 22, fontWeight: '700' },
  subtitle: { color: '#94a3b8', marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 18 },
  stat: { flexBasis: '47%', backgroundColor: '#0f172a', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#334155' },
  statLabel: { color: '#94a3b8', fontSize: 12 },
  statValue: { color: '#fff', fontSize: 22, fontWeight: '700', marginTop: 2 },
  error: { color: '#ef4444', marginTop: 12 },
  button: { backgroundColor: '#2563eb', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 24 },
  buttonText: { color: '#fff', fontWeight: '700' },
});
