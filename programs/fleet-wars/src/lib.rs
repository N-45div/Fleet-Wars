use anchor_lang::prelude::*;
use ephemeral_rollups_sdk::anchor::ephemeral;

pub mod state;
pub mod error;
pub mod instructions;

use instructions::*;
pub use instructions::{
    create_game, delegate_game, end_session, finalize, fire_shot, join_game, respond_shot,
    reveal_board,
};

mod __client_accounts_create_game {
    pub(crate) use crate::instructions::create_game::__client_accounts_create_game::*;
}
mod __client_accounts_delegate_game {
    pub(crate) use crate::instructions::delegate_game::__client_accounts_delegate_game::*;
}
mod __client_accounts_end_session {
    pub(crate) use crate::instructions::end_session::__client_accounts_end_session::*;
}
mod __client_accounts_finalize {
    pub(crate) use crate::instructions::finalize::__client_accounts_finalize::*;
}
mod __client_accounts_fire_shot {
    pub(crate) use crate::instructions::fire_shot::__client_accounts_fire_shot::*;
}
mod __client_accounts_join_game {
    pub(crate) use crate::instructions::join_game::__client_accounts_join_game::*;
}
mod __client_accounts_respond_shot {
    pub(crate) use crate::instructions::respond_shot::__client_accounts_respond_shot::*;
}
mod __client_accounts_reveal_board {
    pub(crate) use crate::instructions::reveal_board::__client_accounts_reveal_board::*;
}

declare_id!("DiXQ85BSfM9qgPaTv6PAb2GhxRgGhfoarNGyAYJAqdJn");

#[ephemeral]
#[program]
pub mod fleet_wars {
    use super::*;

    /// Phase 1 — L1: Player1 creates a game, commits their board hash, deposits wager.
    pub fn create_game(
        ctx: Context<CreateGame>,
        game_id: u64,
        board_hash: [u8; 32],
        wager: u64,
    ) -> Result<()> {
        create_game::handler(ctx, game_id, board_hash, wager)
    }

    /// Phase 1 — L1: Player2 joins, commits their board hash, deposits wager.
    pub fn join_game(ctx: Context<JoinGame>, board_hash: [u8; 32]) -> Result<()> {
        join_game::handler(ctx, board_hash)
    }

    /// Phase 1 — L1: Player1 delegates the game account to MagicBlock Ephemeral Rollup.
    pub fn delegate_game(ctx: Context<DelegateGame>, game_id: u64) -> Result<()> {
        delegate_game::handler(ctx, game_id)
    }

    /// Phase 2 — ER: Active player fires a shot at a cell (0–63).
    pub fn fire_shot(ctx: Context<FireShot>, cell: u8) -> Result<()> {
        fire_shot::handler(ctx, cell)
    }

    /// Phase 2 — ER: Opponent declares hit or miss for the last shot.
    /// Auto-undelegates back to L1 when all ships are sunk.
    pub fn respond_shot(ctx: Context<RespondShot>, hit: bool) -> Result<()> {
        respond_shot::handler(ctx, hit)
    }

    /// Phase 2 — ER: Manually end the ER session (e.g. opponent abandoned).
    pub fn end_session(ctx: Context<EndSession>) -> Result<()> {
        end_session::handler(ctx)
    }

    /// Phase 3 — L1: Each player reveals their actual board + salt to prove honesty.
    pub fn reveal_board(ctx: Context<RevealBoard>, board: u64, salt: [u8; 32]) -> Result<()> {
        reveal_board::handler(ctx, board, salt)
    }

    /// Phase 3 — L1: Verifies both reveals, detects cheaters, pays winner.
    pub fn finalize(ctx: Context<Finalize>) -> Result<()> {
        finalize::handler(ctx)
    }
}
