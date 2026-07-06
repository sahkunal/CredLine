// Drop-in path: programs/flowlend/src/instructions/deposit.rs
//
// Anyone can add liquidity to the pool after it's been initialized —
// initialize_pool only ever set the *initial* liquidity, with no way
// to top it up. This closes that gap.

use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface, TransferChecked, transfer_checked};
use crate::state::{VaultAccount, LendingPool};
use crate::errors::FlowLendError;

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut)]
    pub depositor: Signer<'info>,

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

    #[account(
        mut,
        seeds = [b"vault_token"],
        bump,
        token::mint = usdc_mint,
        token::authority = vault_account,
    )]
    pub vault_token: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        token::mint = usdc_mint,
        token::authority = depositor,
    )]
    pub depositor_token: InterfaceAccount<'info, TokenAccount>,

    /// CHECK: USDC mint, verified via token account constraints above
    pub usdc_mint: InterfaceAccount<'info, Mint>,

    pub token_program: Interface<'info, TokenInterface>,
}

impl<'info> Deposit<'info> {
    pub fn process(&mut self, amount: u64) -> Result<()> {
        require!(amount > 0, FlowLendError::Overflow);

        transfer_checked(
            CpiContext::new(
                self.token_program.to_account_info(),
                TransferChecked {
                    from: self.depositor_token.to_account_info(),
                    to: self.vault_token.to_account_info(),
                    authority: self.depositor.to_account_info(),
                    mint: self.usdc_mint.to_account_info(),
                },
            ),
            amount,
            self.usdc_mint.decimals,
        )?;

        self.lending_pool.total_deposits = self
            .lending_pool
            .total_deposits
            .checked_add(amount)
            .ok_or(FlowLendError::Overflow)?;
        self.lending_pool.available_liquidity = self
            .lending_pool
            .available_liquidity
            .checked_add(amount)
            .ok_or(FlowLendError::Overflow)?;
        self.vault_account.total_deposited = self
            .vault_account
            .total_deposited
            .checked_add(amount)
            .ok_or(FlowLendError::Overflow)?;

        msg!("{} USDC deposited by {}", amount, self.depositor.key());
        Ok(())
    }
}