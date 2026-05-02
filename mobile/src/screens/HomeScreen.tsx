import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../auth';
import { api } from '../api';
import { setActiveSession, getActiveSession } from '../buffer';
import { startBackgroundTracking } from '../tracking-task';
import type { RootStackParamList } from '../../App';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({ navigation }: Props) {
  const { driver, truck, token, logout } = useAuth();
  const [starting, setStarting] = useState(false);
  const [resumeSessionId, setResumeSessionId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const local = await getActiveSession();
      if (local) {
        setResumeSessionId(local);
        return;
      }
      try {
        const me = await api<{ activeSession: { id: string } | null }>('/api/driver/me', { token });
        if (me.activeSession) setResumeSessionId(me.activeSession.id);
      } catch {
        // ignore — offline or token expired
      }
    })();
  }, [token]);

  async function ensurePermissions(): Promise<boolean> {
    const { status: fg } = await Location.requestForegroundPermissionsAsync();
    if (fg !== 'granted') {
      Alert.alert(
        'Permissão de GPS',
        'Para registrar a viagem é necessário liberar o acesso à localização.',
        [{ text: 'Abrir ajustes', onPress: () => Linking.openSettings() }, { text: 'Cancelar' }],
      );
      return false;
    }
    const { status: bg } = await Location.requestBackgroundPermissionsAsync();
    if (bg !== 'granted') {
      Alert.alert(
        'Permissão em segundo plano',
        'Permita "Sempre" para o GPS continuar funcionando com o app fechado ou a tela bloqueada.',
        [{ text: 'Abrir ajustes', onPress: () => Linking.openSettings() }, { text: 'Cancelar' }],
      );
      return false;
    }
    return true;
  }

  async function startTrip() {
    if (!truck) {
      Alert.alert('Sem caminhão', 'Você ainda não tem um caminhão vinculado. Procure o gestor.');
      return;
    }
    setStarting(true);
    try {
      const ok = await ensurePermissions();
      if (!ok) return;
      const session = await api<{ id: string; resumed?: boolean }>('/api/driver/trips/start', {
        method: 'POST',
        token,
        body: {},
      });
      await setActiveSession(session.id);
      await startBackgroundTracking();
      navigation.replace('Trip', { sessionId: session.id });
    } catch (e: any) {
      Alert.alert('Erro ao iniciar', e?.message ?? 'Tente novamente');
    } finally {
      setStarting(false);
    }
  }

  async function resume() {
    if (!resumeSessionId) return;
    await setActiveSession(resumeSessionId);
    await startBackgroundTracking();
    navigation.replace('Trip', { sessionId: resumeSessionId });
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.greet}>Olá, {driver?.name?.split(' ')[0] ?? 'motorista'}</Text>
          <Text style={styles.muted}>Pronto para iniciar uma nova viagem?</Text>

          <View style={styles.truckBox}>
            <Text style={styles.truckLabel}>Caminhão vinculado</Text>
            {truck ? (
              <>
                <Text style={styles.truckMain}>{truck.number} · {truck.plate}</Text>
                <Text style={styles.truckSub}>{truck.model}</Text>
              </>
            ) : (
              <Text style={styles.truckSub}>Nenhum caminhão vinculado. Procure o gestor.</Text>
            )}
          </View>

          {resumeSessionId ? (
            <TouchableOpacity style={[styles.button, { backgroundColor: '#f59e0b' }]} onPress={resume}>
              <Text style={styles.buttonText}>Retomar viagem em andamento</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.button} onPress={startTrip} disabled={starting || !truck}>
              {starting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Iniciar viagem</Text>}
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.linkButton} onPress={() => navigation.navigate('History')}>
            <Text style={styles.linkText}>Ver histórico</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={logout} style={styles.logout}>
          <Text style={styles.logoutText}>Sair</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  content: { padding: 20 },
  card: { backgroundColor: '#1e293b', padding: 20, borderRadius: 16 },
  greet: { color: '#fff', fontSize: 22, fontWeight: '700' },
  muted: { color: '#94a3b8', marginTop: 4 },
  truckBox: { backgroundColor: '#0f172a', padding: 14, borderRadius: 12, marginVertical: 18, borderWidth: 1, borderColor: '#334155' },
  truckLabel: { color: '#94a3b8', fontSize: 12 },
  truckMain: { color: '#fff', fontSize: 18, fontWeight: '700', marginTop: 4 },
  truckSub: { color: '#cbd5e1', marginTop: 2 },
  button: { backgroundColor: '#16a34a', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  linkButton: { padding: 14, alignItems: 'center', marginTop: 8 },
  linkText: { color: '#60a5fa', fontWeight: '600' },
  logout: { padding: 14, alignItems: 'center', marginTop: 24 },
  logoutText: { color: '#94a3b8' },
});
