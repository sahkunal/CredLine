

import { PublicKey } from "@solana/web3.js";
import {
  FLOWPAY_PROGRAM_ID,
  FLOWSCORE_PROGRAM_ID,
  FLOWBADGE_PROGRAM_ID,
  FLOWLEND_PROGRAM_ID,
} from "./program-ids";

export function deriveFlowPayContractPda(
  payer: PublicKey,
  payee: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("flowpay"), payer.toBuffer(), payee.toBuffer()],
    FLOWPAY_PROGRAM_ID
  );
}

/** Seeds: ["payment_history", flowpay, payment_count (u32 LE)] */
export function derivePaymentHistoryPda(
  flowpay: PublicKey,
  paymentCount: number
): [PublicKey, number] {
  const countBuf = Buffer.alloc(4);
  countBuf.writeUInt32LE(paymentCount, 0);
  return PublicKey.findProgramAddressSync(
    [Buffer.from("payment_history"), flowpay.toBuffer(), countBuf],
    FLOWPAY_PROGRAM_ID
  );
}

export function deriveScoreAccountPda(wallet: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("score"), wallet.toBuffer()],
    FLOWSCORE_PROGRAM_ID
  );
}

export function deriveBadgeAccountPda(wallet: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("badge"), wallet.toBuffer()],
    FLOWBADGE_PROGRAM_ID
  );
}

export function deriveLoanAccountPda(wallet: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("loan"), wallet.toBuffer()],
    FLOWLEND_PROGRAM_ID
  );
}

/** Corrected — matches `seeds = [b"lending_pool"]` in initialize_pool.rs */
export function deriveLendingPoolPda(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("lending_pool")],
    FLOWLEND_PROGRAM_ID
  );
}

/** New — the pool's internal bookkeeping account, seeds = ["vault"] */
export function deriveVaultAccountPda(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("vault")],
    FLOWLEND_PROGRAM_ID
  );
}

/** New — the actual token account holding pool liquidity, seeds = ["vault_token"] */
export function deriveVaultTokenPda(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("vault_token")],
    FLOWLEND_PROGRAM_ID
  );
}