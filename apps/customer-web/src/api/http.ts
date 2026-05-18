import axios from "axios";

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:53080",
});
export async function getMock<T>(path: string): Promise<T> {
  const { data } = await http.get<T>(`/api/mock${path}`);
  return data;
}
export async function postMock<T>(path: string, body: unknown): Promise<T> {
  const { data } = await http.post<T>(`/api/mock${path}`, body);
  return data;
}
export async function patchMock<T>(path: string, body?: unknown): Promise<T> {
  const { data } = await http.patch<T>(`/api/mock${path}`, body);
  return data;
}
