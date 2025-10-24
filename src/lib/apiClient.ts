export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

interface ApiOptions extends RequestInit {
  requiresAuth?: boolean;
}

export async function apiFetch<T>(
  endpoint: string,
  options: ApiOptions = {}
): Promise<T> {
  const { requiresAuth, headers, ...rest } = options;

  const defaultHeaders: HeadersInit = {
    "Content-Type": "application/json",
    ...(headers || {}),
  };

  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: defaultHeaders,
    ...rest,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || "API request failed");
  }

  return res.json();
}
