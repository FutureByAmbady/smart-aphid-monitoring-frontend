import { useEffect, useState } from "react";
import {
  Activity, AlertTriangle, ArrowLeft, Camera, CheckCircle2, Crosshair, Cpu,
  Gauge, Home, Images, Power, Radio, ShieldAlert, Wind, Wifi, WifiOff,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { apiGet, apiPost, isApiConnectionError } from "../lib/api";
import BackendConnectionStatus from "../components/BackendConnectionStatus";

export default function DeveloperMode({ deviceId }) {
  const [mode, setMode] = useState(false);
  const [state, setState] = useState({
    roller: "off",

    // Existing manual motor
    motor: "stop",

    // Wind alignment
    alignment_status: "idle",
    homing: false,

    // Angle values
    current_angle: 0,
    target_angle: 0,
    wind_direction: null,

    // One physical home limit switch
    home_limit: false,

    // Encoder
    encoder: 0,

    // Camera
    camera: false,

    // Wind sensor data
    wind_kmh: 0,

    // Device status
    pi_online: false,
    esp32_online: false,

    // Emergency
    emergency_stop: false,
  });
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("System ready. Manual control active.");
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState("");
  const [captureUrl, setCaptureUrl] = useState("");
  const [monitorOpen, setMonitorOpen] = useState(true);
  const [targetAngleInput, setTargetAngleInput] = useState("");

  const addLog = (text, type = "info") => {
    setLogs((items) => [
      { id: `${Date.now()}-${Math.random()}`, text, type, time: new Date() },
      ...items,
    ].slice(0, 12));
  };

  const loadState = async () => {
    if (!deviceId) return;
    try {
      const response = await apiGet(
        `/devices/${encodeURIComponent(deviceId)}/manual-state`
      );
      if (!response.ok) return;
      const data = await response.json();
      if (data?.state) {
        const { pi_online, ...hardwareState } = data.state;
        setState((prev) => ({ ...prev, ...hardwareState }));
      }
      if (typeof data?.developer_mode === "boolean") setMode(data.developer_mode);
    } catch (err) {
      if (!isApiConnectionError(err)) {
        console.debug("Manual state unavailable:", err);
      }
    }
  };

  useEffect(() => {
    loadState();

    const timer = setInterval(
      loadState,
      1000
    );

    return () => clearInterval(timer);
  }, [deviceId]);

  // Check Pi connectivity once when the Manual Hardware Control page opens.
  // This is a direct FastAPI -> Raspberry Pi check and does not use last_seen
  // or write a heartbeat to Supabase.
  useEffect(() => {
    let mounted = true;

    apiGet(`/devices/${encodeURIComponent(deviceId)}/connectivity`)
      .then((response) => {
        if (!response.ok) throw new Error(`Connectivity check failed: ${response.status}`);
        return response.json();
      })
      .then((data) => {
        if (mounted && typeof data?.online === "boolean") {
          setState((prev) => ({ ...prev, pi_online: data.online }));
        }
      })
      .catch(() => {
        if (mounted) {
          setState((prev) => ({ ...prev, pi_online: false }));
        }
      });

    return () => { mounted = false; };
  }, [deviceId]);

  useEffect(() => {
    let mounted = true;
    apiGet(`/devices/${encodeURIComponent(deviceId)}/developer-mode`)
      .then((r) => r.json())
      .then((d) => {
        if (mounted) setMode(Boolean(d.developer_mode));
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, [deviceId]);

  const send = async (command, payload = {}) => {
    if (!deviceId || busy) return;

    setBusy(command);
    setError("");

    try {
      // ============================================================
      // COMMAND ROUTING
      // ============================================================
      // Keep the existing Supabase RPC routing for roller, camera,
      // and wind-alignment commands.
      //
      // emergency_stop is intentionally handled separately because
      // it is sent through the backend manual-command endpoint.

      const ROLLER_COMMANDS = new Set([
        "roller_on",
        "roller_off",
      ]);

      const CAMERA_COMMANDS = new Set([
        "camera_on",
        "camera_off",
        "capture",
      ]);

      const ALIGNMENT_COMMANDS = new Set([
        "align_angle",
        "align_wind",
        "home_alignment",
        "alignment_stop",
      ]);

      // ============================================================
      // EMERGENCY STOP
      // ============================================================
      // Emergency stop must never be sent to a camera/roller/
      // alignment RPC. It uses the backend manual-command route.
      if (command === "emergency_stop") {
        console.log(
          "[MANUAL CONTROL] Sending emergency_stop using manual-command endpoint"
        );

        const response = await apiPost(
          `/devices/${encodeURIComponent(deviceId)}/manual-command`,
          JSON.stringify({
            command: "emergency_stop",
            payload: payload || {},
          }),
          {
            headers: {
              "Content-Type": "application/json",
            },
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
              `Emergency stop request failed with status ${response.status}.`
          );
        }

        // If the backend immediately returned state, reflect it.
        if (data?.state && typeof data.state === "object") {
          setState((prev) => ({
            ...prev,
            ...data.state,
          }));
        }

        setMessage(
          data?.message || "EMERGENCY STOP command queued."
        );

        addLog(
          data?.message || "EMERGENCY STOP command queued.",
          "success"
        );

        // Refresh the real hardware state after the Pi has had time
        // to claim/process the command.
        await new Promise((resolve) => setTimeout(resolve, 500));
        await loadState();

        return;
      }

      // ============================================================
      // NORMAL RPC COMMAND ROUTING
      // ============================================================

      let rpcName;

      if (ROLLER_COMMANDS.has(command)) {
        rpcName = "create_roller_command";
      } else if (CAMERA_COMMANDS.has(command)) {
        rpcName = "create_camera_command";
      } else if (ALIGNMENT_COMMANDS.has(command)) {
        rpcName = "create_alignment_command";
      } else {
        throw new Error(`Unsupported manual command: ${command}`);
      }

      console.log(
        `[MANUAL CONTROL] Sending ${command} using ${rpcName}`
      );

      // ============================================================
      // CREATE COMMAND
      // ============================================================

      const { data, error } = await supabase.rpc(
        rpcName,
        {
          p_device_id: deviceId,
          p_command: command,
          p_payload: payload || {},
        }
      );

      if (error) {
        console.error(
          `[MANUAL CONTROL] ${rpcName} error:`,
          error
        );

        throw new Error(
          error.message ||
            `Failed to create ${command} command.`
        );
      }

      // ============================================================
      // NORMALIZE RPC RESPONSE
      // ============================================================

      let commandData = data;

      if (Array.isArray(commandData)) {
        commandData = commandData[0];
      }

      if (
        !commandData ||
        typeof commandData !== "object"
      ) {
        console.error(
          "[MANUAL CONTROL] Invalid RPC response:",
          data
        );

        throw new Error(
          `${command} command was created but no valid command data was returned.`
        );
      }

      const commandId = commandData.id;

      if (
        commandId === undefined ||
        commandId === null
      ) {
        console.error(
          "[MANUAL CONTROL] RPC response has no command ID:",
          commandData
        );

        throw new Error(
          `${command} command was created but no command ID was returned.`
        );
      }

      const label = command
        .replaceAll("_", " ")
        .toUpperCase();

      setMessage(label);
      addLog(label, "success");

      console.log(
        `[MANUAL CONTROL] Command created: ${commandId}`
      );

      // ============================================================
      // ROLLER COMMANDS
      // ============================================================

      if (ROLLER_COMMANDS.has(command)) {
        setMessage(
          command === "roller_on"
            ? "Roller ON command queued."
            : "Roller OFF command queued."
        );

        addLog(
          command === "roller_on"
            ? "Roller ON command queued."
            : "Roller OFF command queued.",
          "info"
        );

        await new Promise((resolve) =>
          setTimeout(resolve, 1200)
        );

        await loadState();

        setMessage(
          command === "roller_on"
            ? "Roller ON command sent."
            : "Roller OFF command sent."
        );

        return;
      }

      // ============================================================
      // NON-CAPTURE CAMERA COMMANDS
      // ============================================================

      if (command !== "capture") {
        await loadState();
        return;
      }

      // ============================================================
      // CAMERA CAPTURE
      // ============================================================

      setMessage(
        "Camera capture queued. Waiting for image..."
      );

      addLog(
        "Camera capture queued. Waiting for image...",
        "info"
      );

      const maxAttempts = 30;

      for (
        let attempt = 0;
        attempt < maxAttempts;
        attempt++
      ) {
        await new Promise((resolve) =>
          setTimeout(resolve, 1000)
        );

        const {
          data: statusData,
          error: statusError,
        } = await supabase.rpc(
          "get_camera_command_status",
          {
            p_command_id: commandId,
            p_device_id: deviceId,
          }
        );

        if (statusError) {
          throw new Error(
            statusError.message ||
              "Could not check camera command status."
          );
        }

        if (!statusData) {
          continue;
        }

        let cameraCommandData = statusData;

        if (Array.isArray(cameraCommandData)) {
          cameraCommandData = cameraCommandData[0];
        }

        if (!cameraCommandData) {
          continue;
        }

        // ========================================================
        // CAMERA COMPLETED
        // ========================================================

        if (
          cameraCommandData.status === "completed"
        ) {
          const newCaptureUrl =
            cameraCommandData.capture_url ||
            cameraCommandData.response?.capture_url;

          if (newCaptureUrl) {
            setCaptureUrl(
              `${newCaptureUrl}${
                newCaptureUrl.includes("?") ? "&" : "?"
              }t=${Date.now()}`
            );
          }

          setMessage(
            "Camera capture completed successfully."
          );

          addLog(
            "Camera capture completed successfully.",
            "success"
          );

          await loadState();
          return;
        }

        // ========================================================
        // CAMERA FAILED
        // ========================================================

        if (
          cameraCommandData.status === "failed"
        ) {
          throw new Error(
            cameraCommandData.error_message ||
              cameraCommandData.response?.message ||
              "Camera capture failed."
          );
        }
      }

      throw new Error(
        "Camera capture timed out. The Raspberry Pi did not confirm the image."
      );
    } catch (err) {
      console.error(
        "[MANUAL CONTROL] Command error:",
        err
      );

      const text =
        err?.message ||
        "Hardware command failed.";

      setError(text);

      setMessage(
        "Command was not confirmed by the device."
      );

      addLog(text, "error");
    } finally {
      setBusy("");
      loadState();
    }
  };

  const clearEmergency = async () => {
    if (!deviceId || busy) return;

    setBusy("clear_emergency");
    setError("");

    try {
      const response = await apiPost(
        `/devices/${encodeURIComponent(deviceId)}/clear-emergency`,
        undefined,
        {
          headers: {
            "Content-Type": "application/json",
          },
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
            `Emergency reset failed with status ${response.status}.`
        );
      }

      if (data?.state && typeof data.state === "object") {
        setState((prev) => ({
          ...prev,
          ...data.state,
          emergency_stop: false,
          roller: "off",
          camera: false,
        }));
      } else {
        setState((prev) => ({
          ...prev,
          emergency_stop: false,
          roller: "off",
          camera: false,
        }));
      }

      const messageText =
        data?.message ||
        "EMERGENCY STOP CLEARED. Roller and camera remain OFF.";

      setMessage(messageText);
      addLog(messageText, "success");

      await new Promise((resolve) => setTimeout(resolve, 300));
      await loadState();
    } catch (error) {
      const text = error?.message || "Could not clear emergency stop.";
      setError(text);
      setMessage("Emergency stop reset failed.");
      addLog(text, "error");
    } finally {
      setBusy("");
    }
  };

  const leavePage = () => {
    // The manual-control page is normally opened from the dashboard
    // in a separate tab. Return to that exact dashboard tab.
    if (window.opener && !window.opener.closed) {
      try {
        if (deviceId) {
          const saved =
            window.opener.sessionStorage.getItem(
              "activeMonitoringDevice"
            );

          if (!saved) {
            window.opener.sessionStorage.setItem(
              "activeMonitoringDevice",
              JSON.stringify({ device_id: deviceId })
            );
          }
        }

        window.opener.focus();
        window.close();
        return;
      } catch (err) {
        console.debug("Could not return to dashboard tab:", err);
      }
    }

    // Fallback when this page was opened directly: tell the dashboard
    // exactly which device must remain selected.
    if (deviceId) {
      try {
        const saved =
          sessionStorage.getItem("activeMonitoringDevice") ||
          localStorage.getItem("activeMonitoringDevice");

        if (!saved) {
          const minimalDevice = JSON.stringify({ device_id: deviceId });
          sessionStorage.setItem(
            "activeMonitoringDevice",
            minimalDevice
          );
          localStorage.setItem(
            "activeMonitoringDevice",
            minimalDevice
          );
        }
      } catch (err) {
        console.debug("Could not save return device:", err);
      }

      window.location.replace(
        `/?device=${encodeURIComponent(deviceId)}`
      );
      return;
    }

    window.location.replace("/");
  };

  if (!deviceId) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-50 text-slate-900">
        No device selected.
      </div>
    );
  }

  const rollerRunning = state.roller === "on";

  const motorRunning =
    state.motor !== "stop";

  const homing =
    Boolean(state.homing);

  const emergency =
    Boolean(state.emergency_stop);

  const currentAngle =
    Number(state.current_angle ?? 0);

  const targetAngle =
    Number(state.target_angle ?? 0);

  const homeLimit =
    Boolean(state.home_limit);

  return (
    <div className="ui-shell min-h-screen bg-[#f6f8f7] text-slate-900">
      <style>{`
        @keyframes rollerSpin { to { transform: rotate(360deg); } }
        @keyframes motorSpin { to { transform: rotate(360deg); } }
        @keyframes windFlow { from { transform: translateX(-10px); opacity:.25 } 50% { opacity:1 } to { transform:translateX(10px); opacity:.25 } }
        @keyframes cameraPulse { 0%,100% { opacity:.45 } 50% { opacity:1 } }
        @keyframes scanLine { 0% { transform:translateY(0) } 100% { transform:translateY(260px) } }
        .roller-spin { animation: rollerSpin 1.25s linear infinite; }
        .motor-spin { animation: motorSpin .9s linear infinite; }
        .wind-flow { animation: windFlow 1.2s ease-in-out infinite; }
        .camera-pulse { animation: cameraPulse 1.6s ease-in-out infinite; }
        .camera-scan-line { animation: scanLine 2.6s linear infinite; }
      `}</style>

      {/* Clean dashboard header */}
      <header className="ui-topbar sticky top-0 z-40 border-b border-slate-200/90 bg-white/95 backdrop-blur">
        <div className="ui-container mx-auto flex h-[72px] max-w-[1500px] items-center justify-between gap-4 px-5 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              onClick={leavePage}
              className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
              title="Back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="ui-accent-icon grid h-10 w-10 place-items-center rounded-xl">
              <Cpu className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-slate-900 sm:text-lg">
                Manual Hardware Control
              </h1>
              <p className="text-xs text-slate-500">Raspberry Pi 5 · {deviceId} · Direct service console</p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] font-bold">
            <BackendConnectionStatus />
            <StatusTopPill active={state.pi_online} icon={state.pi_online ? Wifi : WifiOff} label={state.pi_online ? "PI ONLINE" : "PI OFFLINE"} />
            <StatusTopPill active={state.esp32_online} icon={Radio} label={state.esp32_online ? "ESP32 ONLINE" : "ESP32 OFFLINE"} />
            <span className="hidden rounded-full border border-amber-200 bg-amber-50 px-3 py-2 text-amber-700 sm:inline-flex">
              {mode ? "DEVELOPER MODE" : "DEVELOPER MODE OFF"}
            </span>
          </div>
        </div>
      </header>

      <main className="ui-container mx-auto max-w-[1500px] px-5 py-6 lg:px-8 lg:py-8">
        {/* Page title */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
              <Activity className="h-4 w-4" />
              Service Console
            </div>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              Manual control
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Direct hardware commands only. Automatic monitoring is not started from this page.
            </p>
          </div>
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            MANUAL MODE
          </span>
        </div>

        {error && (
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Main controls */}
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
          {/* Roller — existing roller motor only */}
          <section className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-5 ${rollerRunning ? "ring-1 ring-emerald-200" : ""}`}>
            <CardHeading
              icon={Gauge}
              eyebrow="01 · DRIVE"
              title="Roller"
              subtitle="Start / stop roller"
              active={rollerRunning}
              status={rollerRunning ? "RUNNING" : "OFF"}
            />

            <div className="my-5 flex h-36 items-center justify-center rounded-xl border border-slate-100 bg-slate-50">
              <div className={`relative flex h-28 w-28 items-center justify-center rounded-full border-[7px] border-slate-300 ${rollerRunning ? "roller-spin" : ""}`}>
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <span
                    key={i}
                    className="absolute h-2 w-10 rounded-full bg-emerald-500"
                    style={{ transform: `rotate(${i * 60}deg) translateX(34px)` }}
                  />
                ))}
                <div className="h-9 w-9 rounded-full border-4 border-slate-300 bg-white" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <ControlButton disabled={Boolean(busy) || emergency} onClick={() => send("roller_on")} tone="green">
                <span className="flex items-center justify-center gap-2"><Power className="h-4 w-4" />ROLLER ON</span>
              </ControlButton>
              <ControlButton disabled={Boolean(busy)} onClick={() => send("roller_off")} tone="light">
                ROLLER OFF
              </ControlButton>
            </div>
          </section>

          {/* Wind alignment — second motor, controlled only by wind direction/encoder */}
          <section
            className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-7 ${
              state.alignment_status === "moving" || state.homing
                ? "ring-1 ring-emerald-200"
                : ""
            }`}
          >
            <CardHeading
              icon={Crosshair}
              eyebrow="02 · WIND ALIGNMENT"
              title="Wind Alignment"
              subtitle="Wind direction → automatic orientation"
              active={state.alignment_status === "moving" || state.homing}
              status={
                state.homing
                  ? "HOMING"
                  : state.alignment_status === "moving"
                    ? "MOVING"
                    : "READY"
              }
            />

            <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-5">
              {/* Wind-alignment motor animation */}
              <div className="flex min-h-44 items-center justify-center rounded-xl border border-slate-100 bg-slate-50 lg:col-span-2">
                <div className="flex flex-col items-center gap-3">
                  <div className={`relative flex h-28 w-28 items-center justify-center rounded-full border-[7px] border-slate-300 ${state.alignment_status === "moving" || state.homing ? "motor-spin" : ""}`}>
                    {[0,1,2,3,4,5,6,7].map((i) => (
                      <span
                        key={i}
                        className="absolute h-2 w-8 rounded-full bg-emerald-500"
                        style={{ transform: `rotate(${i * 45}deg) translateX(36px)` }}
                      />
                    ))}
                    <div className="h-9 w-9 rounded-full bg-slate-300" />
                  </div>
                  <div className="text-xs font-semibold text-slate-500">
                    {state.homing ? "HOMING" : state.alignment_status === "moving" ? "ALIGNING" : "IDLE"}
                  </div>
                </div>
              </div>

              {/* Position + wind direction controls */}
              <div className="lg:col-span-3">
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Current Angle
                  </div>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-4xl font-black text-slate-900">
                      {Number(state.current_angle ?? 0).toFixed(1)}
                    </span>
                    <span className="text-sm font-semibold text-slate-500">°</span>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className="rounded-lg border border-slate-200 bg-white p-3">
                      <div className="text-[9px] font-bold uppercase text-slate-400">Target</div>
                      <div className="mt-1 text-sm font-bold text-slate-700">
                        {Number(state.target_angle ?? 0).toFixed(1)}°
                      </div>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-white p-3">
                      <div className="text-[9px] font-bold uppercase text-slate-400">Encoder</div>
                      <div className="mt-1 font-mono text-sm font-bold text-slate-700">
                        {state.encoder ?? 0}
                      </div>
                    </div>
                  </div>

                  {state.wind_direction && (
                    <div className="mt-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-center text-[10px] font-bold uppercase tracking-wide text-slate-500">
                      Moving {state.wind_direction === "cw" ? "CW" : "CCW"}
                    </div>
                  )}
                </div>

                <div className="mt-3">
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Wind Direction
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="0"
                      max="360"
                      step="0.1"
                      value={targetAngleInput}
                      onChange={(event) => setTargetAngleInput(event.target.value)}
                      placeholder="Enter wind direction"
                      disabled={Boolean(busy) || emergency || state.homing}
                      className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-bold text-slate-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 disabled:bg-slate-100"
                    />
                    <div className="grid place-items-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-500">°</div>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <ControlButton
                    disabled={
                      Boolean(busy) ||
                      emergency ||
                      state.alignment_status === "moving" ||
                      state.homing ||
                      !targetAngleInput.trim()
                    }
                    onClick={() => {
                      const angle = Number(targetAngleInput);
                      if (!Number.isFinite(angle) || angle < 0 || angle > 360) {
                        setError("Enter an angle between 0° and 360°.");
                        return;
                      }
                      setState((prev) => ({ ...prev, target_angle: angle }));
                      send("align_angle", { target_angle: angle });
                    }}
                    tone="green"
                  >
                    <span className="flex items-center justify-center gap-1"><Crosshair className="h-4 w-4" />ROTATE</span>
                  </ControlButton>

                  <ControlButton
                    disabled={Boolean(busy) || emergency || state.homing}
                    onClick={() => {
                      setState((prev) => ({ ...prev, target_angle: 0, homing: true }));
                      setTargetAngleInput("");
                      send("home_alignment");
                    }}
                    tone="light"
                  >
                    <span className="flex items-center justify-center gap-1"><Home className="h-4 w-4" />HOME</span>
                  </ControlButton>
                </div>
              </div>
            </div>

            <p className="mt-3 text-[10px] leading-4 text-slate-400">
              Enter the wind direction and press ROTATE. The wind-alignment motor chooses the shortest direction and stops automatically using encoder feedback. HOME returns the mechanism to the physical zero position.
            </p>
          </section>
        </div>

        {/* Camera monitor + sensors */}
        <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-12">
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:col-span-8">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                  <span className="ui-accent-icon grid h-8 w-8 place-items-center rounded-lg"><Camera className="h-4 w-4" /></span>
                  Monitor Camera
                </div>
                <p className="mt-1 text-xs text-slate-500">Live inspection view and manual image capture</p>
              </div>
              <button
                type="button"
                onClick={() => setMonitorOpen((v) => !v)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                {monitorOpen ? "Hide monitor" : "Open monitor"}
              </button>
            </div>

            {monitorOpen && (
              <div className="p-5">
                <div className="relative aspect-video overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                  {captureUrl ? (
                    <img src={captureUrl} alt="Latest inspection camera capture" className="h-full w-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 grid place-items-center">
                      <div className="text-center">
                        <div className={`mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-white text-slate-300 shadow-sm ${state.camera ? "camera-pulse text-emerald-500" : ""}`}>
                          <Camera className="h-8 w-8" />
                        </div>
                        <p className="mt-3 text-sm font-semibold text-slate-600">No camera image yet</p>
                        <p className="mt-1 text-xs text-slate-400">Turn the camera on and capture an image.</p>
                      </div>
                    </div>
                  )}

                  {state.camera && (
                    <>
                      <div className="absolute left-3 top-3 inline-flex items-center gap-2 rounded-full bg-slate-950/75 px-3 py-1.5 text-[10px] font-bold text-white backdrop-blur">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> LIVE
                      </div>
                      <div className="camera-scan-line absolute left-0 right-0 top-0 h-px bg-emerald-400/70 shadow-[0_0_10px_rgba(16,185,129,.55)]" />
                    </>
                  )}
                </div>

                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <ControlButton disabled={Boolean(busy)} onClick={() => send(state.camera ? "camera_off" : "camera_on")} tone={state.camera ? "light" : "green"}>
                    <span className="flex items-center justify-center gap-2"><Camera className="h-4 w-4" />{state.camera ? "CAMERA OFF" : "CAMERA ON"}</span>
                  </ControlButton>
                  <ControlButton disabled={Boolean(busy) || !state.camera} onClick={() => send("capture")} tone="light">
                    <span className="flex items-center justify-center gap-2"><Images className="h-4 w-4" />CAPTURE IMAGE</span>
                  </ControlButton>
                  <button
                    type="button"
                    disabled={!captureUrl}
                    onClick={() => captureUrl && window.open(captureUrl, "_blank", "noopener,noreferrer")}
                    className="min-h-12 rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs font-black tracking-wide text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    VIEW LAST CAPTURE
                  </button>
                </div>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-4">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <span className="ui-accent-icon grid h-8 w-8 place-items-center rounded-lg"><Activity className="h-4 w-4" /></span>
              Sensors & Status
            </div>
            <p className="mt-1 text-xs text-slate-500">Live hardware feedback</p>

            <div className="mt-5 grid grid-cols-2 gap-2">

              <SensorCard
                label="HOME LIMIT"
                value={homeLimit ? "ACTIVE" : "OPEN"}
                active={homeLimit}
              />

              <SensorCard
                label="ENCODER"
                value={state.encoder ?? 0}
                active={false}
              />

              <SensorCard
                label="CURRENT ANGLE"
                value={`${currentAngle.toFixed(1)}°`}
                active={false}
              />

              <SensorCard
                label="MOTOR"
                value={
                  state.motor === "stop"
                    ? "STOPPED"
                    : String(state.motor).toUpperCase()
                }
                active={state.motor !== "stop"}
              />

            </div>

            <div className="mt-2 rounded-xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Wind speed</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">{Number(state.wind_kmh || 0).toFixed(1)} <span className="text-xs font-semibold text-slate-400">km/h</span></p>
                </div>
                <Wind className="h-6 w-6 text-emerald-600" />
              </div>
              <div className="mt-3 flex gap-1.5">
                {[0,1,2,3,4].map((i) => (
                  <span key={i} className={`wind-flow h-1.5 flex-1 rounded-full ${Number(state.wind_kmh || 0) > i * 2 ? "bg-emerald-500" : "bg-slate-200"}`} />
                ))}
              </div>
            </div>

            <div className="mt-2 flex items-center justify-between rounded-xl border border-slate-100 bg-white px-4 py-3">
              <span className="text-xs font-semibold text-slate-500">Device status</span>
              <span className={`inline-flex items-center gap-2 text-xs font-bold ${state.pi_online ? "text-emerald-700" : "text-red-600"}`}>
                <span className={`h-2 w-2 rounded-full ${state.pi_online ? "bg-emerald-500" : "bg-red-500"}`} />
                {state.pi_online ? "OK" : "OFFLINE"}
              </span>
            </div>
          </section>
        </div>

        {/* Emergency */}
        <section className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-red-600 shadow-sm"><ShieldAlert className="h-5 w-5" /></div>
              <div>
                <h2 className="font-bold text-red-800">Emergency Stop</h2>
                <p className="mt-1 text-xs text-red-600">Immediately request stop for roller, motor and stage movement.</p>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => send("emergency_stop")}
                disabled={Boolean(busy)}
                className="min-h-12 rounded-xl bg-red-600 px-7 py-3 text-sm font-black tracking-wide text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {emergency ? "EMERGENCY STOP ACTIVE" : "EMERGENCY STOP"}
              </button>

              {emergency && (
                <button
                  type="button"
                  onClick={clearEmergency}
                  disabled={Boolean(busy)}
                  className="min-h-12 rounded-xl border border-emerald-300 bg-white px-7 py-3 text-sm font-black tracking-wide text-emerald-700 shadow-sm transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  RESET EMERGENCY
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Activity */}
        <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-12">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-8">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-sm font-bold text-slate-900"><Activity className="h-4 w-4 text-emerald-600" />Command Log</div>
                <p className="mt-1 text-xs text-slate-500">Latest manual commands and device responses</p>
              </div>
              <span className="max-w-[55%] truncate text-right text-xs text-slate-500">{message}</span>
            </div>
            <div className="mt-4 max-h-52 space-y-2 overflow-auto">
              {logs.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-xs text-slate-400">No commands issued in this session.</div>
              ) : logs.map((log) => (
                <div key={log.id} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 text-xs">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${log.type === "error" ? "bg-red-500" : "bg-emerald-500"}`} />
                  <span className="min-w-0 flex-1 truncate font-medium text-slate-700">{log.text}</span>
                  <span className="shrink-0 font-mono text-slate-400">{log.time.toLocaleTimeString()}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-4">
            <div className="text-sm font-bold text-slate-900">Machine Snapshot</div>
            <p className="mt-1 text-xs text-slate-500">Current state reported by the device</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {[
                ["ROLLER", rollerRunning ? "ON" : "OFF"],
                ["MOTOR", (state.motor || "stop").toUpperCase()],
                ["ANGLE", `${Number(state.current_angle ?? 0).toFixed(1)}°`],
                ["ENCODER", state.encoder ?? 0],
                ["CAMERA", state.camera ? "ON" : "OFF"],
                ["WIND", `${Number(state.wind_kmh || 0).toFixed(1)} km/h`],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
                  <p className="mt-1 text-sm font-bold text-slate-800">{value}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
function StatusTopPill({ active, icon: Icon, label }) {
  return (
    <span className={`hidden items-center gap-1.5 rounded-full border px-3 py-2 sm:inline-flex ${active ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-400"}`}>
      <Icon className="h-3.5 w-3.5" /> {label}
    </span>
  );
}

function CardHeading({ icon: Icon, eyebrow, title, subtitle, active, status }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[.18em] text-emerald-600">{eyebrow}</p>
        <h2 className="mt-1 text-lg font-bold text-slate-900">{title}</h2>
        <p className="text-xs text-slate-500">{subtitle}</p>
      </div>
      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[10px] font-bold ${active ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-500"}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-emerald-500" : "bg-slate-400"}`} />
        {status}
      </span>
    </div>
  );
}

function ControlButton({ children, onClick, disabled, tone = "light" }) {
  const styles = {
    green: "border border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700",
    red: "border border-red-600 bg-red-600 text-white hover:bg-red-700",
    light: "border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`min-h-12 rounded-xl px-3 py-3 text-xs font-black tracking-wide transition ${styles[tone]} disabled:cursor-not-allowed disabled:opacity-40`}
    >
      {children}
    </button>
  );
}

function SensorCard({ label, value, active }) {
  return (
    <div className={`rounded-xl border p-3 ${active ? "border-red-200 bg-red-50" : "border-slate-100 bg-slate-50"}`}>
      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <p className={`mt-1 text-sm font-bold ${active ? "text-red-700" : "text-slate-800"}`}>{value}</p>
    </div>
  );
}
