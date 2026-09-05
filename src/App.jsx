import HomePage from "./pages/Home";
import DeveloperMode from "./pages/DeveloperMode";

export default function App() {
  const match = window.location.pathname.match(/^\/manual-control\/([^/]+)/);
  if (match) return <DeveloperMode deviceId={decodeURIComponent(match[1])} />;
  return <HomePage />;
}
