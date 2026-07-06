

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
import {
  FLOWPAY_PROGRAM_ID,
  FLOWSCORE_PROGRAM_ID,
} from "@/lib/anchor/program-ids";
import {
  deriveFlowPayContractPda,
  derivePaymentHistoryPda,
  deriveScoreAccountPda,
} from "@/lib/anchor/pda";
import { deriveAta, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from "@/lib/anchor/spl";
import { decodeFlowpay } from "@/lib/anchor/decode";
import { IX_DISCRIMINATOR } from "@/lib/anchor/discriminators";

interface ExecuteFlowpayArgs {
  payer: PublicKey;
  payee: PublicKey;
}

export function useExecuteFlowpay() {
  const wallet = useWallet();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ payer, payee }: ExecuteFlowpayArgs) => {
      const provider = getAnchorProvider(wallet);
      if (!provider || !wallet.publicKey) {
        throw new Error("Connect your wallet first.");
      }

      const [flowpayPda] = deriveFlowPayContractPda(payer, payee);

      // Fetch fresh — payment_count must be current or the
      // payment_history PDA we derive below will be wrong and the
      // instruction will fail with a seeds-constraint error.
      const flowpayAccountInfo = await provider.connection.getAccountInfo(
        flowpayPda
      );
      if (!flowpayAccountInfo) {
        throw new Error("Flowpay contract not found on-chain.");
      }
      const flowpay = decodeFlowpay(flowpayAccountInfo.data);

      if (!flowpay.active) {
        throw new Error("This contract has been cancelled.");
      }

      const now = Math.floor(Date.now() / 1000);
      if (now < Number(flowpay.nextPayout)) {
        throw new Error("Payment isn't due yet.");
      }

      const [paymentHistoryPda] = derivePaymentHistoryPda(
        flowpayPda,
        flowpay.paymentCount
      );
      const [payeeScorePda] = deriveScoreAccountPda(payee);
      const [payerScorePda] = deriveScoreAccountPda(payer);

      const payerAta = deriveAta(payer, flowpay.token);
      const payeeAta = deriveAta(payee, flowpay.token);

      // Account order MUST exactly match the Rust `ExecuteFlowpay` struct.
      const keys = [
        { pubkey: wallet.publicKey, isSigner: true, isWritable: true }, // signer
        { pubkey: payer, isSigner: false, isWritable: true },
        { pubkey: payerAta, isSigner: false, isWritable: true },
        { pubkey: payee, isSigner: false, isWritable: true },
        { pubkey: flowpayPda, isSigner: false, isWritable: true },
        { pubkey: paymentHistoryPda, isSigner: false, isWritable: true },
        { pubkey: flowpay.token, isSigner: false, isWritable: false },
        { pubkey: payeeAta, isSigner: false, isWritable: true },
        { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: FLOWSCORE_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: payeeScorePda, isSigner: false, isWritable: true },
        { pubkey: payerScorePda, isSigner: false, isWritable: true },
      ];

      const ix = new TransactionInstruction({
        programId: FLOWPAY_PROGRAM_ID,
        keys,
        data: IX_DISCRIMINATOR.executeFlowpay, // no args, just the 8-byte tag
      });

      const tx = new Transaction().add(ix);
      const sig = await provider.sendAndConfirm(tx);
      return sig;
    },
    onSuccess: (_sig, { payer, payee }) => {
      // Refresh anything that shows updated balances/scores/history
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      queryClient.invalidateQueries({ queryKey: ["scoreAccount", payer.toBase58()] });
      queryClient.invalidateQueries({ queryKey: ["scoreAccount", payee.toBase58()] });
    },
  });
}