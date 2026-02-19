use anchor_lang::prelude::*;
use crate::state::{Game, game_state, turn_state, TOTAL_SHIP_CELLS};
use crate::error::FleetWarsError;

pub fn handler(ctx: Context<RespondShot>, hit: bool) -> Result<()> {
    let game = &mut ctx.accounts.game;

    require!(game.game_state == game_state::ACTIVE, FleetWarsError::GameNotActive);

    let cell = game.last_shot_cell;
    require!(cell < 64, FleetWarsError::InvalidCell);
    let cell_bit = 1u64 << cell;

    let game_over = match game.turn_state {
        t if t == turn_state::P2_RESPOND => {
            require!(ctx.accounts.player.key() == game.player2, FleetWarsError::NotYourTurn);
            if hit {
                game.p2_declared_hits |= cell_bit;
                game.p1_hits_on_p2 = game.p1_hits_on_p2.saturating_add(1);
            }
            if game.p1_hits_on_p2 >= TOTAL_SHIP_CELLS {
                game.winner = 1;
                true
            } else {
                game.turn_state = turn_state::P2_FIRE;
                false
            }
        }
        t if t == turn_state::P1_RESPOND => {
            require!(ctx.accounts.player.key() == game.player1, FleetWarsError::NotYourTurn);
            if hit {
                game.p1_declared_hits |= cell_bit;
                game.p2_hits_on_p1 = game.p2_hits_on_p1.saturating_add(1);
            }
            if game.p2_hits_on_p1 >= TOTAL_SHIP_CELLS {
                game.winner = 2;
                true
            } else {
                game.turn_state = turn_state::P1_FIRE;
                false
            }
        }
        _ => return Err(FleetWarsError::NotYourTurn.into()),
    };

    if game_over {
        game.game_state = game_state::WAITING_REVEAL;
        msg!("Game over — winner declared as P{}, pending reveal", game.winner);
    }

    Ok(())
}

#[derive(Accounts)]
pub struct RespondShot<'info> {
    #[account(mut)]
    pub game: Account<'info, Game>,
    #[account(mut)]
    pub player: Signer<'info>,
}
