import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Truncate a base58 wallet/PDA address as `XXXX...YYYY` */
export function truncateAddress(address: string, chars = 4): string {
  if (!address) return "";
  if (address.length <= chars * 2 + 3) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

/** Format a USDC amount (assumes 6 decimals) into a display string */
export function formatUsdc(rawAmount: number | bigint, decimals = 6): string {
  const value = Number(rawAmount) / 10 ** decimals;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/** Compact number formatting, e.g. 24810 -> $24.8K */
export function formatCompact(value: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export type BadgeTier = "none" | "bronze" | "silver" | "gold" | "platinum";

/** Map a composite score (0-1000) to a badge tier */
export function scoreToTier(score: number): BadgeTier {
  if (score >= 900) return "platinum";
  if (score >= 800) return "gold";
  if (score >= 600) return "silver";
  if (score >= 400) return "bronze";
  return "none";
}
 
/** Next tier threshold info for progress displays */
export function nextTierInfo(score: number): { tier: BadgeTier; threshold: number } | null {
  if (score < 400) return { tier: "bronze", threshold: 400 };
  if (score < 600) return { tier: "silver", threshold: 600 };
  if (score < 800) return { tier: "gold", threshold: 800 };
  if (score < 900) return { tier: "platinum", threshold: 900 };
  return null;
}

export const TIER_LABELS: Record<BadgeTier, string> = {
  none: "Unranked",
  bronze: "Bronze",
  silver: "Silver",
  gold: "Gold",
  platinum: "Platinum",
};

export const TIER_GRADIENTS: Record<BadgeTier, string> = {
  none: "from-white/10 to-white/5",
  bronze: "from-amber-700/40 via-amber-500/30 to-amber-300/20",
  silver: "from-slate-400/30 via-slate-200/30 to-slate-400/20",
  gold: "from-amber-300/30 via-yellow-400/30 to-amber-500/20",
  platinum: "from-cyan-300/30 via-violet-400/30 to-pink-300/30",
};

/** Format seconds remaining into D:HH:MM:SS */
export function formatCountdown(secondsRemaining: number): string {
  if (secondsRemaining <= 0) return "00:00:00:00";
  const days = Math.floor(secondsRemaining / 86400);
  const hours = Math.floor((secondsRemaining % 86400) / 3600);
  const minutes = Math.floor((secondsRemaining % 3600) / 60);
  const seconds = Math.floor(secondsRemaining % 60);
  return [days, hours, minutes, seconds]
    .map((unit, i) => (i === 0 ? String(unit).padStart(2, "0") : String(unit).padStart(2, "0")))
    .join(":");
}

/** Relative time formatting, e.g. "2h ago" */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diffMs = now - timestamp * 1000;
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  const diffMonth = Math.floor(diffDay / 30);
  return `${diffMonth}mo ago`;
}

export type LoanStatus = "early" | "on-time" | "overdue";

export function getLoanStatus(dueTimestamp: number): LoanStatus {
  const now = Date.now() / 1000;
  const remaining = dueTimestamp - now;
  const totalWindow = 7 * 86400; // assume 7-day typical window for "early" framing
  if (remaining < 0) return "overdue";
  if (remaining > totalWindow * 0.5) return "early";
  return "on-time";
}

export const LOAN_STATUS_COLORS: Record<LoanStatus, string> = {
  early: "text-success border-success/30 bg-success/10",
  "on-time": "text-warning border-warning/30 bg-warning/10",
  overdue: "text-danger border-danger/30 bg-danger/10",
};
