// Drop-in path: programs/flowlend/src/instructions/liquidate_defaulted_loan.rs
//
// Permissionless — anyone can call this once a loan is past due_date and
// unrepaid. Closes the LoanAccount, keeps the pool's books honest (writes
// off the outstanding amount from total_lent so it isn't phantom-tracked
// forever), and CPIs into FlowScore with on_time = false so the -40
// default penalty actually lands. Add a small caller-reward transfer here
// later if you want to incentivize keepers to call this promptly.

use anchor_lang::prelude::*;
use crate::state::{LoanAccount, VaultAccount, LendingPool};
use crate::errors::FlowLendError;
use flowscore::ID as FLOW_SCORE_PROGRAM_ID;

#[derive(Accounts)]
pub struct LiquidateDefaultedLoan<'info> {
    pub caller: Signer<'info>,

    /// CHECK: the worker who defaulted, read from loan_account.worker via has_one
    pub worker: UncheckedAccount<'info>,

    #[account(
        mut,
        has_one = worker,
        seeds = [b"loan", worker.key().as_ref()],
        bump = loan_account.bump,
        constraint = !loan_account.repaid @ FlowLendError::AlreadyRepaid,
        close = worker, // rent goes back to the worker, not the caller
    )]
    pub loan_account: Account<'info, LoanAccount>,

    #[account(
        mut,
        seeds = [b"lending_pool"],
        bump = lending_pool.bump,
    )]
    pub lending_pool: Account<'info, LendingPool>,

    #[account(
        mut,
        seeds = [b"vault"],
        bump = vault_account.bump,
    )]
    pub vault_account: Account<'info, VaultAccount>,

    /// CHECK: FlowScore validates this account's seeds/bump itself
    #[account(mut)]
    pub worker_score: UncheckedAccount<'info>,

    /// CHECK: constrained to the known FlowScore program id
    #[account(
        constraint = flow_score_program.key() == FLOW_SCORE_PROGRAM_ID
            @ FlowLendError::ScoreTooLow,
    )]
    pub flow_score_program: UncheckedAccount<'info>,
}

impl<'info> LiquidateDefaultedLoan<'info> {
    pub fn process(&mut self) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;

        require!(
            now > self.loan_account.due_date,
            FlowLendError::LoanNotYetOverdue
        );

        // Write off the outstanding principal — it's not coming back to the
        // vault, so remove it from total_lent (available_liquidity was
        // already decremented at borrow time and correctly stays that way;
        // the pool has genuinely lost this liquidity).
        self.vault_account.total_lent = self
            .vault_account
            .total_lent
            .saturating_sub(self.loan_account.amount);

        // Same CPI shape as flowlend's repay.rs, just with on_time = false.
        let data_prefix: [u8; 8] = [0xfc, 0x30, 0x79, 0xca, 0x98, 0x74, 0x22, 0x9d];
        let mut data: Vec<u8> = data_prefix.to_vec();
        data.extend_from_slice(&[false as u8]);

        let ix = anchor_lang::solana_program::instruction::Instruction {
            program_id: self.flow_score_program.key(),
            accounts: vec![
                anchor_lang::solana_program::instruction::AccountMeta::new(
                    self.vault_account.key(),
                    true,
                ),
                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                    self.worker.key(),
                    false,
                ),
                anchor_lang::solana_program::instruction::AccountMeta::new(
                    self.worker_score.key(),
                    false,
                ),
            ],
            data,
        };

        let vault_seeds: &[&[u8]] = &[b"vault", &[self.vault_account.bump]];
        anchor_lang::solana_program::program::invoke_signed(
            &ix,
            &[
                self.vault_account.to_account_info(),
                self.worker.to_account_info(),
                self.worker_score.to_account_info(),
                self.flow_score_program.to_account_info(),
            ],
            &[vault_seeds],
        )?;

        msg!(
            "Loan of {} USDC for {} liquidated as defaulted.",
            self.loan_account.amount,
            self.worker.key()
        );
        Ok(())
    }
}