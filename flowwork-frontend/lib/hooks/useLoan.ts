"use client";

import { useQuery } from "@tanstack/react-query";
import { useWallet } from "@solana/wallet-adapter-react";
import { Connection, PublicKey } from "@solana/web3.js";
import { SOLANA_RPC_ENDPOINT } from "@/lib/anchor/program-ids";
import { deriveLoanAccountPda, deriveLendingPoolPda } from "@/lib/anchor/pda";
import {
  decodeLoanAccount,
  decodeLendingPool,
  DecodedLoanAccount,
  DecodedLendingPool,
} from "@/lib/anchor/decode";

const readConnection = new Connection(SOLANA_RPC_ENDPOINT, "confirmed");

async function fetchActiveLoan(
  worker: PublicKey
): Promise<DecodedLoanAccount | null> {
  const [pda] = deriveLoanAccountPda(worker);
  const info = await readConnection.getAccountInfo(pda);
  if (!info) return null; // no active loan (also true right after repay, since repay closes the account)
  return decodeLoanAccount(info.data);
}

async function fetchPoolStats(): Promise<DecodedLendingPool | null> {
  const [pda] = deriveLendingPoolPda();
  const info = await readConnection.getAccountInfo(pda);
  if (!info) return null; // pool hasn't been initialized yet
  return decodeLendingPool(info.data);
}

export function useLoan() {
  const { publicKey } = useWallet();
  const address = publicKey?.toBase58();

  return useQuery({
    queryKey: ["loan", address],
    queryFn: () => fetchActiveLoan(publicKey as PublicKey),
    enabled: !!address,
  });
}

export function usePoolStats() {
  return useQuery({
    queryKey: ["poolStats"],
    queryFn: fetchPoolStats,
  });
}