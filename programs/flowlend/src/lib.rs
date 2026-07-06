
use anchor_lang::prelude::*;

declare_id!("2ftLyg3WpPoLdbRT1Hdy2gYGeizspERPkyR3rKxJA3Kc");

pub mod instructions;
pub mod state;
pub mod errors;

use instructions::{
    borrow::*,
    repay::*,
    initialize_pool::*,
    liquidate_defaulted_loan::*,
    deposit::*,
    withdraw::*,
};

#[program]
pub mod flowlend {
    use super::*;

    pub fn borrow(ctx: Context<Borrow>, amount: u64) -> Result<()> {
        ctx.accounts.process(amount, &ctx.bumps)
    }
    pub fn repay(ctx: Context<Repay>, amount: u64) -> Result<()> {
        ctx.accounts.process(amount)
    }
    pub fn initialize_pool(ctx: Context<InitializePool>, minimum_score: u32, initial_liquidity: u64) -> Result<()> {
    ctx.accounts.process(minimum_score, initial_liquidity, &ctx.bumps)
}
    pub fn liquidate_defaulted_loan(ctx: Context<LiquidateDefaultedLoan>) -> Result<()> {
        ctx.accounts.process()
     }

     pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        ctx.accounts.process(amount)
}

    pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
        ctx.accounts.process(amount)
    }
}
