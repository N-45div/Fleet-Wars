use anchor_lang::prelude::*;
use ephemeral_rollups_sdk::ephem::commit_and_undelegate_accounts;
use crate::state::{Game, game_state};
use crate::error::FleetWarsError;

/// Called from the ER by either player to manually end the session (e.g. opponent abandoned game).
pub fn handler(ctx: Context<EndSession>) -> Result<()> {
    let (game_state_value, p1, p2) = {
        let game_data = ctx.accounts.game.try_borrow_data()?;
        let mut game_slice: &[u8] = &game_data;
        let game = Game::try_deserialize(&mut game_slice)?;
        (game.game_state, game.player1, game.player2)
    };

    require!(
        game_state_value == game_state::ACTIVE || game_state_value == game_state::WAITING_REVEAL,
        FleetWarsError::GameNotActive
    );
    require!(
        ctx.accounts.player.key() == p1 || ctx.accounts.player.key() == p2,
        FleetWarsError::Unauthorized
    );

    commit_and_undelegate_accounts(
        &ctx.accounts.player.to_account_info(),
        vec![&ctx.accounts.game],
        &ctx.accounts.magic_context,
        &ctx.accounts.magic_program,
    )?;

    msg!("ER session committed and undelegated to base layer");
    Ok(())
}

#[derive(Accounts)]
pub struct EndSession<'info> {
    /// CHECK: delegated game PDA
    #[account(mut)]
    pub game: AccountInfo<'info>,
    #[account(mut)]
    pub player: Signer<'info>,
    /// CHECK: MagicBlock magic context
    #[account(mut, address = ephemeral_rollups_sdk::consts::MAGIC_CONTEXT_ID)]
    pub magic_context: AccountInfo<'info>,
    /// CHECK: MagicBlock magic program
    #[account(address = ephemeral_rollups_sdk::consts::MAGIC_PROGRAM_ID)]
    pub magic_program: AccountInfo<'info>,
}
