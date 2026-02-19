import "dotenv/config";
import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  sendAndConfirmMagicTransaction,
  getDelegationStatus,
  delegateBufferPdaFromDelegatedAccountAndOwnerProgram,
  delegationRecordPdaFromDelegatedAccount,
  delegationMetadataPdaFromDelegatedAccount,
  DELEGATION_PROGRAM_ID,
  MAGIC_CONTEXT_ID,
  MAGIC_PROGRAM_ID,
} from "@magicblock-labs/ephemeral-rollups-sdk";
import { expect } from "chai";
import { createHash } from "crypto";
import fs from "fs";
import os from "os";
import path from "path";
import { FleetWars } from "../target/types/fleet_wars";
const idl = require("../target/idl/fleet_wars.json");

const BASE_RPC = process.env.BASE_RPC ?? "https://api.devnet.solana.com";
const BASE_WS = process.env.BASE_WS ?? "wss://api.devnet.solana.com";
const ROUTER_RPC =
  process.env.MAGIC_ROUTER_RPC ?? "https://devnet-router.magicblock.app";
const ROUTER_WS =
  process.env.MAGIC_ROUTER_WS ?? "wss://devnet-router.magicblock.app";
const ER_VALIDATOR = new PublicKey(
  process.env.ER_VALIDATOR ?? "MUS3hc9TCw4cGC12vHNoYcCGzJG1txjgQLZWVoeNHNd"
);

type WalletLike = {
  publicKey: PublicKey;
  signTransaction(tx: Transaction): Promise<Transaction>;
  signAllTransactions(txs: Transaction[]): Promise<Transaction[]>;
};

function expandHome(p: string): string {
  return p.startsWith("~/") ? path.join(os.homedir(), p.slice(2)) : p;
}

function loadKeypair(filePath: string): Keypair {
  const raw = JSON.parse(fs.readFileSync(expandHome(filePath), "utf8")) as number[];
  return Keypair.fromSecretKey(Uint8Array.from(raw));
}

function makeWallet(keypair: Keypair): WalletLike {
  return {
    publicKey: keypair.publicKey,
    async signTransaction(tx: Transaction): Promise<Transaction> {
      tx.partialSign(keypair);
      return tx;
    },
    async signAllTransactions(txs: Transaction[]): Promise<Transaction[]> {
      txs.forEach((tx) => tx.partialSign(keypair));
      return txs;
    },
  };
}

