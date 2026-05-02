import { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../auth';
import { getApiUrl } from '../api';

export default function LoginScreen() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    if (!username || !password) {
      Alert.alert('Atenção', 'Preencha usuário e senha');
      return;
    }
    setLoading(true);
    try {
      await login(username.trim(), password);
    } catch (e: any) {
      Alert.alert('Erro ao entrar', e?.message ?? 'Tente novamente');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.kav}>
        <View style={styles.card}>
          <Text style={styles.title}>TruckFlow</Text>
          <Text style={styles.subtitle}>App do motorista</Text>

          <Text style={styles.label}>Usuário</Text>
          <TextInput
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="seu.usuario"
            placeholderTextColor="#64748b"
            style={styles.input}
          />

          <Text style={styles.label}>Senha</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="••••••••"
            placeholderTextColor="#64748b"
            style={styles.input}
          />

          <TouchableOpacity style={styles.button} onPress={onSubmit} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Entrar</Text>}
          </TouchableOpacity>

          <Text style={styles.helper}>Servidor: {getApiUrl()}</Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  kav: { flex: 1, justifyContent: 'center', padding: 24 },
  card: { backgroundColor: '#1e293b', padding: 24, borderRadius: 16 },
  title: { fontSize: 28, fontWeight: '700', color: '#fff', textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#94a3b8', textAlign: 'center', marginBottom: 24 },
  label: { color: '#cbd5e1', fontSize: 13, marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: '#0f172a', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, color: '#fff', fontSize: 16, borderWidth: 1, borderColor: '#334155' },
  button: { backgroundColor: '#2563eb', padding: 14, borderRadius: 10, marginTop: 20, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  helper: { color: '#64748b', fontSize: 11, textAlign: 'center', marginTop: 16 },
});
