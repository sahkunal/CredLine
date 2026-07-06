use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct ScoreAccount {
    pub authority: Pubkey,
    pub payment_score: u32,
    pub default_penalty: u32,
    pub composite: u32,
    pub total_contracts: u32,
    pub total_earned: u64,
    pub last_updated: i64,
    pub kyc_verified: bool,
    pub kyc_provider: Pubkey,
    pub bump: u8,
}
