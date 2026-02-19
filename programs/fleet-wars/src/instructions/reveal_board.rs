use anchor_lang::prelude::*;
use sha2::{Digest, Sha256};
use crate::state::{Game, game_state, TOTAL_SHIP_CELLS};
use crate::error::FleetWarsError;

pub fn handler(ctx: Context<RevealBoard>, board: u64, salt: [u8; 32]) -> Result<()> {
    let game = &mut ctx.accounts.game;

    require!(
        game.game_state == game_state::WAITING_REVEAL,
        FleetWarsError::InvalidGameState
    );

    // Validate board has exactly TOTAL_SHIP_CELLS bits set
    require!(
        board.count_ones() == TOTAL_SHIP_CELLS as u32,
        FleetWarsError::InvalidBoard
    );

    let player = ctx.accounts.player.key();
    let board_bytes = board.to_le_bytes();
    let mut hasher = Sha256::new();
    hasher.update(board_bytes);
    hasher.update(salt);
    let computed_hash: [u8; 32] = hasher.finalize().into();

    if player == game.player1 {
        require!(!game.p1_revealed, FleetWarsError::InvalidGameState);
        require!(
            computed_hash == game.p1_board_hash,
            FleetWarsError::BoardHashMismatch
        );
        game.p1_board = board;
        game.p1_revealed = true;
        msg!("Player1 revealed board");
    } else if player == game.player2 {
        require!(!game.p2_revealed, FleetWarsError::InvalidGameState);
        require!(
            computed_hash == game.p2_board_hash,
            FleetWarsError::BoardHashMismatch
        );
        game.p2_board = board;
        game.p2_revealed = true;
        msg!("Player2 revealed board");
    } else {
        return Err(FleetWarsError::Unauthorized.into());
    }

    Ok(())
}

#[derive(Accounts)]
pub struct RevealBoard<'info> {
    #[account(mut)]
    pub game: Account<'info, Game>,
    pub player: Signer<'info>,
}
