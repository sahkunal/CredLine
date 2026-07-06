
"use client";

import { useQuery } from "@tanstack/react-query";
import { useWallet } from "@solana/wallet-adapter-react";
import { Connection, PublicKey } from "@solana/web3.js";
import { SOLANA_RPC_ENDPOINT } from "@/lib/anchor/program-ids";
import { deriveBadgeAccountPda } from "@/lib/anchor/pda";
import { decodeBadgeAccount, DecodedBadgeAccount } from "@/lib/anchor/decode";

export type BadgeTier = "bronze" | "silver" | "gold" | "platinum";
const TIER_LABELS: BadgeTier[] = ["bronze", "silver", "gold", "platinum"];

export interface BadgeAccountData extends DecodedBadgeAccount {
  tierLabel: BadgeTier;
}

const readConnection = new Connection(SOLANA_RPC_ENDPOINT, "confirmed");

async function fetchBadge(wallet: PublicKey): Promise<BadgeAccountData | null> {
  const [pda] = deriveBadgeAccountPda(wallet);
  const info = await readConnection.getAccountInfo(pda);
  if (!info) return null; // not minted yet
  const decoded = decodeBadgeAccount(info.data);
  return { ...decoded, tierLabel: TIER_LABELS[decoded.tier] ?? "bronze" };
}

export function useBadge(walletAddress?: string) {
  const { publicKey } = useWallet();
  const address = walletAddress ?? publicKey?.toBase58();

  return useQuery({
    queryKey: ["badge", address],
    queryFn: () => fetchBadge(new PublicKey(address as string)),
    enabled: !!address,
  });
}

export const ALL_TIERS: { tier: BadgeTier; minScore: number }[] = [
  { tier: "bronze", minScore: 400 },
  { tier: "silver", minScore: 600 },
  { tier: "gold", minScore: 800 },
  { tier: "platinum", minScore: 900 },
];