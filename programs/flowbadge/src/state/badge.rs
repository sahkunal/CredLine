use anchor_lang::prelude::*;
#[account]
#[derive(InitSpace)]
pub struct BadgeAccount {
    pub authority: Pubkey,       // freelancer wallet
    pub composite_score: u32,
    pub total_contracts: u32,
    pub total_earned: u64,
    pub member_since: i64,
    pub tier: u8,                // 0=Bronze 1=Silver 2=Gold 3=Platinum
    pub bump: u8,
    pub successful_payments: u32,
    pub loans_repaid: u32,
}