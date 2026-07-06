"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
} from "@solana/web3.js";
import { getAnchorProvider } from "@/lib/anchor/provider";
import { FLOWPAY_PROGRAM_ID } from "@/lib/anchor/program-ids";
import { deriveFlowPayContractPda } from "@/lib/anchor/pda";
import { deriveAta, TOKEN_PROGRAM_ID } from "@/lib/anchor/spl";
import { IX_DISCRIMINATOR } from "@/lib/anchor/discriminators";

interface CreateFlowpayArgs {
  payee: PublicKey;
  tokenMint: PublicKey;
  amount: bigint;
  frequencySeconds: bigint;
}

export function useCreateFlowpay() {
  const wallet = useWallet();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      payee,
      tokenMint,
      amount,
      frequencySeconds,
    }: CreateFlowpayArgs) => {
      const provider = getAnchorProvider(wallet);
      if (!provider || !wallet.publicKey) {
        throw new Error("Connect your wallet first.");
      }
      const payer = wallet.publicKey;

      const [flowpayPda] = deriveFlowPayContractPda(payer, payee);
      const payerAta = deriveAta(payer, tokenMint);

      // Borsh args: amount (u64 LE, 8 bytes) + frequency (i64 LE, 8 bytes)
      const argsBuf = Buffer.alloc(16);
      argsBuf.writeBigUInt64LE(amount, 0);
      argsBuf.writeBigInt64LE(frequencySeconds, 8);
      const data = Buffer.concat([IX_DISCRIMINATOR.createFlowpay, argsBuf]);

      // Account order MUST exactly match the Rust `CreateFlowpay` struct.
      const keys = [
        { pubkey: payer, isSigner: true, isWritable: true },
        { pubkey: payee, isSigner: false, isWritable: true },
        { pubkey: tokenMint, isSigner: false, isWritable: false },
        { pubkey: payerAta, isSigner: false, isWritable: true },
        { pubkey: flowpayPda, isSigner: false, isWritable: true },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ];

      const ix = new TransactionInstruction({
        programId: FLOWPAY_PROGRAM_ID,
        keys,
        data,
      });

      const tx = new Transaction().add(ix);
      const sig = await provider.sendAndConfirm(tx);
      return { sig, flowpayPda };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
    },
  });
}