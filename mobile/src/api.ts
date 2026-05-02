import Constants from 'expo-constants';

const FALLBACK_URL = 'http://localhost:5000';

export function getApiUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  const fromExtra = (Constants.expoConfig?.extra as any)?.apiUrl as string | undefined;
  if (fromExtra) return fromExtra.replace(/\/$/, '');
  return FALLBACK_URL;
}

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export async function api<T>(
  path: string,
  opts: { method?: string; body?: any; token?: string | null } = {},
): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
  const res = await fetch(`${getApiUrl()}${path}`, {
    method: opts.method ?? 'GET',
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    // ignore non-json responses
  }
  if (!res.ok) {
    throw new ApiError(data?.message ?? `Erro HTTP ${res.status}`, res.status, data?.code);
  }
  return data as T;
}
