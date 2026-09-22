// Cấu hình tập trung Endpoint kết nối API & SignalR
const isDev = import.meta.env.DEV;

// Trong môi trường Production / Docker (Nginx Reverse Proxy):
// Gọi trực tiếp relative path (/stocks và /stockHub) để Nginx tự điều hướng sang container Backend
// Trong môi trường Local Dev (npm run dev độc lập):
// Fallback về port mặc định của ASP.NET Core API (http://localhost:5049)
export const API_BASE_URL = import.meta.env.VITE_API_URL ?? (isDev ? 'http://localhost:5049' : '');

export const SIGNALR_HUB_URL = import.meta.env.VITE_SIGNALR_URL ?? (isDev ? 'http://localhost:5049/stockHub' : '/stockHub');
