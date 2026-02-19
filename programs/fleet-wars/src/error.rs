use anchor_lang::prelude::*;

#[error_code]
pub enum FleetWarsError {
    #[msg("Game is not in the expected state")]
    InvalidGameState,
    #[msg("Not your turn")]
    NotYourTurn,
    #[msg("Cell already shot")]
    CellAlreadyShot,
    #[msg("Invalid cell — out of bounds (0–63)")]
    InvalidCell,
    #[msg("Game is not active")]
    GameNotActive,
    #[msg("Board hash mismatch — cheater detected")]
    BoardHashMismatch,
    #[msg("Invalid board: must have exactly 9 ship cells")]
    InvalidBoard,
    #[msg("Both players must reveal before finalize")]
    GameNotReady,
    #[msg("Unauthorized")]
    Unauthorized,
}
