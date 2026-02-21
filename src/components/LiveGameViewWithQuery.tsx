import { ReactQueryProvider } from "../lib/ReactQueryProvider";
import { useTranslation } from "../hooks/useTranslation";
import LiveGameView from "./LiveGameView";

function LiveGameViewFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const gameId = params.get("id") ?? "";
  const { t } = useTranslation();

  if (!gameId) {
    return (
      <p className="text-center text-sm text-gray-500">
        {t("gameNotFound")}{" "}
        <a href="/" className="text-orange-400 hover:underline">
          {t("backToHome")}
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
