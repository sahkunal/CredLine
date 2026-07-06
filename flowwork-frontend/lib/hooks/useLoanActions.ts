
"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, Transaction, TransactionInstruction, SystemProgram } from "@solana/web3.js";
import { getAnchorProvider } from "@/lib/anchor/provider";
import { FLOWLEND_PROGRAM_ID, FLOWSCORE_PROGRAM_ID } from "@/lib/anchor/program-ids";
import {
  deriveScoreAccountPda,
  deriveLendingPoolPda,
  deriveVaultAccountPda,
  deriveVaultTokenPda,
  deriveLoanAccountPda,
} from "@/lib/anchor/pda";
import { deriveAta, TOKEN_PROGRAM_ID } from "@/lib/anchor/spl";
import { IX_DISCRIMINATOR } from "@/lib/anchor/discriminators";

interface BorrowArgs {
  usdcMint: PublicKey;
  amount: bigint;
}

export function useBorrow() {
  const wallet = useWallet();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ usdcMint, amount }: BorrowArgs) => {
      const provider = getAnchorProvider(wallet);
      if (!provider || !wallet.publicKey) throw new Error("Connect your wallet first.");
      const worker = wallet.publicKey;

      const [workerScorePda] = deriveScoreAccountPda(worker);
      const [lendingPoolPda] = deriveLendingPoolPda();
      const [vaultAccountPda] = deriveVaultAccountPda();
      const [vaultTokenPda] = deriveVaultTokenPda();
      const [loanAccountPda] = deriveLoanAccountPda(worker);
      const workerAta = deriveAta(worker, usdcMint);

      const argsBuf = Buffer.alloc(8);
      argsBuf.writeBigUInt64LE(amount, 0);
      const data = Buffer.concat([IX_DISCRIMINATOR.borrow, argsBuf]);

      // Account order MUST exactly match the Rust `Borrow` struct.
      const keys = [
        { pubkey: worker, isSigner: true, isWritable: true },
        { pubkey: workerScorePda, isSigner: false, isWritable: false },
        { pubkey: lendingPoolPda, isSigner: false, isWritable: true },
        { pubkey: vaultAccountPda, isSigner: false, isWritable: true },
        { pubkey: vaultTokenPda, isSigner: false, isWritable: true },
        { pubkey: workerAta, isSigner: false, isWritable: true },
        { pubkey: loanAccountPda, isSigner: false, isWritable: true },
        { pubkey: usdcMint, isSigner: false, isWritable: false },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ];

      const ix = new TransactionInstruction({ programId: FLOWLEND_PROGRAM_ID, keys, data });
      return provider.sendAndConfirm(new Transaction().add(ix));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loan"] });
      queryClient.invalidateQueries({ queryKey: ["poolStats"] });
    },
  });
}

interface RepayArgs {
  usdcMint: PublicKey;
  amount: bigint;
}

export function useRepay() {
  const wallet = useWallet();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ usdcMint, amount }: RepayArgs) => {
      const provider = getAnchorProvider(wallet);
      if (!provider || !wallet.publicKey) throw new Error("Connect your wallet first.");
      const worker = wallet.publicKey;

      const [loanAccountPda] = deriveLoanAccountPda(worker);
      const [lendingPoolPda] = deriveLendingPoolPda();
      const [vaultAccountPda] = deriveVaultAccountPda();
      const [vaultTokenPda] = deriveVaultTokenPda();
      const [workerScorePda] = deriveScoreAccountPda(worker);
      const workerAta = deriveAta(worker, usdcMint);

      const argsBuf = Buffer.alloc(8);
      argsBuf.writeBigUInt64LE(amount, 0);
      const data = Buffer.concat([IX_DISCRIMINATOR.repay, argsBuf]);

      // Account order MUST exactly match the Rust `Repay` struct.
      const keys = [
        { pubkey: worker, isSigner: true, isWritable: true },
        { pubkey: loanAccountPda, isSigner: false, isWritable: true },
        { pubkey: lendingPoolPda, isSigner: false, isWritable: true },
        { pubkey: vaultAccountPda, isSigner: false, isWritable: true },
        { pubkey: vaultTokenPda, isSigner: false, isWritable: true },
        { pubkey: workerAta, isSigner: false, isWritable: true },
        { pubkey: workerScorePda, isSigner: false, isWritable: true },
        { pubkey: FLOWSCORE_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: usdcMint, isSigner: false, isWritable: false },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ];

      const ix = new TransactionInstruction({ programId: FLOWLEND_PROGRAM_ID, keys, data });
      return provider.sendAndConfirm(new Transaction().add(ix));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loan"] });
      queryClient.invalidateQueries({ queryKey: ["poolStats"] });
      queryClient.invalidateQueries({ queryKey: ["scoreAccount"] });
      queryClient.invalidateQueries({ queryKey: ["badge"] });
    },
  });
}


interface LiquidateArgs {
  worker: PublicKey;
  usdcMint: PublicKey; // kept for symmetry/future use even though this ix doesn't move tokens
}

export function useLiquidateDefaultedLoan() {
  const wallet = useWallet();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ worker }: LiquidateArgs) => {
      const provider = getAnchorProvider(wallet);
      if (!provider || !wallet.publicKey) throw new Error("Connect your wallet first.");

      const [loanAccountPda] = deriveLoanAccountPda(worker);
      const [lendingPoolPda] = deriveLendingPoolPda();
      const [vaultAccountPda] = deriveVaultAccountPda();
      const [workerScorePda] = deriveScoreAccountPda(worker);

      // Account order MUST exactly match the Rust `LiquidateDefaultedLoan` struct.
      const keys = [
        { pubkey: wallet.publicKey, isSigner: true, isWritable: false }, // caller
        { pubkey: worker, isSigner: false, isWritable: false },
        { pubkey: loanAccountPda, isSigner: false, isWritable: true },
        { pubkey: lendingPoolPda, isSigner: false, isWritable: true },
        { pubkey: vaultAccountPda, isSigner: false, isWritable: true },
        { pubkey: workerScorePda, isSigner: false, isWritable: true },
        { pubkey: FLOWSCORE_PROGRAM_ID, isSigner: false, isWritable: false },
      ];

      const ix = new TransactionInstruction({
        programId: FLOWLEND_PROGRAM_ID,
        keys,
        data: IX_DISCRIMINATOR.liquidateDefaultedLoan,
      });
      return provider.sendAndConfirm(new Transaction().add(ix));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loan"] });
      queryClient.invalidateQueries({ queryKey: ["poolStats"] });
      queryClient.invalidateQueries({ queryKey: ["scoreAccount"] });
      queryClient.invalidateQueries({ queryKey: ["badge"] });
    },
  });
}