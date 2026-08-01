/** Shared Axios client for browser and Electron REST requests. */
import axios from "axios";

export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

const api = axios.create({ baseURL: API_URL, timeout: 10000 });
export default api;
