# cred_line 🔗

> **On-chain credit infrastructure for the gig economy, powered by Solana.**

**CredLine** is a suite of Solana programs designed to help freelancers and gig workers build a verifiable, on-chain financial identity through their work and payment history. Every payment received, contract completed, and loan repaid contributes to a growing credit profile, creating opportunities to access financial services and decentralized lending.

**No traditional credit history. No banking barriers. Just verifiable financial activity on-chain.**

---

## The Problem

Freelancers and gig workers generate consistent income, complete contracts, and make repayments, yet their financial reliability often goes unrecognized. Their payment history is scattered across platforms, leaving them without a unified credit identity that proves their financial credibility.

Traditional financial institutions often lack the data to assess these workers, while most DeFi lending protocols rely on collateral rather than demonstrated financial behavior.

**CredLine bridges this gap** by transforming real financial activity into verifiable on-chain credit profiles, making financial reputation portable, transparent, and accessible.

## How It Works

```
Client creates contract → Worker gets paid every interval
        ↓
Each payment CPIs into FlowScore → updates BOTH parties' reputation
        ↓
Anyone calls mint_badge once worker's score crosses 400 → soulbound badge
        ↓
Anyone calls update_badge periodically → tier upgrades as score climbs
        ↓
Score crosses pool minimum → worker can borrow USDC from FlowLend
        ↓
Loan repaid on time → FlowLend CPIs into FlowScore → score improves further
        ↓
Contract ends → badge stays. Forever.
```

---

## Programs

### 🔁 FlowPay
The recurring payment engine. A client creates a contract, approves an SPL delegate, and payments fire automatically at every interval — enforced entirely by Solana's on-chain clock, so no trusted backend is needed.

- `create_flowpay` — initializes the contract and SPL delegate
- `execute_flowpay` — fires once an interval has elapsed, transfers USDC, records `PayHistory`, and **CPIs into FlowScore only** to update both parties' scores
- `reapprove_flowpay` — tops up the delegate allowance without recreating the contract
- `cancel_flowpay` — closes the contract, revokes the delegate, returns rent
- `close_payment_history` — reclaims rent from old `PayHistory` records

### 📊 FlowScore
The reputation layer — **standalone, depends on nothing**. Every payment, success or failure, feeds into a composite score for both the worker and the client. Everyone starts at 500.

**Worker scoring:**
| Event | Change |
|---|---|
| Payment received | +10 |
| Loan repaid on time | +15 |
| Loan defaulted | −40 |

**Client scoring:**
| Event | Change |
|---|---|
| Payment sent successfully | +10 |
| Payment missed (reported) | −20 |

```rust
composite = 500 + payment_score - default_penalty   // capped 0–1000
```

A missed payment only penalizes the **client** — the worker is never punished for someone else's failure. FlowScore exposes one shared `ScoreAccount` (seeded by wallet) used for both clients and workers.

### 🏅 FlowBadge
Soulbound reputation NFTs that live in a worker's wallet permanently. Anyone can call `mint_badge` once a worker's score crosses 400 — it reads `ScoreAccount` directly (no CPI, just an account reference via `seeds::program`). `update_badge` is called periodically to re-sync the tier as the score changes.

| Tier | Score |
|---|---|
| 🥉 Bronze | 400+ |
| 🥈 Silver | 600+ |
| 🥇 Gold | 750+ |
| 💎 Platinum | 900+ |

Badges are independent of the contract's lifecycle — cancelling a FlowPay contract never affects an existing badge.

### 🏦 FlowLend
Emergency USDC lending, gated by reputation. Workers with a composite score above the pool's minimum threshold can borrow directly from a PDA-owned liquidity pool.

- `borrow` — reads `ScoreAccount` (no CPI), checks `composite >= pool.minimum_score`, transfers USDC from the pool's vault, creates a `LoanAccount` with a due date
- `repay` — returns USDC to the vault, closes `LoanAccount`, and **CPIs into FlowScore** with `RepaidOnTime` or `Defaulted`

---

## Program Architecture

```text
flowpay/
├── instructions/
│   ├── create_flowpay.rs       → init contract + SPL approve
│   ├── execute_flowpay.rs       → transfer + record history + CPI → FlowScore
│   ├── reapprove_flowpay.rs     → renew delegate allowance
│   ├── cancel_flowpay.rs        → revoke delegate, close contract
│   └── close_payment_history.rs → reclaim rent from old records
└── state/
    ├── flowpay.rs               → contract state
    └── pay_history.rs           → payment records

flowscore/
├── instructions/
│   └── update_score.rs
│       ├── update_score_on_payment   → two-sided (payer + payee)
│       └── report_missed_payment     → payer-only penalty
└── state/
    └── score.rs
        └── ScoreAccount
            ├── payment_score
            ├── default_penalty
            ├── composite
            ├── total_contracts
            ├── total_earned
            ├── kyc_verified     (placeholder for future oracle)
            └── kyc_provider     (placeholder for future oracle)

flowbadge/
├── instructions/
│   ├── mint_badge.rs    → anyone-callable, reads ScoreAccount, mints once
│   └── update_badge.rs  → anyone-callable, re-syncs tier
└── state/
    └── badge.rs
        └── BadgeAccount
            ├── composite_score
            ├── total_contracts
            ├── total_earned
            ├── member_since
            └── tier

flowlend/
├── instructions/
│   ├── borrow.rs   → reads ScoreAccount, transfers from pool
│   └── repay.rs    → repays loan, CPI → FlowScore
└── state/
    ├── loan.rs   → LoanAccount (amount, due_date, repaid)
    └── pool.rs   → LendingPool (pool ATA, minimum_score, liquidity)
```

