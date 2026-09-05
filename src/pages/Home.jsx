import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bug, UploadCloud, ScanSearch, Clock, Target, X, CheckCircle2, FileImage, AlertTriangle,
  RefreshCw, Database, Camera, TrendingUp, Trophy, Images, Activity, LockKeyhole, Power, Loader2,
  Cpu, Wifi, WifiOff,
} from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar,
} from "recharts";
import { supabase } from "../lib/supabase";
import { API_BASE, DETECT_ENDPOINT, DEVICES_ENDPOINT, REFRESH_INTERVAL } from "../lib/config";
import DeviceSelection from "./DeviceSelection";
import Header from "../components/Header";

function UploadZone({ onFileSelected, hasImage }) {
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState("");

  const handleFile = (file) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("Image must be smaller than 10 MB.");
      return;
    }

    setError("");

    const reader = new FileReader();

    reader.onload = (e) => {
      onFileSelected({
        dataUrl: e.target.result,
        name: file.name,
        size: file.size,
      });
    };

    reader.readAsDataURL(file);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);

    handleFile(e.dataTransfer.files?.[0]);
  };

  return (
    <div>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-12 text-center ${
          isDragging
            ? "border-[#078b67] bg-[#078b67]/[0.06]"
            : "border-gray-300 bg-white/80 hover:border-[#078b67] hover:bg-[#078b67]/[0.03]"
        }`}
      >
        <div className="ui-accent-icon mb-4 flex h-14 w-14 items-center justify-center rounded-2xl">
          <UploadCloud
            className="h-7 w-7 text-[#078b67]"
            strokeWidth={1.8}
          />
        </div>

        <p className="text-sm font-semibold text-gray-800">
          Drag & drop your trap image here
        </p>

        <p className="mt-1 text-xs text-gray-500">
          PNG, JPG or WEBP · up to 10 MB
        </p>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            inputRef.current?.click();
          }}
          className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#078b67] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#05694f]"
        >
          <FileImage className="h-4 w-4" />
          Choose Image
        </button>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            handleFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>

      {error && (
        <p className="mt-2 text-xs font-medium text-red-600">
          {error}
        </p>
      )}

      {hasImage && (
        <p className="mt-2 text-xs text-gray-500">
          Drop another image anytime to replace it.
        </p>
      )}
    </div>
  );
}

/* ============================================================
   PREVIEW
============================================================ */

function PreviewPanel({ image, onClear }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Preview — Original Image
        </span>

        <button
          type="button"
          onClick={onClear}
          className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
        >
          <X className="h-3.5 w-3.5" />
          Remove
        </button>
      </div>

      <div className="flex justify-center rounded-lg bg-gray-100 p-3">
        <img
          src={image.dataUrl}
          alt="Uploaded sticky trap preview"
          className="max-h-80 w-auto rounded-md object-contain"
        />
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
        <span className="truncate font-medium text-gray-700">
          {image.name}
        </span>

        <span className="ml-3 shrink-0">
          {formatFileSize(image.size)}
        </span>
      </div>
    </div>
  );
}

/* ============================================================
   ERROR
============================================================ */

function ErrorBanner({ message }) {
  if (!message) return null;

  return (
    <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />

      <div>
        <p className="text-sm font-semibold text-red-800">
          Detection failed
        </p>

        <p className="mt-1 text-sm text-red-700">
          {message}
        </p>
      </div>
    </div>
  );
}

/* ============================================================
   STAT CARD
============================================================ */

function StatCard({
  icon: Icon,
  label,
  value,
  unit,
  subtitle,
}) {
  return (
    <div className="ui-panel rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <Icon
          className="h-4 w-4 text-[#078b67]"
          strokeWidth={2}
        />

        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          {label}
        </span>
      </div>

      <div className="mt-3 flex items-baseline gap-1">
        <span className="text-3xl font-bold tracking-tight text-gray-900">
          {value}
        </span>

        {unit && (
          <span className="text-sm font-medium text-gray-500">
            {unit}
          </span>
        )}
      </div>

      {subtitle && (
        <p className="mt-1 text-xs text-gray-400">
          {subtitle}
        </p>
      )}
    </div>
  );
}

/* ============================================================
   MANUAL RESULT
============================================================ */

function ResultSection({ result }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
      <div className="mb-4 flex items-center gap-2">
        <CheckCircle2 className="h-5 w-5 text-[#078b67]" />

        <h2 className="text-base font-bold text-gray-900">
          Detection Result
        </h2>
      </div>

      <div className="flex justify-center rounded-lg bg-gray-100 p-3">
        <img
          src={`${result.annotatedImage}?t=${Date.now()}`}
          alt="Annotated detection result"
          className="max-h-96 w-full rounded-md object-contain"
          onError={(e) => {
            console.error(
              "Failed to load annotated image:",
              result.annotatedImage
            );
            e.currentTarget.style.display = "none";
          }}
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          icon={Bug}
          label="Total Insects"
          value={result.totalInsects}
        />

        <StatCard
          icon={Target}
          label="Avg. Confidence"
          value={result.avgConfidence}
          unit="%"
        />

        <StatCard
          icon={Clock}
          label="Processing Time"
          value={result.processingTime}
          unit="ms"
        />
      </div>
    </section>
  );
}

/* ============================================================
   FILTERS
============================================================ */

function DashboardFilters({
  devices,
  selectedDevice,
  setSelectedDevice,
  period,
  setPeriod,
  activeDevice,
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
            Device
          </label>

          <select
            value={selectedDevice}
            onChange={(e) =>
              setSelectedDevice(e.target.value)
            }
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-[#078b67]"
          >
            {!activeDevice && (
              <option value="all">
                All Devices
              </option>
            )}

            {devices.map((device) => (
              <option key={device} value={device}>
                {device}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
            Period
          </label>

          <select
            value={period}
            onChange={(e) =>
              setPeriod(e.target.value)
            }
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-[#078b67]"
          >
            <option value="today">Today</option>
            <option value="7">Last 7 Days</option>
            <option value="30">Last 30 Days</option>
            <option value="all">All Time</option>
          </select>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   CHART CARD
============================================================ */

function ChartCard({
  title,
  subtitle,
  children,
}) {
  return (
    <div className="ui-panel rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-5">
        <h3 className="font-bold text-gray-900">
          {title}
        </h3>

        <p className="mt-1 text-xs text-gray-500">
          {subtitle}
        </p>
      </div>

      <div className="h-72">
        {children}
      </div>
    </div>
  );
}

/* ============================================================
   IMAGE PLACEHOLDER
============================================================ */

function ImagePlaceholder() {
  return (
    <div className="flex h-64 items-center justify-center rounded-lg bg-gray-100 text-sm text-gray-400">
      Image unavailable
    </div>
  );
}

/* ============================================================
   DEVELOPER MODE CONTROL
============================================================ */

const isDeveloperModeConnectionError = (message = "") => {
  const normalized = String(message).toLowerCase();
  return [
    "not reachable by ssh",
    "ssh connection",
    "connection refused",
    "connection reset",
    "connection timed out",
    "timed out",
    "network is unreachable",
    "no route to host",
    "host is down",
    "could not resolve hostname",
    "name or service not known",
    "temporary failure in name resolution",
    "unreachable",
    "tailscale",
  ].some((indicator) => normalized.includes(indicator));
};

const developerModeOfflineMessage = (deviceId) =>
  `${deviceId} Offline\n\nThe Raspberry Pi is not reachable. Please check that the Pi is powered on and connected to the network.`;

function DeveloperModeControl({ activeDevice, onModeChange }) {
  const [developerMode, setDeveloperMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [password, setPassword] = useState("");
  const [action, setAction] = useState("enable");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const deviceId = activeDevice?.device_id;

  const loadDeveloperMode = async () => {
    if (!deviceId) return;

    try {
      setChecking(true);

      const response = await fetch(
        `${API_BASE}/devices/${encodeURIComponent(deviceId)}/developer-mode`
      );

      if (!response.ok) {
        throw new Error(`Developer mode API returned ${response.status}`);
      }

      const data = await response.json();
      const enabled = Boolean(data.developer_mode);
      setDeveloperMode(enabled);
      onModeChange?.(enabled);
    } catch (err) {
      console.error("Developer mode status error:", err);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    loadDeveloperMode();

    const interval = setInterval(loadDeveloperMode, REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, [deviceId]);

  const openModal = () => {
    setAction(developerMode ? "disable" : "enable");
    setPassword("");
    setError("");
    setMessage("");
    setShowModal(true);
  };

  const closeModal = () => {
    if (loading) return;
    setShowModal(false);
    setPassword("");
    setError("");
    setMessage("");
  };

  const submitDeveloperMode = async (event) => {
    event.preventDefault();

    if (!deviceId || loading) return;

    if (!password.trim()) {
      setError("Enter the developer mode password.");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `${API_BASE}/devices/${encodeURIComponent(deviceId)}/developer-mode`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            password,
            enabled: action === "enable",
          }),
        }
      );

      let data = null;
      try {
        data = await response.json();
      } catch {
        data = null;
      }

      if (!response.ok) {
        throw new Error(
          data?.detail ||
            data?.message ||
            `Developer mode request failed with status ${response.status}.`
        );
      }

      const enabled = Boolean(
        data?.developer_mode ?? (action === "enable")
      );

      setDeveloperMode(enabled);
      onModeChange?.(enabled);
      setMessage(
        enabled
          ? "Developer Mode enabled. Opening Manual Hardware Control..."
          : "Developer Mode disabled. The Raspberry Pi will shut down after it detects the OFF state."
      );
      setPassword("");

      if (enabled) {
        window.setTimeout(() => {
          window.open(`/manual-control/${encodeURIComponent(deviceId)}`, "_blank", "noopener,noreferrer");
        }, 250);
      }

      if (!enabled) {
        // Give the user a short confirmation before closing the dialog.
        setTimeout(() => {
          setShowModal(false);
          setMessage("");
        }, 1800);
      }
    } catch (err) {
      console.error("Developer mode update error:", err);
      const rawMessage =
        err instanceof TypeError
          ? "Unable to connect to the monitoring server."
          : err.message || "Could not update Developer Mode.";

      setError(
        isDeveloperModeConnectionError(rawMessage)
          ? developerModeOfflineMessage(deviceId)
          : rawMessage
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        disabled={checking}
        className={`inline-flex w-fit items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
          developerMode
            ? "border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
            : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
        }`}
      >
        <LockKeyhole className="h-4 w-4" />
        {checking
          ? "Checking..."
          : developerMode
            ? "Developer Mode ON"
            : "Developer Mode"}
      </button>

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="developer-mode-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeModal();
          }}
        >
          <form
            onSubmit={submitDeveloperMode}
            className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                    action === "enable"
                      ? "bg-emerald-50 text-[#078b67]"
                      : "bg-red-50 text-red-600"
                  }`}
                >
                  {action === "enable" ? (
                    <LockKeyhole className="h-5 w-5" />
                  ) : (
                    <Power className="h-5 w-5" />
                  )}
                </div>

                <div>
                  <h2
                    id="developer-mode-title"
                    className="text-base font-bold text-gray-900"
                  >
                    {action === "enable"
                      ? "Enable Developer Mode"
                      : "Disable Developer Mode"}
                  </h2>
                  <p className="mt-0.5 text-xs text-gray-500">
                    Device: {deviceId}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={loading}
                className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div
              className={`mt-5 rounded-xl border p-4 text-sm ${
                action === "enable"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-red-200 bg-red-50 text-red-800"
              }`}
            >
              {action === "enable" ? (
                <>
                  <p className="font-semibold">Developer access</p>
                  <p className="mt-1 text-xs leading-5">
                    The Pi will remain awake so you can access it for
                    development, maintenance and debugging.
                  </p>
                </>
              ) : (
                <>
                  <p className="font-semibold">Power-down request</p>
                  <p className="mt-1 text-xs leading-5">
                    After Developer Mode is turned OFF, the Pi's developer
                    monitor will detect the change and safely shut the Pi down.
                  </p>
                </>
              )}
            </div>

            <label className="mt-5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
              Developer Password
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoFocus
                autoComplete="current-password"
                placeholder="Enter password"
                className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-[#078b67] focus:ring-2 focus:ring-[#078b67]/10"
                disabled={loading}
              />
            </label>

            {error && (
              <div className="mt-3 whitespace-pre-line rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            {message && (
              <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                {message}
              </div>
            )}

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeModal}
                disabled={loading}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={loading || !password.trim()}
                className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-gray-400 ${
                  action === "enable"
                    ? "ui-accent-button bg-[#078b67] hover:bg-[#05694f]"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {loading
                  ? "Updating..."
                  : action === "enable"
                    ? "Enable Developer Mode"
                    : "Turn Off & Shut Down"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

function MonitoringDashboard({
  detections,
  loading,
  onRefresh,
  activeDevice,
  onChangeDevice,
  developerMode,
  onDeveloperModeChange,
}) {
  const [selectedDevice, setSelectedDevice] =
    useState(activeDevice?.device_id || "all");

  useEffect(() => {
    setSelectedDevice(
      activeDevice?.device_id || "all"
    );
  }, [activeDevice]);

  const [period, setPeriod] =
    useState("today");

  // Detection History: show only the latest 5 records by default.
  const [showAllHistory, setShowAllHistory] =
    useState(false);

  /* ----------------------------------------------------------
     Devices
  ---------------------------------------------------------- */

  const devices = useMemo(() => {
    return [
      ...new Set(
        detections
          .map((item) => item.device_id)
          .filter(Boolean)
      ),
    ].sort();
  }, [detections]);

  /* ----------------------------------------------------------
     Filter records
  ---------------------------------------------------------- */

  const filteredDetections = useMemo(() => {
    const now = new Date();

    let result = [...detections];

    if (selectedDevice !== "all") {
      result = result.filter(
        (item) =>
          item.device_id === selectedDevice
      );
    }

    if (period !== "all") {
      if (period === "today") {
        const start = new Date(now);
        start.setHours(0, 0, 0, 0);

        result = result.filter((item) => {
          const date = new Date(
            item.captured_at
          );

          return date >= start;
        });
      } else {
        const days = Number(period);

        const start = new Date(now);

        start.setDate(
          start.getDate() - days + 1
        );

        start.setHours(0, 0, 0, 0);

        result = result.filter((item) => {
          const date = new Date(
            item.captured_at
          );

          return date >= start;
        });
      }
    }

    return result;
  }, [
    detections,
    selectedDevice,
    period,
  ]);

  // Keep the history compact: latest 5 first, with optional expansion.
  const visibleHistory = useMemo(() => {
    return showAllHistory
      ? filteredDetections
      : filteredDetections.slice(0, 5);
  }, [filteredDetections, showAllHistory]);

  // Reset the expanded state whenever filters/device change.
  useEffect(() => {
    setShowAllHistory(false);
  }, [selectedDevice, period, activeDevice?.device_id]);

  /* ----------------------------------------------------------
     Statistics
  ---------------------------------------------------------- */

  const statistics = useMemo(() => {
    const counts =
      filteredDetections.map((item) =>
        Number(item.insect_count || 0)
      );

    const totalInsects = counts.reduce(
      (sum, value) => sum + value,
      0
    );

    const highest =
      counts.length > 0
        ? Math.max(...counts)
        : 0;

    const average =
      counts.length > 0
        ? totalInsects / counts.length
        : 0;

    const confidenceValues =
      filteredDetections
        .map((item) =>
          Number(
            item.average_confidence || 0
          )
        )
        .filter(
          (value) => value > 0
        );

    const averageConfidence =
      confidenceValues.length > 0
        ? confidenceValues.reduce(
            (sum, value) =>
              sum + value,
            0
          ) / confidenceValues.length
        : 0;

    return {
      totalInsects,
      highest,
      average,
      averageConfidence,
      images: filteredDetections.length,
    };
  }, [filteredDetections]);

  /* ----------------------------------------------------------
     Latest
  ---------------------------------------------------------- */

  const latest =
    filteredDetections[0];

  /* ----------------------------------------------------------
     Chart data (hourly or daily aggregation)
  ---------------------------------------------------------- */

  const chartData = useMemo(() => {
    return aggregateDetectionsByTime(
      filteredDetections,
      period
    );
  }, [filteredDetections, period]);

  /* ----------------------------------------------------------
     Render
  ---------------------------------------------------------- */

  return (
    <section className="mx-auto mt-8 w-full max-w-[1500px] px-4 sm:px-6 lg:px-8">
      {/* Dashboard Header */}
      <div className="mb-5 flex flex-col gap-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-[#078b67]" />
              <h2 className="text-xl font-bold tracking-tight text-gray-900">
                Monitoring Dashboard
              </h2>
            </div>

            <p className="mt-1 text-sm text-gray-500">
              Live detection data from Raspberry Pi devices
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </button>

            {activeDevice && (
              <>
                <DeveloperModeControl
                  activeDevice={activeDevice}
                  onModeChange={onDeveloperModeChange}
                />

                {developerMode && (
                  <button
                    type="button"
                    onClick={() =>
                      window.open(
                        `/manual-control/${encodeURIComponent(activeDevice.device_id)}`,
                        "_blank",
                        "noopener,noreferrer"
                      )
                    }
                    className="inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3.5 py-2.5 text-sm font-bold text-amber-800 shadow-sm transition hover:bg-amber-100"
                  >
                    <Cpu className="h-4 w-4" />
                    Manual Hardware Control
                  </button>
                )}

                <button
                  type="button"
                  onClick={onChangeDevice}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50"
                >
                  Change Device
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main dashboard + independent vertical status panel */}
      <div className="w-full">
        {/* Main dashboard content */}
        <div className="min-w-0">
          {/* Device activity */}
          {activeDevice && (
            <div className="mb-5 ui-panel rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#078b67]/[0.10]">
                    <Camera className="h-5 w-5 text-[#078b67]" />
                  </div>

                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">
                      Device Activity
                    </p>

                    <p className="mt-1 text-base font-bold text-gray-900">
                      {activeDevice.device_name ||
                        activeDevice.name ||
                        activeDevice.device_id}
                    </p>

                    <p className="mt-0.5 text-xs text-gray-500">
                      {activeDevice.device_id}
                      {activeDevice.location
                        ? ` · ${activeDevice.location}`
                        : ""}
                    </p>
                  </div>
                </div>

                <span className="inline-flex w-fit items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  ACTIVE
                </span>
              </div>
            </div>
          )}

      {/* Filters */}

      <DashboardFilters
        devices={devices}
        selectedDevice={selectedDevice}
        setSelectedDevice={
          setSelectedDevice
        }
        period={period}
        setPeriod={setPeriod}
        activeDevice={activeDevice}
      />

      {/* Summary */}

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Bug}
          label="Total Insects"
          value={
            statistics.totalInsects
          }
          subtitle="Selected period"
        />

        <StatCard
          icon={Trophy}
          label="Highest Detection"
          value={
            statistics.highest
          }
          subtitle="In one image"
        />

        <StatCard
          icon={Images}
          label="Images Processed"
          value={
            statistics.images
          }
          subtitle="Selected period"
        />

        <StatCard
          icon={Target}
          label="Average Confidence"
          value={(
            statistics.averageConfidence *
            100
          ).toFixed(1)}
          unit="%"
          subtitle="Model confidence"
        />
      </div>

      {/* Secondary statistics */}

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard
          icon={TrendingUp}
          label="Average Insects / Image"
          value={statistics.average.toFixed(1)}
        />

        <StatCard
          icon={Database}
          label="Records Available"
          value={detections.length}
          subtitle="Loaded from Supabase"
        />
      </div>

      {/* Charts */}

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-2">
        <ChartCard
          title="Insect Activity"
          subtitle="Detected insects over the selected period"
        >
          {chartData.length === 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <LineChart
                data={chartData}
                margin={{
                  top: 10,
                  right: 15,
                  left: 0,
                  bottom: 35,
                }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#e5e7eb"
                  vertical={false}
                />

                <XAxis
                  dataKey="label"
                  tick={{
                    fontSize: 12,
                    fill: "#6b7280",
                  }}
                  angle={period === "today" ? -45 : 0}
                  textAnchor={period === "today" ? "end" : "middle"}
                  height={period === "today" ? 80 : 40}
                />

                <YAxis
                  allowDecimals={false}
                  tick={{
                    fontSize: 12,
                    fill: "#6b7280",
                  }}
                  label={{
                    value: "Insect Count",
                    angle: -90,
                    position: "insideLeft",
                  }}
                />

                <Tooltip
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                    padding: "12px",
                  }}
                  labelStyle={{
                    color: "#1f2937",
                    fontWeight: "600",
                  }}
                  formatter={(value) => {
                    if (value === null || value === undefined) {
                      return "No data";
                    }
                    return [`${value}`, "Insects"];
                  }}
                  labelFormatter={(label) => {
                    return `${label}`;
                  }}
                />

                <Line
                  type="monotone"
                  dataKey="insects"
                  stroke="#078b67"
                  strokeWidth={2.5}
                  dot={{
                    r: 4,
                    fill: "#078b67",
                  }}
                  activeDot={{
                    r: 6,
                    fill: "#1e5c1e",
                  }}
                  isAnimationActive={true}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard
          title="Detection Confidence"
          subtitle="Average model confidence over the selected period"
        >
          {chartData.length === 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <BarChart
                data={chartData}
                margin={{
                  top: 10,
                  right: 15,
                  left: 0,
                  bottom: 35,
                }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#e5e7eb"
                  vertical={false}
                />

                <XAxis
                  dataKey="label"
                  tick={{
                    fontSize: 12,
                    fill: "#6b7280",
                  }}
                  angle={period === "today" ? -45 : 0}
                  textAnchor={period === "today" ? "end" : "middle"}
                  height={period === "today" ? 80 : 40}
                />

                <YAxis
                  domain={[0, 100]}
                  tick={{
                    fontSize: 12,
                    fill: "#6b7280",
                  }}
                  label={{
                    value: "Confidence (%)",
                    angle: -90,
                    position: "insideLeft",
                  }}
                />

                <Tooltip
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                    padding: "12px",
                  }}
                  labelStyle={{
                    color: "#1f2937",
                    fontWeight: "600",
                  }}
                  formatter={(value) => {
                    if (value === null || value === undefined) {
                      return "No data";
                    }
                    return [`${value}%`, "Average confidence"];
                  }}
                  labelFormatter={(label) => {
                    return `${label}`;
                  }}
                />

                <Bar
                  dataKey="confidence"
                  fill="#078b67"
                  radius={[6, 6, 0, 0]}
                  isAnimationActive={true}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* Latest Detection */}

      {latest && (
        <div className="mt-5 ui-panel rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-bold text-gray-900">
                Latest Detection
              </h3>

              <p className="mt-1 text-xs text-gray-500">
                {latest.device_id ||
                  "Unknown device"}
                {" · "}
                {formatDate(
                  latest.captured_at
                )}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                Recorded
              </span>

              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
                {latest.insect_count} insects
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Original Image
              </p>

              {latest.original_image_url ? (
                <a
                  href={
                    latest.original_image_url
                  }
                  target="_blank"
                  rel="noreferrer"
                >
                  <img
                    src={
                      latest.original_image_url
                    }
                    alt="Original trap"
                    className="max-h-96 w-full cursor-pointer rounded-lg bg-gray-100 object-contain hover:opacity-95"
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                </a>
              ) : (
                <ImagePlaceholder />
              )}
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Detection Result
              </p>

              {latest.result_image_url ? (
                <a
                  href={
                    latest.result_image_url
                  }
                  target="_blank"
                  rel="noreferrer"
                >
                  <img
                    src={
                      latest.result_image_url
                    }
                    alt="Detection result"
                    className="max-h-96 w-full cursor-pointer rounded-lg bg-gray-100 object-contain hover:opacity-95"
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                </a>
              ) : (
                <ImagePlaceholder />
              )}
            </div>
          </div>
        </div>
      )}

      {/* History */}

      <div className="mt-5 ui-panel rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-2 border-b border-gray-200 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-bold text-gray-900">
              Detection History
            </h3>

            <p className="mt-1 text-xs text-gray-500">
              Latest processed images
            </p>
          </div>

          <span className="text-xs font-medium text-gray-400">
            {filteredDetections.length > 5
              ? showAllHistory
                ? `Showing all ${filteredDetections.length} records`
                : `Showing 5 of ${filteredDetections.length} records`
              : `Showing ${filteredDetections.length} records`}
          </span>
        </div>

        {loading &&
        detections.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">
            Loading detection data...
          </div>
        ) : filteredDetections.length ===
          0 ? (
          <div className="p-8 text-center text-sm text-gray-500">
            No detection records found for the selected filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-5 py-3">
                    Time
                  </th>

                  <th className="px-5 py-3">
                    Device
                  </th>

                  <th className="px-5 py-3">
                    Insects
                  </th>

                  <th className="px-5 py-3">
                    Confidence
                  </th>

                  <th className="px-5 py-3">
                    Processing
                  </th>

                  <th className="px-5 py-3">
                    Result
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {visibleHistory.map(
                  (item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-gray-50"
                    >
                      <td className="whitespace-nowrap px-5 py-4 text-gray-700">
                        {formatDate(
                          item.captured_at
                        )}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 font-medium text-gray-800">
                        {item.device_id ||
                          "—"}
                      </td>

                      <td className="px-5 py-4">
                        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                          {item.insect_count}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-gray-700">
                        {(
                          Number(
                            item.average_confidence ||
                              0
                          ) * 100
                        ).toFixed(1)}
                        %
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-gray-600">
                        {item.processing_time_ms
                          ? `${Math.round(
                              item.processing_time_ms
                            )} ms`
                          : "—"}
                      </td>

                      <td className="px-5 py-4">
  <div className="flex items-center gap-3 whitespace-nowrap">
    {item.result_image_url ? (
      <a
        href={item.result_image_url}
        target="_blank"
        rel="noreferrer"
        className="font-semibold text-[#078b67] hover:underline"
      >
        View result
      </a>
    ) : (
      <span className="text-gray-400">Result unavailable</span>
    )}

    {item.original_image_url && (
      <>
        <span className="text-gray-300">|</span>

        <a
          href={item.original_image_url}
          target="_blank"
          rel="noreferrer"
          className="font-semibold text-[#078b67] hover:underline"
        >
          View original
        </a>
      </>
    )}
  </div>
</td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}

        {filteredDetections.length > 5 && (
          <div className="flex justify-center border-t border-gray-100 p-4">
            <button
              type="button"
              onClick={() =>
                setShowAllHistory((current) => !current)
              }
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-[#078b67] shadow-sm transition hover:border-[#078b67] hover:bg-emerald-50"
            >
              {showAllHistory
                ? "Show Less"
                : `View More (${filteredDetections.length - 5} more)`}
            </button>
          </div>
        )}
        </div>
        </div>

      </div>
    </section>
  );
}
function EmptyChart() {
  return (
    <div className="flex h-full items-center justify-center text-sm text-gray-400">
      No data available for this period.
    </div>
  );
}
function aggregateDetectionsByTime(records, period) {
  if (!records || records.length === 0) {
    return [];
  }

  const isHourly = period === "today";
  const bucketed = {};

  // Group records by hour (for today) or day (for other periods)
  records.forEach((record) => {
    if (!record.captured_at) return;

    const utcDate = new Date(record.captured_at);
    if (Number.isNaN(utcDate.getTime())) return;

    let key;
    let displayLabel;

    if (isHourly) {
      // For hourly aggregation, get the hour in Asia/Kolkata timezone
      const hourFormatter = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        hour12: true,
      });

      const parts = hourFormatter.formatToParts(utcDate);
      const partsObj = {};
      parts.forEach((p) => {
        partsObj[p.type] = p.value;
      });

      // Create a key for unique hours: YYYY-MM-DD-HH (24-hour for grouping)
      const hour24 = new Date(
        partsObj.year,
        Number(partsObj.month) - 1,
        Number(partsObj.day),
        partsObj.hour === "12" && partsObj.dayperiod === "AM" 
          ? 0 
          : partsObj.hour === "12" 
            ? 12 
            : Number(partsObj.hour) + (partsObj.dayperiod === "PM" ? 12 : 0)
      );
      
      key = hour24.toISOString().slice(0, 13); // "2026-08-14T15"
      displayLabel = `${partsObj.hour}:00 ${partsObj.dayperiod}`; // e.g., "05:00 PM"
    } else {
      // For daily aggregation, get the date in Asia/Kolkata timezone
      const dayFormatter = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "short",
        day: "numeric",
      });

      displayLabel = dayFormatter.format(utcDate);
      key = displayLabel; // Use display label as key for daily
    }

    if (!bucketed[key]) {
      bucketed[key] = {
        label: displayLabel,
        insects: 0,
        confidenceValues: [],
      };
    }

    bucketed[key].insects += Number(record.insect_count || 0);

    const confidence = Number(record.average_confidence || 0);
    if (confidence > 0) {
      bucketed[key].confidenceValues.push(confidence);
    }
  });

  // Convert to array and calculate averages
  return Object.values(bucketed)
    .map((item) => {
      const avgConfidence =
        item.confidenceValues.length > 0
          ? Number(
              (
                (item.confidenceValues.reduce(
                  (sum, val) => sum + val,
                  0
                ) / item.confidenceValues.length) * 100
              ).toFixed(1)
            )
          : null;

      return {
        label: item.label,
        insects: item.insects,
        confidence: avgConfidence,
      };
    })
    .sort((a, b) => {
      // Sort chronologically if we have time data to extract
      // For hourly, both should have HH:MM format
      // For daily, both should have "MMM DD" format
      if (isHourly) {
        // Extract hour from "HH:MM AM/PM" format
        const getHourValue = (label) => {
          const match = label.match(/(\d+):00\s(AM|PM)/);
          if (!match) return 0;
          let hour = Number(match[1]);
          if (match[2] === "PM" && hour !== 12) hour += 12;
          if (match[2] === "AM" && hour === 12) hour = 0;
          return hour;
        };
        return getHourValue(a.label) - getHourValue(b.label);
      } else {
        // For dates, maintain insertion order (they're typically reverse chronological from DB)
        return 0;
      }
    });
}
function formatFileSize(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(
    bytes /
    (1024 * 1024)
  ).toFixed(2)} MB`;
}

function formatDate(value) {
  if (!value) {
    return "Unknown";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString([], {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

function DashboardApp() {
  const getInitialActiveDevice = () => {
    try {
      const saved =
        sessionStorage.getItem("activeMonitoringDevice") ||
        localStorage.getItem("activeMonitoringDevice");

      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.device_id) return parsed;
      }
    } catch (err) {
      console.debug("Could not restore saved device:", err);
    }

    const params = new URLSearchParams(window.location.search);
    const deviceId = params.get("device");

    return deviceId ? { device_id: deviceId } : null;
  };

  const [activeDevice, setActiveDevice] =
    useState(getInitialActiveDevice);

  const [image, setImage] =
    useState(null);

  const [detecting, setDetecting] =
    useState(false);

  const [result, setResult] =
    useState(null);

  const [error, setError] =
    useState("");

  const [detections, setDetections] =
    useState([]);

  const [
    loadingDetections,
    setLoadingDetections,
  ] = useState(false);

  const [developerMode, setDeveloperMode] = useState(false);

  const handleDeveloperModeChange = (enabled) => {
    setDeveloperMode(Boolean(enabled));
  };

  /* ----------------------------------------------------------
     Real SSH connectivity for Developer Mode status
     This checks the backend connectivity endpoint, which performs
     the actual FastAPI -> Raspberry Pi SSH check.
  ---------------------------------------------------------- */
  const [sshConnected, setSshConnected] = useState(false);

  useEffect(() => {
    const deviceId = activeDevice?.device_id;

    if (!deviceId || !developerMode) {
      setSshConnected(false);
      return;
    }

    let mounted = true;

    const checkSSH = async () => {
      try {
        const response = await fetch(
          `${API_BASE}/devices/${encodeURIComponent(deviceId)}/connectivity`
        );

        if (!response.ok) {
          throw new Error(`SSH connectivity check failed: ${response.status}`);
        }

        const data = await response.json();

        if (mounted) {
          setSshConnected(Boolean(data?.online));
        }
      } catch (error) {
        if (mounted) {
          setSshConnected(false);
        }
        console.debug("SSH connectivity check failed:", error);
      }
    };

    // Check once when Developer Mode is enabled or the selected device changes.
    // Do not poll continuously.
    checkSSH();

    return () => {
      mounted = false;
    };
  }, [activeDevice?.device_id, developerMode]);

  /* ----------------------------------------------------------
     Device session
  ---------------------------------------------------------- */

  useEffect(() => {
    let cancelled = false;

    const restoreDevice = async () => {
      try {
        const saved =
          sessionStorage.getItem("activeMonitoringDevice") ||
          localStorage.getItem("activeMonitoringDevice");

        const params = new URLSearchParams(window.location.search);
        const queryDeviceId = params.get("device");

        if (!saved && !queryDeviceId) return;

        const savedDevice = saved
          ? JSON.parse(saved)
          : { device_id: queryDeviceId };

        if (!savedDevice?.device_id) return;

        const response = await fetch(
          `${DEVICES_ENDPOINT}/${encodeURIComponent(
            savedDevice.device_id
          )}`
        );

        if (!response.ok) return;

        const data = await response.json();

        if (
          !cancelled &&
          data.success &&
          data.registered
        ) {
          setActiveDevice(data.device);

          const serializedDevice = JSON.stringify(data.device);

          sessionStorage.setItem(
            "activeMonitoringDevice",
            serializedDevice
          );

          localStorage.setItem(
            "activeMonitoringDevice",
            serializedDevice
          );
        } else if (!cancelled) {
          sessionStorage.removeItem(
            "activeMonitoringDevice"
          );
        }
      } catch (err) {
        console.warn(
          "Could not validate saved device session:",
          err
        );

        if (!cancelled) {
          sessionStorage.removeItem(
            "activeMonitoringDevice"
          );
        }
      }
    };

    restoreDevice();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleDeviceSelect = (device) => {
    setActiveDevice(device);

    const serializedDevice = JSON.stringify(device);

    sessionStorage.setItem(
      "activeMonitoringDevice",
      serializedDevice
    );

    localStorage.setItem(
      "activeMonitoringDevice",
      serializedDevice
    );
  };

  const handleDeviceLogout = () => {
    setDeveloperMode(false);
    setActiveDevice(null);
    sessionStorage.removeItem(
      "activeMonitoringDevice"
    );
    localStorage.removeItem(
      "activeMonitoringDevice"
    );
  };

  /* ----------------------------------------------------------
     Supabase
  ---------------------------------------------------------- */

  const loadDetections = async () => {
    setLoadingDetections(true);

    try {
      const {
        data,
        error: supabaseError,
      } = await supabase
        .from("detections")
        .select(
          `
          id,
          device_id,
          captured_at,
          original_image_url,
          result_image_url,
          insect_count,
          average_confidence,
          processing_time_ms
          `
        )
        .order("captured_at", {
          ascending: false,
        })
        .limit(100);

      if (supabaseError) {
        throw supabaseError;
      }

      const deviceData = activeDevice
        ? (data || []).filter(
            (item) =>
              item.device_id ===
              activeDevice.device_id
          )
        : [];

      setDetections(deviceData);
    } catch (err) {
      console.error(
        "Failed to load detections:",
        err
      );
    } finally {
      setLoadingDetections(false);
    }
  };

  /* ----------------------------------------------------------
     Initial load + auto refresh
  ---------------------------------------------------------- */

  useEffect(() => {
    if (!activeDevice) {
      setDetections([]);
      return undefined;
    }

    loadDetections();

    const interval = setInterval(() => {
      loadDetections();
    }, REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, [activeDevice?.device_id]);

  /* ----------------------------------------------------------
     Manual upload
  ---------------------------------------------------------- */

  const handleFileSelected = (
    imgData
  ) => {
    setImage(imgData);
    setResult(null);
    setError("");
  };

  const handleClear = () => {
    setImage(null);
    setResult(null);
    setError("");
  };

  /* ----------------------------------------------------------
     Manual detection
  ---------------------------------------------------------- */

  const handleDetect = async () => {
    if (!image || detecting) {
      return;
    }

    setDetecting(true);
    setError("");
    setResult(null);

    try {
      const blobResponse =
        await fetch(image.dataUrl);

      if (!blobResponse.ok) {
        throw new Error(
          "Could not read the selected image."
        );
      }

      const blob =
        await blobResponse.blob();

      const formData =
        new FormData();

      formData.append(
        "file",
        blob,
        image.name
      );

      const response =
        await fetch(
          DETECT_ENDPOINT,
          {
            method: "POST",
            body: formData,
          }
        );

      if (!response.ok) {
        throw new Error(
          `The detection server responded with status ${response.status}.`
        );
      }

      const data =
        await response.json();

      if (
        typeof data.count ===
          "undefined" ||
        typeof data.confidence ===
          "undefined" ||
        typeof data.processing_time_ms ===
          "undefined"
      ) {
        throw new Error(
          "The detection server returned an unexpected response."
        );
      }

      // Supabase result image is now the primary source.
      const resultImage =
        data.result_image_url
          ? data.result_image_url
          : data.cloudinary_image
            ? data.cloudinary_image
            : data.image
              ? `${API_BASE}${data.image}`
              : null;

      if (!resultImage) {
        throw new Error(
          "Detection completed, but no result image URL was returned."
        );
      }

      setResult({
        annotatedImage:
          resultImage,

        totalInsects:
          data.count,

        avgConfidence: (
          data.confidence * 100
        ).toFixed(1),

        processingTime: Math.round(
          data.processing_time_ms
        ),
      });

      setTimeout(
        loadDetections,
        1000
      );
    } catch (err) {
      console.error(
        "Detection error:",
        err
      );

      if (
        err instanceof TypeError
      ) {
        setError(
          "Unable to connect to the detection server. Start the backend and try again."
        );
      } else {
        setError(
          err.message ||
            "Something went wrong."
        );
      }
    } finally {
      setDetecting(false);
    }
  };

  /* ----------------------------------------------------------
     UI
  ---------------------------------------------------------- */

  if (!activeDevice) {
    return (
      <DeviceSelection
        onSelect={handleDeviceSelect}
      />
    );
  }

  return (
    <div className="ui-shell min-h-screen bg-gray-50 text-gray-900">
      <style>{`
        @import url('https://cdn.jsdelivr.net/npm/@fontsource/inter@5.0.16/index.min.css');

        body {
          font-family:
            'Inter',
            ui-sans-serif,
            system-ui,
            -apple-system,
            sans-serif;
        }
      `}</style>

      <Header />

      <main className="ui-container mx-auto flex max-w-7xl flex-col items-center px-4 py-10 sm:px-6">
        {/* ====================================================
            MANUAL TESTING
        ==================================================== */}

        <div className="grid w-full max-w-[1500px] grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_190px]">
        <div className="ui-panel w-full max-w-5xl rounded-2xl border border-gray-200 bg-white/90 p-6 shadow-sm backdrop-blur-sm sm:p-8">
          <div className="mb-6 border-b border-gray-100 pb-5">
            <h2 className="ui-eyebrow text-xs font-bold uppercase tracking-[0.16em] text-gray-700">
              Manual Image Detection
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Upload a trap image to test the current detection model manually.
            </p>
          </div>

          <div className="space-y-6">
            <UploadZone
              onFileSelected={
                handleFileSelected
              }
              hasImage={!!image}
            />

            {image && (
              <PreviewPanel
                image={image}
                onClear={handleClear}
              />
            )}

            {image && (
              <button
                type="button"
                onClick={handleDetect}
                disabled={detecting}
                className={`flex w-full items-center justify-center gap-2 rounded-xl px-6 py-4 text-base font-bold text-white ${
                  detecting
                    ? "cursor-not-allowed bg-gray-400"
                    : "ui-accent-button bg-[#078b67] hover:bg-[#05694f]"
                }`}
              >
                <ScanSearch className="h-5 w-5" />

                {detecting
                  ? "Detecting..."
                  : "Detect Insects"}
              </button>
            )}

            <ErrorBanner
              message={error}
            />

            {result && (
              <ResultSection
                result={result}
              />
            )}
          </div>
        </div>

                {/* Independent vertical status panel */}
        {activeDevice && (
          <aside className="order-first lg:order-none lg:sticky lg:top-5">
            <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
              <div className="mb-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  System Status
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-800">
                  {activeDevice.device_name ||
                    activeDevice.name ||
                    activeDevice.device_id}
                </p>
              </div>

              <div className="space-y-3">
                {developerMode ? (
                  <>
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-2.5">
                      <div className="flex items-start gap-3">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white text-emerald-700 shadow-sm">
                          <Cpu className="h-3.5 w-3.5" />
                        </div>
                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-700">
                            Device
                          </p>
                          <p className="mt-1 text-sm font-bold text-emerald-800">
                            DEVELOPER MODE
                          </p>
                        </div>
                      </div>
                    </div>

                    <div
                      className={`rounded-xl border p-4 ${
                        sshConnected
                          ? "border-emerald-200 bg-emerald-50/60"
                          : "border-red-200 bg-red-50/60"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white shadow-sm ${
                            sshConnected
                              ? "text-emerald-700"
                              : "text-red-600"
                          }`}
                        >
                          {sshConnected ? (
                            <Wifi className="h-4 w-4" />
                          ) : (
                            <WifiOff className="h-4 w-4" />
                          )}
                        </div>
                        <div>
                          <p
                            className={`text-[11px] font-bold uppercase tracking-wide ${
                              sshConnected
                                ? "text-emerald-700"
                                : "text-red-700"
                            }`}
                          >
                            SSH
                          </p>
                          <p
                            className={`mt-1 text-sm font-bold ${
                              sshConnected
                                ? "text-emerald-800"
                                : "text-red-800"
                            }`}
                          >
                            {sshConnected ? "CONNECTED" : "DISCONNECTED"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-dashed border-slate-200 pt-4">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.10)]" />
                        <span className="text-sm text-slate-600">
                          Developer Mode:
                        </span>
                        <span className="text-xs font-bold text-emerald-700">
                          ACTIVE
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-2.5">
                      <div className="flex items-start gap-3">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white text-emerald-700 shadow-sm">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        </div>
                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-700">
                            Device
                          </p>
                          <p className="mt-1 text-sm font-bold text-emerald-800">
                            ACTIVE
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
                      <div className="flex items-start gap-3">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white text-slate-400 shadow-sm">
                          <WifiOff className="h-3.5 w-3.5" />
                        </div>
                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                            LTE
                          </p>
                          <p className="mt-1 text-sm font-bold text-slate-500">
                            DISCONNECTED
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-dashed border-slate-200 pt-4">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                        <span className="text-sm text-slate-600">
                          Developer Mode:
                        </span>
                        <span className="text-xs font-bold text-slate-400">
                          INACTIVE
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </aside>
        )}

      </div>

        {/* ====================================================
            MONITORING DASHBOARD
        ==================================================== */}

        <MonitoringDashboard
          detections={detections}
          loading={loadingDetections}
          onRefresh={() => {
            loadDetections();
          }}
          activeDevice={activeDevice}
          onChangeDevice={handleDeviceLogout}
          developerMode={developerMode}
          onDeveloperModeChange={handleDeveloperModeChange}
        />

        <p className="mt-8 text-xs text-gray-400">
          Developed By Ambady S
        </p>
      </main>
    </div>
  );
}

export default DashboardApp;
