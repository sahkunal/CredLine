"use client";

import { useQuery } from "@tanstack/react-query";
import { useWallet } from "@solana/wallet-adapter-react";
import { Connection, PublicKey } from "@solana/web3.js";
import { SOLANA_RPC_ENDPOINT } from "@/lib/anchor/program-ids";
import { deriveScoreAccountPda } from "@/lib/anchor/pda";
import { decodeScoreAccount, DecodedScoreAccount } from "@/lib/anchor/decode";

export interface ScoreAccountData extends DecodedScoreAccount {
  history: null; // see limitation note above
}

const readConnection = new Connection(SOLANA_RPC_ENDPOINT, "confirmed");

async function fetchScoreAccount(
  wallet: PublicKey
): Promise<ScoreAccountData | null> {
  const [pda] = deriveScoreAccountPda(wallet);
  const info = await readConnection.getAccountInfo(pda);
  if (!info) return null; // no payments yet — account doesn't exist (init_if_needed)
  return { ...decodeScoreAccount(info.data), history: null };
}

export function useScoreAccount(walletAddress?: string) {
  const { publicKey } = useWallet();
  const address = walletAddress ?? publicKey?.toBase58();

  return useQuery({
    queryKey: ["scoreAccount", address],
    queryFn: () => fetchScoreAccount(new PublicKey(address as string)),
    enabled: !!address,
  });
}