export const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

export type ApiEnvelope<T> = { data: T; error?: { message?: string } };

export async function adminRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const token = window.localStorage.getItem("accessToken");
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers: {
      ...(options?.body ? { "Content-Type": "application/json" } : {}),
      Authorization: `Bearer ${token}`,
      ...options?.headers,
    },
  });
  const payload = await response.json().catch(() => null) as ApiEnvelope<T> | null;
  if (!response.ok) throw new Error(payload?.error?.message ?? "Permintaan tidak dapat diproses.");
  return payload?.data as T;
}
