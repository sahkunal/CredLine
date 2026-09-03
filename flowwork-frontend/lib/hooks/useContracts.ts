"use client";

import { useQuery } from "@tanstack/react-query";
import { useWallet } from "@solana/wallet-adapter-react";
import { Connection, PublicKey } from "@solana/web3.js";
import { getAnchorProvider } from "@/lib/anchor/provider";
import { FLOWPAY_PROGRAM_ID } from "@/lib/anchor/program-ids";
import { decodeFlowpay, DecodedFlowpay } from "@/lib/anchor/decode";

export type ContractRole = "payer" | "payee";
export type ContractStatus = "active" | "due" | "cancelled";
export type PayFrequency = "weekly" | "biweekly" | "monthly";

export const FREQUENCY_SECONDS: Record<PayFrequency, number> = {
  weekly: 7 * 24 * 60 * 60,
  biweekly: 14 * 24 * 60 * 60,
  monthly: 30 * 24 * 60 * 60,
};

export interface FlowPayContract extends DecodedFlowpay {
  pda: string;
  role: ContractRole;
  status: ContractStatus;
}

async function fetchContracts(
  connection: Connection,
  wallet: PublicKey
): Promise<FlowPayContract[]> {
  const [asPayer, asPayee] = await Promise.all([
    connection.getProgramAccounts(FLOWPAY_PROGRAM_ID, {
      filters: [{ memcmp: { offset: 8, bytes: wallet.toBase58() } }],
    }),
    connection.getProgramAccounts(FLOWPAY_PROGRAM_ID, {
      filters: [{ memcmp: { offset: 40, bytes: wallet.toBase58() } }],
    }),
  ]);

  const decorate = (
    accounts: ReadonlyArray<{ pubkey: PublicKey; account: { data: Buffer } }>,
    role: ContractRole
  ): FlowPayContract[] =>
    accounts.map(({ pubkey, account }) => {
      const decoded = decodeFlowpay(account.data);
      return {
        ...decoded,
        pda: pubkey.toBase58(),
        role,
        status: computeStatus(decoded),
      };
    });

  // A wallet could theoretically be both payer and payee of the same
  // contract in weird edge cases, so dedupe by PDA, preferring "payee".
  const merged = new Map<string, FlowPayContract>();
  for (const c of decorate(asPayer, "payer")) merged.set(c.pda, c);
  for (const c of decorate(asPayee, "payee")) merged.set(c.pda, c);

  return Array.from(merged.values());
}

export function useContracts() {
  const wallet = useWallet();
  const address = wallet.publicKey?.toBase58();

  return useQuery({
    queryKey: ["contracts", address],
    queryFn: async () => {
      const provider = getAnchorProvider(wallet);
      if (!provider || !wallet.publicKey) return [];
      return fetchContracts(provider.connection, wallet.publicKey);
    },
    enabled: !!address,
  });
}

export function useContract(pda: string) {
  const { data: contracts, ...rest } = useContracts();
  const contract = contracts?.find((c) => c.pda === pda);
  return { data: contract, ...rest };
}