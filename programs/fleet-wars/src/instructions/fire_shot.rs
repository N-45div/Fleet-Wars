use anchor_lang::prelude::*;
use crate::state::{Game, game_state, turn_state};
use crate::error::FleetWarsError;

pub fn handler(ctx: Context<FireShot>, cell: u8) -> Result<()> {
    let game = &mut ctx.accounts.game;

    require!(game.game_state == game_state::ACTIVE, FleetWarsError::GameNotActive);
    require!(cell < 64, FleetWarsError::InvalidCell);

    let cell_bit = 1u64 << cell;

    match game.turn_state {
        t if t == turn_state::P1_FIRE => {
            require!(ctx.accounts.player.key() == game.player1, FleetWarsError::NotYourTurn);
            require!(game.p1_shots & cell_bit == 0, FleetWarsError::CellAlreadyShot);
            game.p1_shots |= cell_bit;
            game.last_shot_cell = cell;
            game.turn_state = turn_state::P2_RESPOND;
        }
        t if t == turn_state::P2_FIRE => {
            require!(ctx.accounts.player.key() == game.player2, FleetWarsError::NotYourTurn);
            require!(game.p2_shots & cell_bit == 0, FleetWarsError::CellAlreadyShot);
            game.p2_shots |= cell_bit;
            game.last_shot_cell = cell;
            game.turn_state = turn_state::P1_RESPOND;
        }
        _ => return Err(FleetWarsError::NotYourTurn.into()),
    }

    msg!("Shot fired at cell {} (row={}, col={})", cell, cell / 8, cell % 8);
    Ok(())
}

#[derive(Accounts)]
pub struct FireShot<'info> {
    #[account(mut)]
    pub game: Account<'info, Game>,
    pub player: Signer<'info>,
}
