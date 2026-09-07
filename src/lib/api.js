import { useSyncExternalStore } from "react";

const API_STORAGE_KEY = "smartAphid.activeApiBaseUrl";
const DISCOVERY_TIMEOUT_MS = 2500;
const DISCOVERY_RETRY_COOLDOWN_MS = 5000;
const MAX_DISCOVERY_CANDIDATES = 8;


const initialConnectionState = {
  status: "searching",
  message: "Backend unavailable — searching for device...",
};

let activeApiBaseUrl = null;
let discoveryPromise = null;
let lastDiscoveryFailureAt = 0;
let connectionState = initialConnectionState;
const listeners = new Set();

export class BackendUnavailableError extends Error {
  constructor(message = initialConnectionState.message) {
    super(message);
    this.name = "BackendUnavailableError";
    this.code = "BACKEND_UNAVAILABLE";
  }
}

export const isApiConnectionError = (error) =>
  error?.code === "BACKEND_UNAVAILABLE" ||
  error?.name === "TypeError" ||
  error?.name === "AbortError";

export const getBackendUnavailableMessage = () =>
  initialConnectionState.message;

function notifyConnectionState(nextState) {
  connectionState = nextState;
  listeners.forEach((listener) => listener());
}

function setSearching() {
  notifyConnectionState({
    status: "searching",
    message: initialConnectionState.message,
  });
}

function setUnavailable() {
  notifyConnectionState({
    status: "unavailable",
    message: initialConnectionState.message,
  });
}

function setConnected() {
  notifyConnectionState({
    status: "connected",
    message: "Backend connected",
  });
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getConnectionSnapshot() {
  return connectionState;
}

export function useApiConnectionStatus() {
  return useSyncExternalStore(
    subscribe,
    getConnectionSnapshot,
    getConnectionSnapshot
  );
}

function normalizeBaseUrl(value) {
  if (!value || typeof value !== "string") return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(
      trimmed,
      typeof window !== "undefined" ? window.location.origin : undefined
    );

    if (!/^https?:$/.test(parsed.protocol)) return null;

    parsed.hash = "";
    parsed.search = "";
    parsed.pathname = parsed.pathname.replace(/\/+$/, "");
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

function readCachedBaseUrl() {
  if (typeof window === "undefined") return null;

  try {
    const cached = window.localStorage.getItem(API_STORAGE_KEY);
    return normalizeBaseUrl(cached);
  } catch {
    return null;
  }
}

function writeCachedBaseUrl(baseUrl) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(API_STORAGE_KEY, baseUrl);
  } catch {
    // Storage may be unavailable in private browsing or restricted contexts.
  }
}

function clearCachedBaseUrl() {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(API_STORAGE_KEY);
  } catch {
    // Storage may be unavailable in private browsing or restricted contexts.
  }
}

function getConfiguredBaseUrl() {
  return normalizeBaseUrl(import.meta.env.VITE_API_URL);
}

function getConfiguredCandidates() {
  const configured = import.meta.env.VITE_API_CANDIDATES;
  if (!configured) return [];

  return configured
    .split(",")
    .map((candidate) => normalizeBaseUrl(candidate))
    .filter(Boolean);
}

function isVercelOrHostedFrontend(hostname) {
  const value = String(hostname || "").toLowerCase();
  return (
    value.endsWith(".vercel.app") ||
    value.endsWith(".vercel.sh") ||
    value.endsWith(".netlify.app")
  );
}

function getBrowserOriginCandidate() {
  if (typeof window === "undefined") return null;

  const { hostname, origin, port, protocol } = window.location;
  if (!hostname || isVercelOrHostedFrontend(hostname)) return null;

  // If the frontend itself is served by the backend, use that origin directly.
  if (port === "8000") return normalizeBaseUrl(origin);

  // Local development, a LAN hostname/IP, and Tailscale hostnames can usually
  // reach the same machine's backend on port 8000 from the browser.
  if (protocol === "http:" || protocol === "https:") {
    return normalizeBaseUrl(`${protocol}//${hostname}:8000`);
  }

  return null;
}

