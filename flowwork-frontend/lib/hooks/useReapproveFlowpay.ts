"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, Transaction, TransactionInstruction } from "@solana/web3.js";
import { getAnchorProvider } from "@/lib/anchor/provider";
import { FLOWPAY_PROGRAM_ID } from "@/lib/anchor/program-ids";
import { deriveFlowPayContractPda } from "@/lib/anchor/pda";
import { deriveAta, TOKEN_PROGRAM_ID } from "@/lib/anchor/spl";
import { IX_DISCRIMINATOR } from "@/lib/anchor/discriminators";

interface ReapproveFlowpayArgs {
  payee: PublicKey;
  tokenMint: PublicKey;
  /** New total delegated amount, in raw token units (e.g. 3x payment again) */
  newDelegationAmount: bigint;
}

export function useReapproveFlowpay() {
  const wallet = useWallet();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      payee,
      tokenMint,
      newDelegationAmount,
    }: ReapproveFlowpayArgs) => {
      const provider = getAnchorProvider(wallet);
      if (!provider || !wallet.publicKey) {
        throw new Error("Connect your wallet first.");
      }
      const payer = wallet.publicKey;

      const [flowpayPda] = deriveFlowPayContractPda(payer, payee);
      const payerAta = deriveAta(payer, tokenMint);

      const argsBuf = Buffer.alloc(8);
      argsBuf.writeBigUInt64LE(newDelegationAmount, 0);
      const data = Buffer.concat([IX_DISCRIMINATOR.reapproveFlowpay, argsBuf]);

      // Account order MUST exactly match the Rust `ReapproveFlowpay` struct.
      const keys = [
        { pubkey: payer, isSigner: true, isWritable: true },
        { pubkey: tokenMint, isSigner: false, isWritable: false },
        { pubkey: payerAta, isSigner: false, isWritable: true },
        { pubkey: flowpayPda, isSigner: false, isWritable: true },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      ];

      const ix = new TransactionInstruction({
        programId: FLOWPAY_PROGRAM_ID,
        keys,
        data,
      });

      const tx = new Transaction().add(ix);
      return provider.sendAndConfirm(tx);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
    },
  });
}