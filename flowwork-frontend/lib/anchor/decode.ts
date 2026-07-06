import { PublicKey } from "@solana/web3.js";

class Reader {
  offset = 8; // skip discriminator
  constructor(private data: Buffer) {}
  pubkey() {
    const pk = new PublicKey(this.data.subarray(this.offset, this.offset + 32));
    this.offset += 32;
    return pk;
  }
  u64() {
    const v = this.data.readBigUInt64LE(this.offset);
    this.offset += 8;
    return v;
  }
  i64() {
    const v = this.data.readBigInt64LE(this.offset);
    this.offset += 8;
    return v;
  }
  u32() {
    const v = this.data.readUInt32LE(this.offset);
    this.offset += 4;
    return v;
  }
  u8() {
    const v = this.data.readUInt8(this.offset);
    this.offset += 1;
    return v;
  }
  bool() {
    return this.u8() === 1;
  }
}

// ---------- FlowPay: Flowpay ----------
export interface DecodedFlowpay {
  payer: PublicKey;
  payee: PublicKey;
  amount: bigint;
  token: PublicKey;
  frequency: bigint;
  nextPayout: bigint;
  active: boolean;
  paymentCount: number;
  bump: number;
}
export function decodeFlowpay(data: Buffer): DecodedFlowpay {
  const r = new Reader(data);
  return {
    payer: r.pubkey(),
    payee: r.pubkey(),
    amount: r.u64(),
    token: r.pubkey(),
    frequency: r.i64(),
    nextPayout: r.i64(),
    active: r.bool(),
    paymentCount: r.u32(),
    bump: r.u8(),
  };
}

// ---------- FlowScore: ScoreAccount ----------

export interface DecodedScoreAccount {
  authority: PublicKey;
  paymentScore: number;
  defaultPenalty: number;
  composite: number;
  totalContracts: number;
  totalEarned: bigint;
  lastUpdated: bigint;
  kycVerified: boolean;
  kycProvider: PublicKey;
  bump: number;
}
export function decodeScoreAccount(data: Buffer): DecodedScoreAccount {
  const r = new Reader(data);
  return {
    authority: r.pubkey(),
    paymentScore: r.u32(),
    defaultPenalty: r.u32(),
    composite: r.u32(),
    totalContracts: r.u32(),
    totalEarned: r.u64(),
    lastUpdated: r.i64(),
    kycVerified: r.bool(),
    kycProvider: r.pubkey(),
    bump: r.u8(),
  };
}

// ---------- FlowBadge: BadgeAccount ----------

export interface DecodedBadgeAccount {
  authority: PublicKey;
  compositeScore: number;
  totalContracts: number;
  totalEarned: bigint;
  memberSince: bigint;
  tier: number; // 0=Bronze 1=Silver 2=Gold 3=Platinum
  bump: number;
}
export function decodeBadgeAccount(data: Buffer): DecodedBadgeAccount {
  const r = new Reader(data);
  return {
    authority: r.pubkey(),
    compositeScore: r.u32(),
    totalContracts: r.u32(),
    totalEarned: r.u64(),
    memberSince: r.i64(),
    tier: r.u8(),
    bump: r.u8(),
  };
}

// ---------- FlowLend: LoanAccount ----------
export interface DecodedLoanAccount {
  worker: PublicKey;
  amount: bigint;
  dueDate: bigint;
  repaid: boolean;
  bump: number;
}
export function decodeLoanAccount(data: Buffer): DecodedLoanAccount {
  const r = new Reader(data);
  return {
    worker: r.pubkey(),
    amount: r.u64(),
    dueDate: r.i64(),
    repaid: r.bool(),
    bump: r.u8(),
  };
}

// ---------- FlowLend: LendingPool ----------
export interface DecodedLendingPool {
  authority: PublicKey;
  totalDeposits: bigint;
  availableLiquidity: bigint;
  minimumScore: number;
  bump: number;
}
export function decodeLendingPool(data: Buffer): DecodedLendingPool {
  const r = new Reader(data);
  return {
    authority: r.pubkey(),
    totalDeposits: r.u64(),
    availableLiquidity: r.u64(),
    minimumScore: r.u32(),
    bump: r.u8(),
  };
}