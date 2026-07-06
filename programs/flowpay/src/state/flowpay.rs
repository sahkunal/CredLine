use anchor_lang::prelude::*;
#[account]
#[derive(InitSpace)]
pub struct Flowpay {
   pub payer: Pubkey,
    pub payee: Pubkey,
    pub amount: u64, 
    pub token: Pubkey,
    pub frequency: i64,
    pub next_payout: i64,
    pub active: bool,
    pub payment_count: u32,
    pub bump: u8,
}

pub const FLOWPAY_SIZE: usize = 8 + 32 + 32 + 8 + 32 + 8 + 8 + 1 + 4 + 1;