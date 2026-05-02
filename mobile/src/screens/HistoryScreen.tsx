import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api';
import { useAuth } from '../auth';

type TripItem = {
  id: string;
  status: string;
  startedAt: string;
  endedAt: string | null;
  truck: { number: string; plate: string } | null;
  summary: { kmTraveled: number; durationSeconds: number; averageSpeedKmh: number };
};

function formatDuration(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}min`;
  return `${m}min`;
}

export default function HistoryScreen() {
  const { token } = useAuth();
  const { data = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['driver-trips'],
    queryFn: () => api<TripItem[]>('/api/driver/trips', { token }),
  });

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator color="#fff" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FlatList
        contentContainerStyle={{ padding: 16 }}
        data={data}
        keyExtractor={(t) => t.id}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor="#fff" />}
        ListEmptyComponent={<Text style={styles.empty}>Você ainda não tem viagens registradas.</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.title}>
                {item.truck ? `${item.truck.number} · ${item.truck.plate}` : 'Caminhão'}
              </Text>
              <View style={[styles.badge, { backgroundColor: item.status === 'active' ? '#16a34a' : '#475569' }]}>
                <Text style={styles.badgeText}>{item.status === 'active' ? 'Em andamento' : 'Encerrada'}</Text>
              </View>
            </View>
            <Text style={styles.muted}>Início: {new Date(item.startedAt).toLocaleString('pt-BR')}</Text>
            {item.endedAt && <Text style={styles.muted}>Fim: {new Date(item.endedAt).toLocaleString('pt-BR')}</Text>}
            <View style={styles.statRow}>
              <Stat label="Distância" value={`${item.summary.kmTraveled.toFixed(1)} km`} />
              <Stat label="Duração" value={formatDuration(item.summary.durationSeconds)} />
              <Stat label="Vel. méd." value={`${item.summary.averageSpeedKmh.toFixed(0)} km/h`} />
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  empty: { color: '#94a3b8', textAlign: 'center', marginTop: 40 },
  card: { backgroundColor: '#1e293b', padding: 16, borderRadius: 12, marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: '#fff', fontWeight: '700', fontSize: 15 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  muted: { color: '#94a3b8', fontSize: 12, marginTop: 4 },
  statRow: { flexDirection: 'row', marginTop: 12, gap: 8 },
  statLabel: { color: '#94a3b8', fontSize: 11 },
  statValue: { color: '#fff', fontSize: 16, fontWeight: '700', marginTop: 2 },
});
