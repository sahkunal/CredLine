use anchor_lang::prelude::*;
use crate::state::ScoreAccount;


#[derive(Accounts)]
pub struct UpdateScoreOnPayment<'info> {
    #[account(mut)]
    pub payer_signer: Signer<'info>, // FlowPay program (CPI signer / authority)

    /// CHECK: wallet being credited (the worker/payee)
    pub payee: UncheckedAccount<'info>,
    /// CHECK: wallet being credited (the client/payer)
    pub payer_wallet: UncheckedAccount<'info>,

    #[account(
        init_if_needed,
        payer = payer_signer,
        space = 8 + ScoreAccount::INIT_SPACE,
        seeds = [b"score", payee.key().as_ref()],
        bump,
    )]
    pub payee_score: Account<'info, ScoreAccount>,

    #[account(
        init_if_needed,
        payer = payer_signer,
        space = 8 + ScoreAccount::INIT_SPACE,
        seeds = [b"score", payer_wallet.key().as_ref()],
        bump,
    )]
    pub payer_score: Account<'info, ScoreAccount>,

    pub system_program: Program<'info, System>,
}

impl<'info> UpdateScoreOnPayment<'info> {
    pub fn process(&mut self, amount: u64, bumps: &UpdateScoreOnPaymentBumps) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;

        // --- Update payee (worker) score ---
        if self.payee_score.authority == Pubkey::default() {
            self.payee_score.authority = self.payee.key();
            self.payee_score.composite = 500;
            self.payee_score.bump = bumps.payee_score;
        }
        self.payee_score.payment_score += 10;
        self.payee_score.total_contracts += 1;
        self.payee_score.total_earned = self.payee_score.total_earned.saturating_add(amount);
        self.payee_score.composite = recalculate(
            self.payee_score.payment_score,
            self.payee_score.default_penalty,
        );
        self.payee_score.last_updated = now;

        // --- Update payer (client) score ---
        if self.payer_score.authority == Pubkey::default() {
            self.payer_score.authority = self.payer_wallet.key();
            self.payer_score.composite = 500;
            self.payer_score.bump = bumps.payer_score;
        }
        self.payer_score.payment_score += 10;
        self.payer_score.composite = recalculate(
            self.payer_score.payment_score,
            self.payer_score.default_penalty,
        );
        self.payer_score.last_updated = now;

        Ok(())
    }
}


use crate::errors::FlowScoreError;

const GRACE_PERIOD: i64 = 86_400; 

#[derive(Accounts)]
pub struct ReportMissedPayment<'info> {
    pub reporter: Signer<'info>,

    pub flowpay: UncheckedAccount<'info>,

    pub payer_wallet: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [b"score", payer_wallet.key().as_ref()],
        bump = payer_score.bump,
    )]
    pub payer_score: Account<'info, ScoreAccount>,
}

impl<'info> ReportMissedPayment<'info> {
    pub fn process(&mut self, next_payout: i64) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;

        require!(
            now > next_payout + GRACE_PERIOD,
            FlowScoreError::PaymentNotYetOverdue
        );

        self.payer_score.default_penalty += 20;
        self.payer_score.composite = recalculate(
            self.payer_score.payment_score,
            self.payer_score.default_penalty,
        );
        self.payer_score.last_updated = now;

        Ok(())
    }
}
#[derive(Accounts)]
pub struct ReportFailedPayment<'info> {
    pub caller: Signer<'info>, 

    /// CHECK: client wallet
    pub payer_wallet: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [b"score", payer_wallet.key().as_ref()],
        bump = payer_score.bump,
    )]
    pub payer_score: Account<'info, ScoreAccount>,
}

impl<'info> ReportFailedPayment<'info> {
    pub fn process(&mut self, reason: FailureReason) -> Result<()> {
        let penalty = match reason {
            FailureReason::InsufficientFunds  => 30,
            FailureReason::RevokedDelegate    => 50,
        };
        self.payer_score.default_penalty += penalty;
        self.payer_score.composite = recalculate(
            self.payer_score.payment_score,
            self.payer_score.default_penalty,
        );
        self.payer_score.last_updated = Clock::get()?.unix_timestamp;
        Ok(())
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum FailureReason {
    InsufficientFunds,
    RevokedDelegate,
}
#[derive(Accounts)]
pub struct UpdateScoreOnRepay<'info> {
    #[account(mut)]
    pub caller: Signer<'info>, // FlowLend vault PDA signs this

    /// CHECK: worker wallet
    pub worker: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [b"score", worker.key().as_ref()],
        bump = worker_score.bump,
    )]
    pub worker_score: Account<'info, ScoreAccount>,
}

impl<'info> UpdateScoreOnRepay<'info> {
    pub fn process(&mut self, on_time: bool) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;

        if on_time {
            self.worker_score.payment_score += 15;   // repaid on time → +15
        } else {
            self.worker_score.default_penalty += 40; // defaulted → -40
        }

        self.worker_score.composite = recalculate(
            self.worker_score.payment_score,
            self.worker_score.default_penalty,
        );
        self.worker_score.last_updated = now;
        Ok(())
    }
}


fn recalculate(payment_score: u32, default_penalty: u32) -> u32 {
    500_u32
        .saturating_add(payment_score)
        .saturating_sub(default_penalty)
        .min(1000)
}