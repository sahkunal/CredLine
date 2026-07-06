// Drop-in path: programs/flowlend/src/instructions/withdraw.rs
//
// Authority-only (unlike deposit, which is open to anyone). Withdraws
// idle liquidity — capped by available_liquidity so you can never pull
// out funds that are currently out on loan.

use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface, TransferChecked, transfer_checked};
use crate::state::{VaultAccount, LendingPool};
use crate::errors::FlowLendError;

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut, has_one = authority)]
    pub lending_pool: Account<'info, LendingPool>,
    pub authority: Signer<'info>,

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
        token::authority = authority,
    )]
    pub authority_token: InterfaceAccount<'info, TokenAccount>,

    /// CHECK: USDC mint, verified via token account constraints above
    pub usdc_mint: InterfaceAccount<'info, Mint>,

    pub token_program: Interface<'info, TokenInterface>,
}

impl<'info> Withdraw<'info> {
    pub fn process(&mut self, amount: u64) -> Result<()> {
        require!(
            amount <= self.lending_pool.available_liquidity,
            FlowLendError::InsufficientLiquidity
        );

        let vault_seeds: &[&[u8]] = &[b"vault", &[self.vault_account.bump]];
        transfer_checked(
            CpiContext::new_with_signer(
                self.token_program.to_account_info(),
                TransferChecked {
                    from: self.vault_token.to_account_info(),
                    to: self.authority_token.to_account_info(),
                    authority: self.vault_account.to_account_info(),
                    mint: self.usdc_mint.to_account_info(),
                },
                &[vault_seeds],
            ),
            amount,
            self.usdc_mint.decimals,
        )?;

        self.lending_pool.total_deposits = self
            .lending_pool
            .total_deposits
            .saturating_sub(amount);
        self.lending_pool.available_liquidity = self
            .lending_pool
            .available_liquidity
            .saturating_sub(amount);
        self.vault_account.total_deposited = self
            .vault_account
            .total_deposited
            .saturating_sub(amount);

        msg!("{} USDC withdrawn by pool authority", amount);
        Ok(())
    }
}