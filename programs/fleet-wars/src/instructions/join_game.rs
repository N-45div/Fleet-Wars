use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::state::{Game, game_state};
use crate::error::FleetWarsError;

pub fn handler(ctx: Context<JoinGame>, board_hash: [u8; 32]) -> Result<()> {
    let game = &mut ctx.accounts.game;
    let game_account_info = game.to_account_info();

    require!(
        game.game_state == game_state::WAITING_FOR_PLAYER,
        FleetWarsError::InvalidGameState
    );
    require!(
        game.player2 == Pubkey::default(),
        FleetWarsError::InvalidGameState
    );
    require!(
        ctx.accounts.player2.key() != game.player1,
        FleetWarsError::Unauthorized
    );

    game.player2 = ctx.accounts.player2.key();
    game.p2_board_hash = board_hash;
    game.game_state = game_state::ACTIVE;

    if game.wager > 0 {
        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.player2.to_account_info(),
                    to: game_account_info,
                },
            ),
            game.wager,
        )?;
    }

    msg!("Player2 {} joined game {}", ctx.accounts.player2.key(), game.game_id);
    Ok(())
}

#[derive(Accounts)]
pub struct JoinGame<'info> {
    #[account(mut)]
    pub game: Account<'info, Game>,
    #[account(mut)]
    pub player2: Signer<'info>,
    pub system_program: Program<'info, System>,
}
