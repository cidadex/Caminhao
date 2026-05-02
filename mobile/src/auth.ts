import { createContext, createElement, useContext, useEffect, useState, type ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { api } from './api';

const TOKEN_KEY = 'truckflow_token';
const DRIVER_KEY = 'truckflow_driver';
const TRUCK_KEY = 'truckflow_truck';

export type DriverInfo = { id: string; username: string | null; name: string; phone: string | null };
export type TruckInfo = { id: string; number: string; plate: string; model: string } | null;

type AuthState = {
  token: string | null;
  driver: DriverInfo | null;
  truck: TruckInfo;
  hydrating: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [driver, setDriver] = useState<DriverInfo | null>(null);
  const [truck, setTruck] = useState<TruckInfo>(null);
  const [hydrating, setHydrating] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [storedToken, storedDriver, storedTruck] = await Promise.all([
          SecureStore.getItemAsync(TOKEN_KEY),
          SecureStore.getItemAsync(DRIVER_KEY),
          SecureStore.getItemAsync(TRUCK_KEY),
        ]);
        if (storedToken) setToken(storedToken);
        if (storedDriver) setDriver(JSON.parse(storedDriver));
        if (storedTruck) setTruck(JSON.parse(storedTruck));
      } finally {
        setHydrating(false);
      }
    })();
  }, []);

  async function login(username: string, password: string) {
    const data = await api<{ token: string; driver: DriverInfo; truck: TruckInfo }>('/api/driver/login', {
      method: 'POST',
      body: { username, password },
    });
    await SecureStore.setItemAsync(TOKEN_KEY, data.token);
    await SecureStore.setItemAsync(DRIVER_KEY, JSON.stringify(data.driver));
    if (data.truck) {
      await SecureStore.setItemAsync(TRUCK_KEY, JSON.stringify(data.truck));
    } else {
      await SecureStore.deleteItemAsync(TRUCK_KEY);
    }
    setToken(data.token);
    setDriver(data.driver);
    setTruck(data.truck);
  }

  async function logout() {
    await Promise.all([
      SecureStore.deleteItemAsync(TOKEN_KEY),
      SecureStore.deleteItemAsync(DRIVER_KEY),
      SecureStore.deleteItemAsync(TRUCK_KEY),
    ]);
    setToken(null);
    setDriver(null);
    setTruck(null);
  }

  return createElement(
    AuthContext.Provider,
    { value: { token, driver, truck, hydrating, login, logout } },
    children,
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
}

export async function getStoredToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}
