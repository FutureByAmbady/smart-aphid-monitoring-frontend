import { CheckCircle2, Search, WifiOff } from "lucide-react";
import { useApiConnectionStatus } from "../lib/api";

export default function BackendConnectionStatus() {
  const { status, message } = useApiConnectionStatus();
  const connected = status === "connected";
  const searching = status === "searching";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold tracking-wide ${
        connected
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : searching
            ? "border-amber-200 bg-amber-50 text-amber-700"
            : "border-red-200 bg-red-50 text-red-700"
      }`}
      role="status"
      title={message}
    >
      {connected ? (
        <CheckCircle2 className="h-3.5 w-3.5" />
      ) : searching ? (
        <Search className="h-3.5 w-3.5" />
      ) : (
        <WifiOff className="h-3.5 w-3.5" />
      )}
      <span className="hidden sm:inline">
        {connected ? "Backend connected" : "Backend unavailable — searching for device..."}
      </span>
      <span className="sm:hidden">{connected ? "API" : "Searching"}</span>
    </span>
  );
}
