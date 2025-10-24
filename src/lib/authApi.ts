import { apiFetch } from "./apiClient";

export interface LoginResponse {
  token: string;
  data: {
    id: string;
    name: string;
    email: string;
  };
  role: string;
}

export async function loginApi(email: string, password: string): Promise<LoginResponse> {
  return apiFetch<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}
