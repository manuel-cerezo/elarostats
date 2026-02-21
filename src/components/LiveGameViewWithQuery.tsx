import { ReactQueryProvider } from "../lib/ReactQueryProvider";
import LiveGameView from "./LiveGameView";

function LiveGameViewFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const gameId = params.get("id") ?? "";

  if (!gameId) {
    return (
      <p className="text-center text-sm text-gray-500">
        Partido no encontrado.{" "}
        <a href="/" className="text-orange-400 hover:underline">
          Volver al inicio
        </a>
      </p>
    );
  }

  return <LiveGameView gameId={gameId} />;
}

export default function LiveGameViewWithQuery() {
  return (
    <ReactQueryProvider>
      <LiveGameViewFromUrl />
    </ReactQueryProvider>
  );
}
