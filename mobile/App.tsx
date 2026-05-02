import 'react-native-gesture-handler';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import TripScreen from './src/screens/TripScreen';
import SummaryScreen from './src/screens/SummaryScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import { AuthProvider, useAuth } from './src/auth';
import { initBuffer } from './src/buffer';
import { registerTrackingTask } from './src/tracking-task';

export type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  Trip: { sessionId: string };
  Summary: { sessionId: string };
  History: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const queryClient = new QueryClient();

// Register the background location task at module load time so it survives app restarts.
registerTrackingTask();

function Navigation() {
  const { token, hydrating } = useAuth();
  if (hydrating) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' }}>
        <ActivityIndicator color="#fff" />
      </View>
    );
  }
  return (
    <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: '#0f172a' }, headerTintColor: '#fff' }}>
      {token ? (
        <>
          <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'TruckFlow Motorista' }} />
          <Stack.Screen name="Trip" component={TripScreen} options={{ title: 'Viagem em andamento' }} />
          <Stack.Screen name="Summary" component={SummaryScreen} options={{ title: 'Resumo da viagem' }} />
          <Stack.Screen name="History" component={HistoryScreen} options={{ title: 'Histórico' }} />
        </>
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  const [bufferReady, setBufferReady] = useState(false);
  useEffect(() => {
    initBuffer().finally(() => setBufferReady(true));
  }, []);
  if (!bufferReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' }}>
        <ActivityIndicator color="#fff" />
      </View>
    );
  }
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <NavigationContainer>
            <Navigation />
          </NavigationContainer>
          <StatusBar style="light" />
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
