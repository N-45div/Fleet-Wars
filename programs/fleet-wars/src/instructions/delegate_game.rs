use anchor_lang::prelude::*;
use ephemeral_rollups_sdk::anchor::delegate;
use ephemeral_rollups_sdk::cpi::DelegateConfig;
use crate::state::{Game, game_state, GAME_SEED};
use crate::error::FleetWarsError;

pub fn handler(ctx: Context<DelegateGame>, game_id: u64) -> Result<()> {
    let game = &ctx.accounts.pda;

    require!(
        game.game_state == game_state::ACTIVE,
        FleetWarsError::InvalidGameState
    );
    require!(
        ctx.accounts.player1.key() == game.player1,
        FleetWarsError::Unauthorized
    );

    let game_id_bytes = game_id.to_le_bytes();
    ctx.accounts.delegate_pda(
        &ctx.accounts.player1,
        &[GAME_SEED, ctx.accounts.player1.key().as_ref(), &game_id_bytes],
        DelegateConfig {
            commit_frequency_ms: 5_000,
            validator: ctx.accounts.validator.as_ref().map(|v| v.key()),
        },
    )?;

    msg!("Game {} delegated to Ephemeral Rollup", game_id);
    Ok(())
}

#[delegate]
#[derive(Accounts)]
#[instruction(game_id: u64)]
pub struct DelegateGame<'info> {
    #[account(mut)]
    pub player1: Signer<'info>,
    /// CHECK: Optional validator override
    pub validator: Option<AccountInfo<'info>>,
    /// CHECK: Game PDA to delegate
    #[account(
        mut,
        del,
        seeds = [GAME_SEED, player1.key().as_ref(), &game_id.to_le_bytes()],
        bump = pda.bump
    )]
    pub pda: Account<'info, Game>,
    pub system_program: Program<'info, System>,
}
