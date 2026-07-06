use anchor_lang::prelude::*;

#[error_code]
pub enum FlowLendError {
    #[msg("Composite score is below the pool's minimum_score threshold.")]
    ScoreTooLow,

    #[msg("An active loan already exists. Repay before borrowing again.")]
    LoanAlreadyActive,

    #[msg("Pool has insufficient liquidity to cover this loan.")]
    InsufficientLiquidity,

    #[msg("Repay amount does not match the outstanding loan amount.")]
    RepayAmountMismatch,

    #[msg("Loan is already marked as repaid.")]
    AlreadyRepaid,

    #[msg("Arithmetic overflow.")]
    Overflow,

    #[msg("Loan is not yet past its due date.")]
    LoanNotYetOverdue,
}