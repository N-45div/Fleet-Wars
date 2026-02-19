use anchor_lang::prelude::*;
use crate::state::{Game, game_state};
use crate::error::FleetWarsError;

/// After both players reveal, verify declared hits match actual boards and pay out winner.
pub fn handler(ctx: Context<Finalize>) -> Result<()> {
    let (game_id, final_winner, winner_key, p1_cheated, p2_cheated, total_pot) = {
        let game = &mut ctx.accounts.game;

        require!(
            game.game_state == game_state::WAITING_REVEAL,
            FleetWarsError::InvalidGameState
        );
        require!(game.p1_revealed && game.p2_revealed, FleetWarsError::GameNotReady);

        // Verify P2's declarations: P2 declared hits on P2's board when P1 shot there.
        // p2_declared_hits must equal p1_shots & p2_board (cells P1 shot that are actually ships).
        let expected_p2_hits = game.p1_shots & game.p2_board;
        let p2_cheated = game.p2_declared_hits != expected_p2_hits;

        // Verify P1's declarations: P1 declared hits on P1's board when P2 shot there.
        let expected_p1_hits = game.p2_shots & game.p1_board;
        let p1_cheated = game.p1_declared_hits != expected_p1_hits;

        // Determine winner based on cheat detection
        let final_winner = if p2_cheated && !p1_cheated {
            // P2 lied about hits — P1 wins regardless of declared winner
            1u8
        } else if p1_cheated && !p2_cheated {
            // P1 lied about hits — P2 wins
            2u8
        } else {
            // Nobody cheated OR both cheated — keep declared winner from ER
            game.winner
        };

        let winner_key = if final_winner == 1 {
            game.player1
        } else {
            game.player2
        };
        let total_pot = game.wager.saturating_mul(2);

        game.winner = final_winner;
        game.game_state = game_state::FINISHED;

        (
            game.game_id,
            final_winner,
            winner_key,
            p1_cheated,
            p2_cheated,
            total_pot,
        )
    };

    if total_pot > 0 {
        require!(winner_key == ctx.accounts.winner.key(), FleetWarsError::Unauthorized);
        **ctx.accounts.game.to_account_info().try_borrow_mut_lamports()? -= total_pot;
        **ctx.accounts.winner.try_borrow_mut_lamports()? += total_pot;
    }

    msg!(
        "Game {} finalized. Winner: P{} ({}). P1_cheated={}, P2_cheated={}",
        game_id,
        final_winner,
        winner_key,
        p1_cheated,
        p2_cheated
    );

    Ok(())
}

#[derive(Accounts)]
pub struct Finalize<'info> {
    #[account(mut)]
    pub game: Account<'info, Game>,
    /// CHECK: Winner receives the pot
    #[account(mut)]
    pub winner: AccountInfo<'info>,
    pub caller: Signer<'info>,
}