function getDiscoveryCandidates(excludedBaseUrl = null) {
  const candidates = [
    getConfiguredBaseUrl(),
    readCachedBaseUrl(),
    getBrowserOriginCandidate(),
    ...getConfiguredCandidates(),
  ]
    .map(normalizeBaseUrl)
    .filter(Boolean)
    .filter((candidate) => candidate !== excludedBaseUrl);

  return [...new Set(candidates)].slice(0, MAX_DISCOVERY_CANDIDATES);
}

async function probeBackend(baseUrl) {
  const controller = new AbortController();
  const timeout = window.setTimeout(
    () => controller.abort(),
    DISCOVERY_TIMEOUT_MS
  );

  try {
    const response = await fetch(`${baseUrl}/`, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    });

    return response.ok;
  } catch {
    return false;
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function discoverApiBaseUrl({
  force = false,
  excludedBaseUrl = null,
} = {}) {
  if (!force && activeApiBaseUrl) return activeApiBaseUrl;
  if (discoveryPromise) return discoveryPromise;

  const now = Date.now();
  if (
    !force &&
    lastDiscoveryFailureAt &&
    now - lastDiscoveryFailureAt < DISCOVERY_RETRY_COOLDOWN_MS
  ) {
    throw new BackendUnavailableError();
  }

  setSearching();

  discoveryPromise = (async () => {
    const candidates = getDiscoveryCandidates(excludedBaseUrl);

    for (const candidate of candidates) {
      if (await probeBackend(candidate)) {
        activeApiBaseUrl = candidate;
        lastDiscoveryFailureAt = 0;
        writeCachedBaseUrl(candidate);
        setConnected();
        return candidate;
      }
    }

    activeApiBaseUrl = null;
    lastDiscoveryFailureAt = Date.now();
    clearCachedBaseUrl();
    setUnavailable();
    throw new BackendUnavailableError();
  })();

  try {
    return await discoveryPromise;
  } finally {
    discoveryPromise = null;
  }
}

export async function getApiBaseUrl(options = {}) {
  if (activeApiBaseUrl && !options.force) return activeApiBaseUrl;
  return discoverApiBaseUrl(options);
}

export function invalidateApiBaseUrl(baseUrl = activeApiBaseUrl) {
  if (!baseUrl || !activeApiBaseUrl || activeApiBaseUrl === baseUrl) {
    activeApiBaseUrl = null;
    clearCachedBaseUrl();
    setSearching();
  }
}

function joinApiPath(baseUrl, path) {
  if (!path) return baseUrl;
  if (/^https?:\/\//i.test(path)) return path;
  return `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

async function fetchFromBase(baseUrl, path, options) {
  const response = await fetch(joinApiPath(baseUrl, path), options);
  setConnected();
  return response;
}

export async function apiFetch(path, options = {}) {
  const baseUrl = await getApiBaseUrl();

  try {
    return await fetchFromBase(baseUrl, path, options);
  } catch (error) {
    // Retry the original request once after rediscovering a different backend.
    invalidateApiBaseUrl(baseUrl);

    try {
      const rediscoveredBaseUrl = await discoverApiBaseUrl({
        force: true,
        excludedBaseUrl: baseUrl,
      });
      return await fetchFromBase(rediscoveredBaseUrl, path, options);
    } catch (retryError) {
      if (retryError?.code === "BACKEND_UNAVAILABLE") throw retryError;
      throw error;
    }
  }
}

export const apiGet = (path, options = {}) =>
  apiFetch(path, { ...options, method: "GET" });

export const apiPost = (path, body, options = {}) =>
  apiFetch(path, { ...options, method: "POST", body });

export function resolveApiUrl(value) {
  if (!value || typeof value !== "string") return value;
  if (/^https?:\/\//i.test(value)) return value;

  const baseUrl =
    activeApiBaseUrl ||
    getConfiguredBaseUrl() ||
    readCachedBaseUrl() ||
    getBrowserOriginCandidate();

  return baseUrl ? joinApiPath(baseUrl, value) : value;
}
