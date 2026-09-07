import { Bug } from "lucide-react";
import BackendConnectionStatus from "./BackendConnectionStatus";

export default function Header() {
  return (
    <header className="ui-topbar w-full border-b border-gray-200 bg-white">
      <div className="ui-container mx-auto flex max-w-7xl items-center gap-4 px-4 py-4 sm:px-6 sm:py-5">
        <div className="ui-accent-icon flex h-11 w-11 items-center justify-center rounded-2xl">
          <Bug className="h-6 w-6 text-white" strokeWidth={2} />
        </div>

        <div className="min-w-0">
          <h1 className="text-lg font-bold tracking-tight text-gray-900 sm:text-xl">
            Smart Aphid Monitoring System
          </h1>

          <p className="text-sm text-gray-500">
            AI-based Yellow Sticky Trap Insect Detection
          </p>
        </div>

        <div className="ml-auto shrink-0">
          <BackendConnectionStatus />
        </div>
      </div>
    </header>
  );
}
