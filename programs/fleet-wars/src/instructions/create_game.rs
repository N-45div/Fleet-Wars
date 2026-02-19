use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::state::{Game, game_state, turn_state, GAME_SEED};

pub fn handler(
    ctx: Context<CreateGame>,
    game_id: u64,
    board_hash: [u8; 32],
    wager: u64,
) -> Result<()> {
    let game = &mut ctx.accounts.game;

    game.player1 = ctx.accounts.player1.key();
    game.player2 = Pubkey::default();
    game.p1_board_hash = board_hash;
    game.p2_board_hash = [0u8; 32];
    game.p1_shots = 0;
    game.p2_shots = 0;
    game.p1_declared_hits = 0;
    game.p2_declared_hits = 0;
    game.p1_board = 0;
    game.p2_board = 0;
    game.wager = wager;
    game.game_id = game_id;
    game.last_shot_cell = 255;
    game.turn_state = turn_state::P1_FIRE;
    game.game_state = game_state::WAITING_FOR_PLAYER;
    game.p1_hits_on_p2 = 0;
    game.p2_hits_on_p1 = 0;
    game.p1_revealed = false;
    game.p2_revealed = false;
    game.winner = 0;
    game.bump = ctx.bumps.game;

    if wager > 0 {
        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.player1.to_account_info(),
                    to: ctx.accounts.game.to_account_info(),
                },
            ),
            wager,
        )?;
    }

    msg!("Game {} created by {}", game_id, ctx.accounts.player1.key());
    Ok(())
}

#[derive(Accounts)]
#[instruction(game_id: u64)]
pub struct CreateGame<'info> {
    #[account(
        init,
        payer = player1,
        space = Game::SPACE,
        seeds = [GAME_SEED, player1.key().as_ref(), &game_id.to_le_bytes()],
        bump
    )]
    pub game: Account<'info, Game>,
    #[account(mut)]
    pub player1: Signer<'info>,
    pub system_program: Program<'info, System>,
}