---

## Account Seeds

| Account | Seeds |
|---|---|
| Flowpay PDA | `["flowpay", payer, payee]` |
| PayHistory PDA | `["payment_history", flowpay, payment_count]` |
| ScoreAccount | `["score", wallet]` *(shared type, used for clients & workers)* |
| BadgeAccount | `["badge", worker_wallet]` |
| LoanAccount | `["loan", worker_wallet]` |
| LendingPool | `["pool"]` |

---

## Cross-Program CPI Flow

```
FlowPay (execute_flowpay)
  └── CPI → FlowScore (update_score_on_payment)   [writes — both sides scored]

FlowLend (repay)
  └── CPI → FlowScore (process_loan: RepaidOnTime | Defaulted)   [writes]

FlowBadge (mint_badge / update_badge)
  └── reads FlowScore.ScoreAccount   [no CPI — account reference only]

FlowLend (borrow)
  └── reads FlowScore.ScoreAccount   [no CPI — account reference only]

FlowScore
  └── depends on nothing. Zero outgoing CPIs.
```

**Rule of thumb:** CPI = calling another program's instruction to *write* state. Reading another program's account is just an account reference with `seeds::program = other_program::ID` — no CPI required.

---

## Tech Stack

- **Solana** — L1
- **Anchor** — program framework
- **SPL Token** — USDC transfers via delegate, on-chain clock enforcement
- **Rust + typescript** — programs and fast local integration tests

---

## Getting Started

```bash
git clone https://github.com/sahkunal/Cred_Line
cd Cred_Line

anchor build
anchor test 
```

> Program IDs for FlowScore, FlowPay, FlowBadge, and FlowLend need updating in each program's `declare_id!`, and FlowBadge/FlowLend's `Cargo.toml` need `flowscore = { path = "../flowscore", features = ["cpi"] }` to read its account types.

---

## Deployment Order

```
1. FlowScore   ← depends on nothing, deploy first
2. FlowPay     ← CPI → FlowScore
3. FlowBadge   ← reads FlowScore
4. FlowLend    ← reads + CPI → FlowScore
```

---
## Devnet Deployment

| Program   | Program ID                                     | Deployment Transaction                                                                    |
| --------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------|
| FlowPay   | `DpcbN1E3mMKBRFgg2t7LL65ThbLAhjMzzfseT6R8dxzL` | `c8etn5MzzWwe2DLvxEGcr61xukYF8BwBUAxtTvfmyePZZXK8114nszdNsgJNSm5iE3KhXmWx1MPtZzZ62ySrscN` |
| FlowScore | `BZzGSPdGew1yDkWLfmigabKd6cGkBPRoEaZnAMm8cqAK` | `scct9Af7YLwXXFeXPqdbY3VxXtL7GbBAzQ3vp6ECca8rMJbMxnmSVXYswWAZELAyhGfWtd9P1VLpPUpyjBVDoFB` |
| FlowBadge | `GimhF4JiKJfvr2ydNkqcm57zUjGaFy1FSuki1RdLAuL4` | `2A8L5Vh1cRmtxFYBwcLMMA6zL2epGc6PztCLY7wGzGNrQTsSmShRKEBAUzrivfhU9STFJNvRXNz4irnTu8qejtnE`|
| FlowLend  | `2ftLyg3WpPoLdbRT1Hdy2gYGeizspERPkyR3rKxJA3Kc` | `4u8UbhDYrXDLsfeGWU1Dnzm3hiPDZzFJdJNZqmpTemPjx2Zi9VnLnodNBzTNNWLxAZ8irnBXDAnxt7ojKWce7v21`|

**Deployment Status:** ✅ All programs successfully deployed to Solana Devnet.


## What's Next

- [ ] `initialize_pool` / deposit instruction for FlowLend liquidity providers
- [ ] Dispute resolution instruction in FlowPay
- [ ] Client score gating — workers can check a client's score before accepting a contract
- [ ] Oracle integration for KYC fields (`kyc_verified`, `kyc_provider`) already reserved in `ScoreAccount`

---

## License

MIT
