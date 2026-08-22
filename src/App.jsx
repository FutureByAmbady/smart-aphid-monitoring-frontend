import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Bug,
  UploadCloud,
  ScanSearch,
  Clock,
  Target,
  X,
  CheckCircle2,
  FileImage,
  AlertTriangle,
  RefreshCw,
  Database,
  Camera,
  TrendingUp,
  Trophy,
  Images,
  Activity,
} from "lucide-react";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
} from "recharts";

import { supabase } from "./lib/supabase";

/* ============================================================
   CONFIG
============================================================ */

const API_BASE = "http://127.0.0.1:8000";
const DETECT_ENDPOINT = `${API_BASE}/detect`;
const DEVICES_ENDPOINT = `${API_BASE}/devices`;

const REFRESH_INTERVAL = 15000;

/* ============================================================
   DEVICE ACCESS / SELECTION
============================================================ */

function DeviceSelection({ onSelect }) {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDevices = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(DEVICES_ENDPOINT);
      if (!response.ok) {
        throw new Error(
          `Device server responded with status ${response.status}.`
        );
      }
      const data = await response.json();
      console.log("Devices API response:", data);

      // Support both wrapped and legacy array responses.
      const deviceList = Array.isArray(data)
        ? data
        : data.devices;

      if (!Array.isArray(deviceList)) {
        throw new Error(
          "Invalid device data received from the server."
        );
      }
      setDevices(deviceList);
    } catch (err) {
      console.error("Device loading error:", err);

      if (err instanceof TypeError) {
        setError(
          "Unable to connect to the monitoring server. Please start the backend and try again."
        );
      } else {
        setError(
          err.message || "Could not load monitoring devices."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDevices();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
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

      <main className="mx-auto flex min-h-[calc(100vh-89px)] max-w-5xl flex-col justify-center px-6 py-12">
        <div className="mx-auto w-full max-w-4xl">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#2E7D32] shadow-sm">
              <Camera className="h-7 w-7 text-white" />
            </div>

            <h2 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
              Select Monitoring Device
            </h2>

            <p className="mx-auto mt-2 max-w-xl text-sm text-gray-500">
              Select a registered monitoring system to access its detection and telemetry data.
            </p>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-sm">
              <RefreshCw className="mx-auto h-6 w-6 animate-spin text-[#2E7D32]" />
              <p className="mt-3 text-sm font-medium text-gray-600">
                Checking registered devices...
              </p>
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
              <AlertTriangle className="mx-auto h-8 w-8 text-red-600" />
              <p className="mt-3 text-sm font-semibold text-red-800">
                Unable to load devices
              </p>
              <p className="mx-auto mt-1 max-w-lg text-sm text-red-700">
                {error}
              </p>

              <button
                type="button"
                onClick={loadDevices}
                className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#2E7D32] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#256628]"
              >
                <RefreshCw className="h-4 w-4" />
                Try Again
              </button>
            </div>
          ) : devices.length === 0 ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-sm">
              <Database className="mx-auto h-8 w-8 text-gray-400" />
              <p className="mt-3 text-sm font-semibold text-gray-800">
                No monitoring devices registered
              </p>
              <p className="mt-1 text-sm text-gray-500">
                Register a device in the database before accessing the
                monitoring dashboard.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {devices.map((device) => {
                const online = device.status === "online";

                return (
                  <div
                    key={device.device_id}
                    className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#2E7D32] hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#2E7D32]/10">
                        <Camera className="h-5 w-5 text-[#2E7D32]" />
                      </div>

                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                          online
                            ? "bg-green-50 text-green-700"
                            : "bg-red-50 text-red-700"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            online ? "bg-green-500" : "bg-red-500"
                          }`}
                        />
                        {online ? "ONLINE" : "OFFLINE"}
                      </span>
                    </div>

                    <div className="mt-5">
                      <h3 className="text-base font-bold text-gray-900">
                        {device.device_name || "Unnamed Device"}
                      </h3>

                      <p className="mt-1 text-xs font-medium text-gray-500">
                        {device.device_id}
                      </p>

                      <p className="mt-3 text-sm text-gray-600">
                        {device.location || "Location not specified"}
                      </p>
                    </div>

                    <div className="mt-5 border-t border-gray-100 pt-4">
                      <button
                        type="button"
                        onClick={() => onSelect(device)}
                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#2E7D32] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#256628]"
                      >
                        Open Device
                        <span aria-hidden="true">→</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <p className="mt-8 text-center text-xs text-gray-400">
            Device status indicates the current communication state. Offline devices remain accessible and display their latest available data.
          </p>
        </div>
      </main>
    </div>
  );
}

/* ============================================================
   HEADER
============================================================ */

function Header() {
  return (
    <header className="w-full border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-6 py-5">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#2E7D32]">
          <Bug className="h-6 w-6 text-white" strokeWidth={2} />
        </div>

        <div>
          <h1 className="text-lg font-bold tracking-tight text-gray-900 sm:text-xl">
            Smart Aphid Monitoring System
          </h1>

          <p className="text-sm text-gray-500">
            AI-based Yellow Sticky Trap Insect Detection
          </p>
        </div>
      </div>
    </header>
  );
}

/* ============================================================
   UPLOAD ZONE
============================================================ */

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
            ? "border-[#2E7D32] bg-[#2E7D32]/5"
            : "border-gray-300 bg-white hover:border-gray-400"
        }`}
      >
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
          <UploadCloud
            className="h-7 w-7 text-[#2E7D32]"
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
          className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#2E7D32] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#256628]"
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
   TELEMETRY CARD
============================================================ */

function TelemetryCard({
  label,
  value,
  unit,
  subtitle,
  status,
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          {label}
        </p>
        {status && (
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              status === "good" ? "bg-green-500" : "bg-red-500"
            }`}
          />
        )}
      </div>

      <div className="mt-3 flex items-baseline gap-1">
        <span className="text-2xl font-bold text-gray-900">
          {value}
        </span>
        {unit && (
          <span className="text-sm font-semibold text-gray-500">
            {unit}
          </span>
        )}
      </div>

      <p className="mt-1 text-xs text-gray-400">
        {subtitle}
      </p>
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
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <Icon
          className="h-4 w-4 text-[#2E7D32]"
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
        <CheckCircle2 className="h-5 w-5 text-[#2E7D32]" />

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
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-[#2E7D32]"
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
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-[#2E7D32]"
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
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
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
   DASHBOARD
============================================================ */

function MonitoringDashboard({
  detections,
  loading,
  onRefresh,
  activeDevice,
  telemetry,
  loadingTelemetry,
  onChangeDevice,
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
    <section className="mt-10 w-full">
      {/* Header */}

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-[#2E7D32]" />

            <h2 className="text-lg font-bold text-gray-900">
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
            className="inline-flex w-fit items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                loading
                  ? "animate-spin"
                  : ""
              }`}
            />

            Refresh
          </button>

          {activeDevice && (
            <button
              type="button"
              onClick={onChangeDevice}
              className="inline-flex w-fit items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Change Device
            </button>
          )}
        </div>
      </div>

      {/* Active device */}

      {activeDevice && (
        <div className="mb-5 flex flex-col gap-3 rounded-xl border border-green-200 bg-green-50/60 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-sm">
              <Camera className="h-5 w-5 text-[#2E7D32]" />
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-green-700">
                Active Monitoring Device
              </p>
              <p className="mt-0.5 text-sm font-bold text-gray-900">
                {activeDevice.device_name} · {activeDevice.device_id}
              </p>
              <p className="text-xs text-gray-500">
                {activeDevice.location || "Location not specified"}
              </p>
            </div>
          </div>

          <span
            className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ${
              activeDevice.status === "online"
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                activeDevice.status === "online"
                  ? "bg-green-500"
                  : "bg-red-500"
              }`}
            />
            {activeDevice.status === "online" ? "ONLINE" : "OFFLINE"}
          </span>
        </div>
      )}

      {/* Device telemetry */}

      {activeDevice && (
        <div className="mb-5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-gray-900">
                Device Telemetry
              </h3>
              <p className="mt-1 text-xs text-gray-500">
                Latest data received from the monitoring device
              </p>
            </div>

            {telemetry?.received_at && (
              <span className="text-xs text-gray-400">
                Last update: {formatDate(telemetry.received_at)}
              </span>
            )}
          </div>

          {loadingTelemetry && !telemetry ? (
            <div className="rounded-xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-500 shadow-sm">
              Loading device telemetry...
            </div>
          ) : !telemetry ? (
            <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-6 text-center shadow-sm">
              <p className="text-sm font-semibold text-yellow-800">
                No telemetry data available
              </p>
              <p className="mt-1 text-xs text-yellow-700">
                Waiting for this device to send its first telemetry update.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <TelemetryCard
                label="Battery"
                value={
                  telemetry.battery_percentage != null
                    ? Number(telemetry.battery_percentage).toFixed(1)
                    : "—"
                }
                unit="%"
                subtitle="Battery level"
              />

              <TelemetryCard
                label="Temperature"
                value={
                  telemetry.temperature_c != null
                    ? Number(telemetry.temperature_c).toFixed(1)
                    : "—"
                }
                unit="°C"
                subtitle="Device temperature"
              />

              <TelemetryCard
                label="Humidity"
                value={
                  telemetry.humidity_percent != null
                    ? Number(telemetry.humidity_percent).toFixed(1)
                    : "—"
                }
                unit="%"
                subtitle="Relative humidity"
              />

              <TelemetryCard
                label="Signal"
                value={
                  telemetry.cellular_signal_dbm != null
                    ? Number(telemetry.cellular_signal_dbm).toFixed(0)
                    : "—"
                }
                unit="dBm"
                subtitle="Cellular signal"
              />

              <TelemetryCard
                label="Network"
                value={
                  telemetry.network_connected
                    ? "Connected"
                    : "Disconnected"
                }
                subtitle="Network status"
                status={
                  telemetry.network_connected ? "good" : "bad"
                }
              />
            </div>
          )}
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
                  stroke="#2E7D32"
                  strokeWidth={2.5}
                  dot={{
                    r: 4,
                    fill: "#2E7D32",
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
                  fill="#2E7D32"
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
        <div className="mt-5 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
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
              <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
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

      <div className="mt-5 rounded-2xl border border-gray-200 bg-white shadow-sm">
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
                        <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-bold text-green-700">
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
                        {item.result_image_url ? (
                          <a
                            href={
                              item.result_image_url
                            }
                            target="_blank"
                            rel="noreferrer"
                            className="font-semibold text-[#2E7D32] hover:underline"
                          >
                            View result
                          </a>
                        ) : (
                          "—"
                        )}
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
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-[#2E7D32] shadow-sm transition hover:border-[#2E7D32] hover:bg-green-50"
            >
              {showAllHistory
                ? "Show Less"
                : `View More (${filteredDetections.length - 5} more)`}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

/* ============================================================
   EMPTY CHART
============================================================ */

function EmptyChart() {
  return (
    <div className="flex h-full items-center justify-center text-sm text-gray-400">
      No data available for this period.
    </div>
  );
}

/* ============================================================
   AGGREGATION HELPER
============================================================ */

/**
 * Aggregates detection records by time (hourly or daily) using Asia/Kolkata timezone.
 * 
 * For "today": aggregates by hour (05 PM, 06 PM, etc.)
 * For other periods: aggregates by day (Aug 10, Aug 11, etc.)
 * 
 * @param {Array} records - Detection records from Supabase
 * @param {string} period - "today", "7", "30", or "all"
 * @returns {Array} Aggregated data points with labels, insects, confidence
 */
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

/* ============================================================
   UTILITIES
============================================================ */

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

/* ============================================================
   APP
============================================================ */

export default function App() {
  const [activeDevice, setActiveDevice] =
    useState(null);

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

  const [telemetry, setTelemetry] = useState(null);
  const [loadingTelemetry, setLoadingTelemetry] = useState(false);

  /* ----------------------------------------------------------
     Device session
  ---------------------------------------------------------- */

  useEffect(() => {
    let cancelled = false;

    const restoreDevice = async () => {
      try {
        const saved = sessionStorage.getItem(
          "activeMonitoringDevice"
        );

        if (!saved) return;

        const savedDevice = JSON.parse(saved);

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

          sessionStorage.setItem(
            "activeMonitoringDevice",
            JSON.stringify(data.device)
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

    sessionStorage.setItem(
      "activeMonitoringDevice",
      JSON.stringify(device)
    );
  };

  const handleDeviceLogout = () => {
    setActiveDevice(null);
    sessionStorage.removeItem(
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
     Device telemetry
  ---------------------------------------------------------- */

  const loadTelemetry = async () => {
    if (!activeDevice?.device_id) {
      setTelemetry(null);
      return;
    }

    setLoadingTelemetry(true);

    try {
      const response = await fetch(
        `${API_BASE}/devices/${encodeURIComponent(
          activeDevice.device_id
        )}/telemetry`
      );

      if (!response.ok) {
        throw new Error(
          `Telemetry API returned ${response.status}`
        );
      }

      const data = await response.json();

      if (data.success && data.telemetry) {
        setTelemetry(data.telemetry);
      } else {
        setTelemetry(null);
      }
    } catch (err) {
      console.error("Failed to load telemetry:", err);
      setTelemetry(null);
    } finally {
      setLoadingTelemetry(false);
    }
  };

  /* ----------------------------------------------------------
     Initial load + auto refresh
  ---------------------------------------------------------- */

  useEffect(() => {
    if (!activeDevice) {
      setDetections([]);
      setTelemetry(null);
      return undefined;
    }

    loadDetections();
    loadTelemetry();

    const interval = setInterval(() => {
      loadDetections();
      loadTelemetry();
    }, REFRESH_INTERVAL);

    return () =>
      clearInterval(interval);
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
    <div className="min-h-screen bg-gray-50 text-gray-900">
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

      <main className="mx-auto flex max-w-7xl flex-col items-center px-6 py-10">
        {/* ====================================================
            MANUAL TESTING
        ==================================================== */}

        <div className="w-full max-w-3xl rounded-2xl border border-gray-200 bg-gray-50 p-6 shadow-sm sm:p-8">
          <div className="mb-6">
            <h2 className="text-sm font-bold uppercase tracking-wide text-gray-700">
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
                    : "bg-[#2E7D32] hover:bg-[#256628]"
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

        {/* ====================================================
            MONITORING DASHBOARD
        ==================================================== */}

        <MonitoringDashboard
          detections={detections}
          loading={loadingDetections}
          onRefresh={() => {
            loadDetections();
            loadTelemetry();
          }}
          activeDevice={activeDevice}
          telemetry={telemetry}
          loadingTelemetry={loadingTelemetry}
          onChangeDevice={handleDeviceLogout}
        />

        <p className="mt-8 text-xs text-gray-400">
          Developed By Ambady S
        </p>
      </main>
    </div>
  );
}