

"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, Transaction, TransactionInstruction } from "@solana/web3.js";
import { getAnchorProvider } from "@/lib/anchor/provider";
import { FLOWLEND_PROGRAM_ID } from "@/lib/anchor/program-ids";
import { deriveLendingPoolPda, deriveVaultAccountPda, deriveVaultTokenPda } from "@/lib/anchor/pda";
import { deriveAta, TOKEN_PROGRAM_ID } from "@/lib/anchor/spl";
import { IX_DISCRIMINATOR } from "@/lib/anchor/discriminators";

interface AmountArgs {
  usdcMint: PublicKey;
  amount: bigint;
}

export function useDepositLiquidity() {
  const wallet = useWallet();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ usdcMint, amount }: AmountArgs) => {
      const provider = getAnchorProvider(wallet);
      if (!provider || !wallet.publicKey) throw new Error("Connect your wallet first.");
      const depositor = wallet.publicKey;

      const [lendingPoolPda] = deriveLendingPoolPda();
      const [vaultAccountPda] = deriveVaultAccountPda();
      const [vaultTokenPda] = deriveVaultTokenPda();
      const depositorAta = deriveAta(depositor, usdcMint);

      const argsBuf = Buffer.alloc(8);
      argsBuf.writeBigUInt64LE(amount, 0);
      const data = Buffer.concat([IX_DISCRIMINATOR.deposit, argsBuf]);

      // Account order MUST exactly match the Rust `Deposit` struct.
      const keys = [
        { pubkey: depositor, isSigner: true, isWritable: true },
        { pubkey: lendingPoolPda, isSigner: false, isWritable: true },
        { pubkey: vaultAccountPda, isSigner: false, isWritable: true },
        { pubkey: vaultTokenPda, isSigner: false, isWritable: true },
        { pubkey: depositorAta, isSigner: false, isWritable: true },
        { pubkey: usdcMint, isSigner: false, isWritable: false },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      ];

      const ix = new TransactionInstruction({ programId: FLOWLEND_PROGRAM_ID, keys, data });
      return provider.sendAndConfirm(new Transaction().add(ix));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["poolStats"] }),
  });
}

export function useWithdrawLiquidity() {
  const wallet = useWallet();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ usdcMint, amount }: AmountArgs) => {
      const provider = getAnchorProvider(wallet);
      if (!provider || !wallet.publicKey) throw new Error("Connect your wallet first.");
      const authority = wallet.publicKey;

      const [lendingPoolPda] = deriveLendingPoolPda();
      const [vaultAccountPda] = deriveVaultAccountPda();
      const [vaultTokenPda] = deriveVaultTokenPda();
      const authorityAta = deriveAta(authority, usdcMint);

      const argsBuf = Buffer.alloc(8);
      argsBuf.writeBigUInt64LE(amount, 0);
      const data = Buffer.concat([IX_DISCRIMINATOR.withdraw, argsBuf]);

      // Account order MUST exactly match the Rust `Withdraw` struct.
      const keys = [
        { pubkey: lendingPoolPda, isSigner: false, isWritable: true },
        { pubkey: authority, isSigner: true, isWritable: false },
        { pubkey: vaultAccountPda, isSigner: false, isWritable: true },
        { pubkey: vaultTokenPda, isSigner: false, isWritable: true },
        { pubkey: authorityAta, isSigner: false, isWritable: true },
        { pubkey: usdcMint, isSigner: false, isWritable: false },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      ];

      const ix = new TransactionInstruction({ programId: FLOWLEND_PROGRAM_ID, keys, data });
      return provider.sendAndConfirm(new Transaction().add(ix));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["poolStats"] }),
  });
}