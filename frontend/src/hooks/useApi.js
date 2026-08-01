"use client";

/** Expose the configured REST client to React components. */
import { useMemo } from "react";
import api from "../lib/api";

export default function useApi() {
  return useMemo(() => api, []);
}
