import { useEffect, useState } from "react";
import { Camera, RefreshCw, AlertTriangle, Database } from "lucide-react";
import Header from "../components/Header";
import { DEVICES_ENDPOINT } from "../lib/config";

export default function DeviceSelection({ onSelect }) {
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

      <main className="ui-container mx-auto flex min-h-[calc(100vh-89px)] max-w-5xl flex-col justify-center px-6 py-12">
        <div className="mx-auto w-full max-w-4xl">
          <div className="mb-8 text-center">
            <div className="ui-accent-icon mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl shadow-sm">
              <Camera className="h-7 w-7 text-white" />
            </div>

            <h2 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
              Select Monitoring Device
            </h2>

            <p className="mx-auto mt-2 max-w-xl text-sm text-gray-500">
              Select a registered monitoring system to access its detection data.
            </p>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-sm">
              <RefreshCw className="mx-auto h-6 w-6 animate-spin text-[#078b67]" />
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
                className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#078b67] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#05694f]"
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
                    className="relative overflow-hidden ui-panel rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#078b67] hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#078b67]/[0.10]">
                        <Camera className="h-5 w-5 text-[#078b67]" />
                      </div>

                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                          online
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-red-50 text-red-700"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            online ? "bg-emerald-500" : "bg-red-500"
                          }`}
                        />
                        {online ? "ONLINE" : "OFFLINE"}
                      </span>
                    </div>

                    <div className="mt-5">
                      <h3 className="text-base font-bold text-gray-900">
                        {device.name ||
                          device.device_name ||
                          `Raspberry Pi 5 - ${device.device_id.replace("PI5-", "")}`}
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
                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#078b67] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#05694f]"
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
