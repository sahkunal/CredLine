"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useWallet } from "@solana/wallet-adapter-react";
import { Transaction, TransactionInstruction, SystemProgram } from "@solana/web3.js";
import { getAnchorProvider } from "@/lib/anchor/provider";
import { FLOWBADGE_PROGRAM_ID } from "@/lib/anchor/program-ids";
import { deriveScoreAccountPda, deriveBadgeAccountPda } from "@/lib/anchor/pda";
import { IX_DISCRIMINATOR } from "@/lib/anchor/discriminators";

export function useMintBadge() {
  const wallet = useWallet();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const provider = getAnchorProvider(wallet);
      if (!provider || !wallet.publicKey) throw new Error("Connect your wallet first.");
      const authority = wallet.publicKey;

      const [scorePda] = deriveScoreAccountPda(authority);
      const [badgePda] = deriveBadgeAccountPda(authority);

      // Account order MUST exactly match the Rust `MintBadge` struct.
      const keys = [
        { pubkey: authority, isSigner: true, isWritable: true },
        { pubkey: scorePda, isSigner: false, isWritable: false },
        { pubkey: badgePda, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ];

      const ix = new TransactionInstruction({
        programId: FLOWBADGE_PROGRAM_ID,
        keys,
        data: IX_DISCRIMINATOR.mintBadge,
      });
      return provider.sendAndConfirm(new Transaction().add(ix));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["badge"] });
    },
  });
}

export function useUpdateBadge() {
  const wallet = useWallet();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const provider = getAnchorProvider(wallet);
      if (!provider || !wallet.publicKey) throw new Error("Connect your wallet first.");
      const authority = wallet.publicKey;

      const [scorePda] = deriveScoreAccountPda(authority);
      const [badgePda] = deriveBadgeAccountPda(authority);

      const keys = [
        { pubkey: authority, isSigner: true, isWritable: false },
        { pubkey: scorePda, isSigner: false, isWritable: false },
        { pubkey: badgePda, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ];

      const ix = new TransactionInstruction({
        programId: FLOWBADGE_PROGRAM_ID,
        keys,
        data: IX_DISCRIMINATOR.updateBadge,
      });
      return provider.sendAndConfirm(new Transaction().add(ix));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["badge"] });
    },
  });
}