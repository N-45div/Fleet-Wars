use anchor_lang::prelude::*;

pub const TOTAL_SHIP_CELLS: u8 = 9; // ships: 2 + 3 + 4 cells
pub const GAME_SEED: &[u8] = b"game";

pub mod game_state {
    pub const WAITING_FOR_PLAYER: u8 = 0;
    pub const READY: u8 = 1;
    pub const ACTIVE: u8 = 2;
    pub const WAITING_REVEAL: u8 = 3;
    pub const FINISHED: u8 = 4;
}

pub mod turn_state {
    pub const P1_FIRE: u8 = 1;
    pub const P2_RESPOND: u8 = 2;
    pub const P2_FIRE: u8 = 3;
    pub const P1_RESPOND: u8 = 4;
}

#[account]
pub struct Game {
    pub player1: Pubkey,           // 32
    pub player2: Pubkey,           // 32
    pub p1_board_hash: [u8; 32],   // 32 — SHA256(board_u64_le || salt)
    pub p2_board_hash: [u8; 32],   // 32

    pub p1_shots: u64,             // 8  — cells P1 fired at P2's board
    pub p2_shots: u64,             // 8  — cells P2 fired at P1's board
    pub p1_declared_hits: u64,     // 8  — P1 said "hit" on these cells (responding to P2's shots)
    pub p2_declared_hits: u64,     // 8  — P2 said "hit" on these cells (responding to P1's shots)
    pub p1_board: u64,             // 8  — revealed after game
    pub p2_board: u64,             // 8  — revealed after game

    pub wager: u64,                // 8
    pub game_id: u64,              // 8

    pub p1_hits_on_p2: u8,         // 1  — running declared hits P1 has on P2
    pub p2_hits_on_p1: u8,         // 1  — running declared hits P2 has on P1
    pub last_shot_cell: u8,        // 1  — last shot cell index (0–63)
    pub turn_state: u8,            // 1
    pub game_state: u8,            // 1
    pub p1_revealed: bool,         // 1
    pub p2_revealed: bool,         // 1
    pub winner: u8,                // 1 — 0=none, 1=P1, 2=P2
    pub bump: u8,                  // 1
}

impl Game {
    pub const SPACE: usize = 8      // discriminator
        + 32 + 32                   // player1, player2
        + 32 + 32                   // board hashes
        + 8 + 8 + 8 + 8 + 8 + 8    // bitmasks + revealed boards
        + 8 + 8                     // wager, game_id
        + 1 + 1 + 1 + 1 + 1        // hit counts, last_shot, turn_state, game_state
        + 1 + 1 + 1 + 1;           // revealed flags, winner, bump
}
