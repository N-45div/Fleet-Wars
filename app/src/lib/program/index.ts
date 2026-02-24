import { Program, AnchorProvider, BN } from "@coral-xyz/anchor";
import { Connection, PublicKey, SystemProgram } from "@solana/web3.js";
import type { FleetWars } from "./fleet_wars";
import idl from "./fleet_wars.json";

export const FLEET_WARS_PROGRAM_ID = new PublicKey(
  "DiXQ85BSfM9qgPaTv6PAb2GhxRgGhfoarNGyAYJAqdJn"
);

export const DELEGATION_PROGRAM_ID = new PublicKey(
  "DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh"
);

// Buffer program ID (different from delegation program)
export const BUFFER_PROGRAM_ID = new PublicKey(
  "BUFFERariAuK3P8DKvprxRt8dkLSmVxPCN3Ck4BVKQ9q"
);

export const MAGIC_CONTEXT = new PublicKey(
  "MagicContext1111111111111111111111111111111"
);

export const MAGIC_PROGRAM = new PublicKey(
  "Magic11111111111111111111111111111111111111"
);

export const ER_VALIDATOR = new PublicKey(
  "MUS3hc9TCw4cGC12vHNoYcCGzJG1txjgQLZWVoeNHNd"
);

export const DEVNET_RPC = "https://api.devnet.solana.com";
export const MAGIC_ROUTER_RPC = "https://devnet-router.magicblock.app";
export const MAGIC_ROUTER_WS = "wss://devnet-router.magicblock.app";

export const GAME_SEED = "game";
export const BUFFER_SEED = "buffer";

// Game state enum values - MUST match on-chain state.rs
export enum GameState {
  WaitingForPlayer = 0,
  Ready = 1,
  Active = 2,
  WaitingReveal = 3,
  Finished = 4,
}

// Turn state enum values
export enum TurnState {
  P1Fires = 0,
  P1Responds = 1,
  P2Fires = 2,
  P2Responds = 3,
}

export interface GameAccount {
  player1: PublicKey;
  player2: PublicKey;
  p1BoardHash: number[];
  p2BoardHash: number[];
  p1Shots: BN;
  p2Shots: BN;
  p1DeclaredHits: BN;
  p2DeclaredHits: BN;
  p1Board: BN;
  p2Board: BN;
  wager: BN;
  gameId: BN;
  p1HitsOnP2: number;
  p2HitsOnP1: number;
  lastShotCell: number;
  turnState: number;
  gameState: number;
  p1Revealed: boolean;
  p2Revealed: boolean;
  winner: number;
  bump: number;
}

export function getProgram(provider: AnchorProvider): Program<FleetWars> {
  return new Program(idl as FleetWars, provider);
}

export function getGamePda(player1: PublicKey, gameId: BN): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(GAME_SEED), player1.toBuffer(), gameId.toArrayLike(Buffer, "le", 8)],
    FLEET_WARS_PROGRAM_ID
  );
}

export function getBufferPda(gamePda: PublicKey): [PublicKey, number] {
  // Buffer PDA is derived with: ["buffer", delegated_account]
  // Uses the BUFFER_PROGRAM_ID (not Fleet Wars or Delegation program)
  return PublicKey.findProgramAddressSync(
    [Buffer.from(BUFFER_SEED), gamePda.toBuffer()],
    BUFFER_PROGRAM_ID
  );
}

export function getDelegationRecordPda(gamePda: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("delegation"), gamePda.toBuffer()],
    DELEGATION_PROGRAM_ID
  );
}

export function getDelegationMetadataPda(gamePda: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("delegation-metadata"), gamePda.toBuffer()],
    DELEGATION_PROGRAM_ID
  );
}

// Compute board hash: sha256(board_bits || salt)
export async function computeBoardHash(
  boardBits: bigint,
  salt: Uint8Array
): Promise<Uint8Array> {
  const boardBuffer = new ArrayBuffer(8);
  const view = new DataView(boardBuffer);
  view.setBigUint64(0, boardBits, true); // little endian

  const combined = new Uint8Array(8 + 32);
  combined.set(new Uint8Array(boardBuffer), 0);
  combined.set(salt, 8);

  const hashBuffer = await crypto.subtle.digest("SHA-256", combined);
  return new Uint8Array(hashBuffer);
}

// Convert ship positions (array of cell indices) to a u64 bitmask
export function shipsToBitmask(ships: number[]): bigint {
  let bitmask = BigInt(0);
  for (const cell of ships) {
    if (cell >= 0 && cell < 64) {
      bitmask |= BigInt(1) << BigInt(cell);
    }
  }
  return bitmask;
}

// Convert u64 bitmask to array of cell indices
export function bitmaskToShips(bitmask: bigint): number[] {
  const ships: number[] = [];
  for (let i = 0; i < 64; i++) {
    if ((bitmask & (BigInt(1) << BigInt(i))) !== BigInt(0)) {
      ships.push(i);
    }
  }
  return ships;
}

// Generate random 32-byte salt
export function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(32));
}

// Check if a cell was shot (from shots bitmask)
export function wasCellShot(shotsBitmask: BN, cell: number): boolean {
  const bitmask = BigInt(shotsBitmask.toString());
  return (bitmask & (BigInt(1) << BigInt(cell))) !== BigInt(0);
}

// Check if a cell was hit (from declared hits bitmask)
export function wasCellHit(hitsBitmask: BN, cell: number): boolean {
  const bitmask = BigInt(hitsBitmask.toString());
  return (bitmask & (BigInt(1) << BigInt(cell))) !== BigInt(0);
}

export type { FleetWars };
export { BN };
