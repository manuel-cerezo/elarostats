import type { Player } from "../types/player";
import { NBA_CDN_BASE_URL } from "../constants/player";

export function formatPercentage(value: number | undefined): string {
  if (value === undefined || value === null) return "—";
  return `${(value * 100).toFixed(1)}%`;
}

export function formatDecimal(
  value: number | undefined,
  decimals = 1,
): string {
  if (value === undefined || value === null) return "—";
  return value.toFixed(decimals);
}

export function formatSigned(value: number | undefined): string {
  if (value === undefined || value === null) return "—";
  const formatted = value.toFixed(1);
  return value >= 0 ? `+${formatted}` : formatted;
}

export function getHeadshotUrl(nbaId: number): string {
  return `${NBA_CDN_BASE_URL}/${nbaId}.png`;
}

export interface FormattedPlayerStats {
  tsPct: string;
  dpm: string;
  oDpm: string;
  dDpm: string;
  rapm: string;
  pts75: string;
  threePct: string;
  ftPct: string;
}

export function formatPlayerStats(player: Player): FormattedPlayerStats {
  return {
    tsPct: formatPercentage(player.TS_pct),
    dpm: formatDecimal(player.dpm),
    oDpm: formatSigned(player.o_dpm),
    dDpm: formatDecimal(player.d_dpm),
    rapm: formatDecimal(player.three_year_rapm),
    pts75: formatDecimal(player.Pts75),
    threePct: formatPercentage(player["3P_PERC"] as number),
    ftPct: formatPercentage(player.FT_PERC),
  };
}