function boardHash(board: bigint, salt: Uint8Array): number[] {
  const boardBuf = Buffer.alloc(8);
  boardBuf.writeBigUInt64LE(board);
  const hash = createHash("sha256").update(boardBuf).update(Buffer.from(salt)).digest();
  return Array.from(hash);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("fleet-wars devnet ER e2e", () => {
  const walletPath = process.env.ANCHOR_WALLET ?? "~/.config/solana/id.json";
  const player1 = loadKeypair(walletPath);
  const player2 = Keypair.generate();

  const baseConnection = new Connection(BASE_RPC, {
    commitment: "confirmed",
    wsEndpoint: BASE_WS,
  });
  const routerConnection = new Connection(ROUTER_RPC, {
    commitment: "confirmed",
    wsEndpoint: ROUTER_WS,
  });

  const provider = new anchor.AnchorProvider(
    baseConnection,
    makeWallet(player1) as any,
    { commitment: "confirmed" }
  );

  const program = new Program(idl as FleetWars, provider);

  const gameId = new BN(Date.now());
  const gameIdLe = Buffer.alloc(8);
  gameIdLe.writeBigUInt64LE(BigInt(gameId.toString()));

  const [gamePda] = PublicKey.findProgramAddressSync(
    [Buffer.from("game"), player1.publicKey.toBuffer(), gameIdLe],
    program.programId
  );

  const p1Board = (1n << 0n) | (1n << 1n) | (1n << 2n) | (1n << 3n) | (1n << 4n) | (1n << 5n) | (1n << 6n) | (1n << 7n) | (1n << 8n);
  const p2Board = p1Board;
  const p1Salt = Uint8Array.from({ length: 32 }, (_, i) => i + 1);
  const p2Salt = Uint8Array.from({ length: 32 }, (_, i) => i + 101);
  const wager = new BN(500_000); // 0.0005 SOL each

  it("funds player2", async () => {
    const fundTx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: player1.publicKey,
        toPubkey: player2.publicKey,
        lamports: Math.floor(0.2 * LAMPORTS_PER_SOL),
      })
    );

    fundTx.feePayer = player1.publicKey;
    await sendAndConfirmTransaction(baseConnection, fundTx, [player1], {
      commitment: "confirmed",
      skipPreflight: true,
    });

    const bal = await baseConnection.getBalance(player2.publicKey, "confirmed");
    expect(bal).to.be.greaterThan(0);
  });

  it("creates and joins game on base layer", async () => {
    const createTx = await program.methods
      .createGame(gameId, boardHash(p1Board, p1Salt), wager)
      .accounts({
        game: gamePda,
        player1: player1.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .transaction();

    createTx.feePayer = player1.publicKey;
    await sendAndConfirmTransaction(baseConnection, createTx, [player1], {
      commitment: "confirmed",
      skipPreflight: true,
    });

    const joinTx = await program.methods
      .joinGame(boardHash(p2Board, p2Salt))
      .accounts({
        game: gamePda,
        player2: player2.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .transaction();

    joinTx.feePayer = player2.publicKey;
    await sendAndConfirmTransaction(baseConnection, joinTx, [player2], {
      commitment: "confirmed",
      skipPreflight: true,
    });

    const game = await (program.account as any).game.fetch(gamePda);
    expect(game.player2.toBase58()).eq(player2.publicKey.toBase58());
    expect(game.gameState).eq(2); // ACTIVE
  });

  it("delegates game PDA to ER", async () => {
    const bufferPda = delegateBufferPdaFromDelegatedAccountAndOwnerProgram(
      gamePda,
      program.programId
    );
    const delegationRecordPda = delegationRecordPdaFromDelegatedAccount(gamePda);
    const delegationMetadataPda = delegationMetadataPdaFromDelegatedAccount(gamePda);

    const delegateTx = await program.methods
      .delegateGame(gameId)
      .accounts({
        player1: player1.publicKey,
        validator: ER_VALIDATOR,
        bufferPda,
        delegationRecordPda,
        delegationMetadataPda,
        pda: gamePda,
        systemProgram: SystemProgram.programId,
        ownerProgram: program.programId,
        delegationProgram: DELEGATION_PROGRAM_ID,
      })
      .transaction();

    delegateTx.feePayer = player1.publicKey;
    await sendAndConfirmTransaction(baseConnection, delegateTx, [player1], {
      commitment: "confirmed",
      skipPreflight: true,
    });

    let delegated = false;
    for (let i = 0; i < 20; i++) {
      const status = await getDelegationStatus(routerConnection, gamePda);
      delegated = Boolean(status?.isDelegated);
      if (delegated) break;
      await sleep(1200);
    }

    expect(delegated).eq(true);
  });

  it("plays full game inside ER and auto-undelegates", async () => {
    for (let round = 0; round < 9; round++) {
      const p1Fire = await program.methods
        .fireShot(round)
        .accounts({ game: gamePda, player: player1.publicKey })
        .transaction();
      p1Fire.feePayer = player1.publicKey;
      await sendAndConfirmMagicTransaction(routerConnection, p1Fire, [player1], {
        commitment: "confirmed",
        skipPreflight: true,
      });

      const p2Respond = await program.methods
        .respondShot(true)
        .accounts({
          game: gamePda,
          player: player2.publicKey,
        })
        .transaction();
      p2Respond.feePayer = player2.publicKey;
      await sendAndConfirmMagicTransaction(routerConnection, p2Respond, [player2], {
        commitment: "confirmed",
        skipPreflight: true,
      });

      if (round < 8) {
        const p2Fire = await program.methods
          .fireShot(63 - round)
          .accounts({ game: gamePda, player: player2.publicKey })
          .transaction();
        p2Fire.feePayer = player2.publicKey;
        await sendAndConfirmMagicTransaction(routerConnection, p2Fire, [player2], {
          commitment: "confirmed",
          skipPreflight: true,
        });

        const p1Respond = await program.methods
          .respondShot(false)
          .accounts({
            game: gamePda,
            player: player1.publicKey,
          })
          .transaction();
        p1Respond.feePayer = player1.publicKey;
        await sendAndConfirmMagicTransaction(routerConnection, p1Respond, [player1], {
          commitment: "confirmed",
          skipPreflight: true,
        });
      }
    }

    const endSessionTx = await program.methods
      .endSession()
      .accounts({
        game: gamePda,
        player: player1.publicKey,
        magicContext: MAGIC_CONTEXT_ID,
        magicProgram: MAGIC_PROGRAM_ID,
      })
      .transaction();
    endSessionTx.feePayer = player1.publicKey;
    await sendAndConfirmMagicTransaction(routerConnection, endSessionTx, [player1], {
      commitment: "confirmed",
      skipPreflight: true,
    });

    // Wait for delegation record to be removed AND account owner to revert to program
    let undelegated = false;
    for (let i = 0; i < 60; i++) {
      const status = await getDelegationStatus(baseConnection, gamePda);
      const accInfo = await baseConnection.getAccountInfo(gamePda);
      const ownerIsProgram = accInfo?.owner?.equals(program.programId) ?? false;
      const delegationGone = !Boolean(status?.isDelegated);
      if (delegationGone && ownerIsProgram) {
        undelegated = true;
        break;
      }
      await sleep(2000);
    }

    expect(undelegated).eq(true);
  });

  it("reveals boards and finalizes on base layer", async () => {
    // wait for committed state to be visible on base layer
    let ready = false;
    for (let i = 0; i < 20; i++) {
      try {
        const game = await (program.account as any).game.fetch(gamePda);
        if (game.gameState === 3) {
          ready = true;
          break;
        }
      } catch {
        // account may not be ready yet
      }
      await sleep(1200);
    }
    expect(ready).eq(true);

    const p1Reveal = await program.methods
      .revealBoard(new BN(p1Board.toString()), Array.from(p1Salt))
      .accounts({ game: gamePda, player: player1.publicKey })
      .transaction();
    p1Reveal.feePayer = player1.publicKey;
    await sendAndConfirmTransaction(baseConnection, p1Reveal, [player1], {
      commitment: "confirmed",
      skipPreflight: true,
    });

    const p2Reveal = await program.methods
      .revealBoard(new BN(p2Board.toString()), Array.from(p2Salt))
      .accounts({ game: gamePda, player: player2.publicKey })
      .transaction();
    p2Reveal.feePayer = player2.publicKey;
    await sendAndConfirmTransaction(baseConnection, p2Reveal, [player2], {
      commitment: "confirmed",
      skipPreflight: true,
    });

    const finalizeTx = await program.methods
      .finalize()
      .accounts({
        game: gamePda,
        winner: player1.publicKey,
        caller: player1.publicKey,
      })
      .transaction();
    finalizeTx.feePayer = player1.publicKey;
    await sendAndConfirmTransaction(baseConnection, finalizeTx, [player1], {
      commitment: "confirmed",
      skipPreflight: true,
    });

    const game = await (program.account as any).game.fetch(gamePda);
    expect(game.gameState).eq(4); // FINISHED
    expect(game.winner).eq(1); // player1
  });
});
