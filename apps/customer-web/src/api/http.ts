import axios from "axios";
import { clearCustomerSession, getCustomerToken } from "./customerSession";

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:53080",
});

http.interceptors.request.use((config) => {
  const token = getCustomerToken();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

http.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      clearCustomerSession();
      if (location.pathname !== "/login") {
        location.href = `/login?redirect=${encodeURIComponent(
          location.pathname + location.search,
        )}`;
      }
    }
    return Promise.reject(error);
  },
);
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

export interface MockUploadedFile {
  id: string;
  name: string;
  fileName: string;
  fileUrl: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
  uploadedBy: string;
}

export interface MockUploadResult {
  uploadedCount: number;
  files: MockUploadedFile[];
}

export function mockFileUrl(fileUrl?: string) {
  if (!fileUrl) return "";
  if (/^https?:\/\//i.test(fileUrl)) return fileUrl;
  const baseUrl = String(http.defaults.baseURL || "").replace(/\/$/, "");
  return `${baseUrl}${fileUrl.startsWith("/") ? fileUrl : `/${fileUrl}`}`;
}

export async function uploadMockFiles<T>(
  path: string,
  files: File[],
  fields: Record<string, string | number | boolean> = {},
): Promise<T> {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));
  Object.entries(fields).forEach(([key, value]) => {
    formData.append(key, String(value));
  });
  const { data } = await http.post<T>(`/api/mock${path}`, formData);
  return data;
}
