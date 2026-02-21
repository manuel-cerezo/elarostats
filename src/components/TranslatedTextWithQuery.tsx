import { ReactQueryProvider } from "../lib/ReactQueryProvider";
import TranslatedText from "./TranslatedText";
import type { TranslationKeys } from "../i18n";

interface Props {
  k: TranslationKeys;
  className?: string;
}

export default function TranslatedTextWithQuery({ k, className }: Props) {
  return (
    <ReactQueryProvider>
      <TranslatedText k={k} className={className} />
    </ReactQueryProvider>
  );
}
