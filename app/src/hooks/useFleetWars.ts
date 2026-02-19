"use client";

import { useCallback, useState, useMemo } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, SystemProgram, Connection } from "@solana/web3.js";
import { AnchorProvider } from "@coral-xyz/anchor";
import {
  getProgram,
  getGamePda,
  getBufferPda,
  getDelegationRecordPda,
  getDelegationMetadataPda,
  computeBoardHash,
  shipsToBitmask,
  generateSalt,
  GameState,
  TurnState,
  GameAccount,
  BN,
  FLEET_WARS_PROGRAM_ID,
  DELEGATION_PROGRAM_ID,
  MAGIC_CONTEXT,
  MAGIC_PROGRAM,
  ER_VALIDATOR,
  MAGIC_ROUTER_RPC,
} from "@/lib/program";

export { GameState, TurnState };
export type { GameAccount };

export interface CreateGameResult {
  gamePda: PublicKey;
  gameId: BN;
  salt: Uint8Array;
  signature: string;
}

export interface GameInfo {
  pda: PublicKey;
  account: GameAccount;
  isPlayer1: boolean;
  isMyTurn: boolean;
  canFire: boolean;
  canRespond: boolean;
}

export function useFleetWars() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const { publicKey, signTransaction, signAllTransactions } = wallet;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create provider for base layer (devnet)
  const baseProvider = useMemo(() => {
    if (!publicKey || !signTransaction || !signAllTransactions) return null;
    return new AnchorProvider(
      connection,
      { publicKey, signTransaction, signAllTransactions },
      { commitment: "confirmed" }
    );
  }, [connection, publicKey, signTransaction, signAllTransactions]);

  // Create provider for Ephemeral Rollup (MagicBlock router)
  const erProvider = useMemo(() => {
    if (!publicKey || !signTransaction || !signAllTransactions) return null;
    const erConnection = new Connection(MAGIC_ROUTER_RPC, "confirmed");
    return new AnchorProvider(
      erConnection,
      { publicKey, signTransaction, signAllTransactions },
      { commitment: "confirmed" }
    );
  }, [publicKey, signTransaction, signAllTransactions]);

  // Create game on L1 (devnet)
  const createGame = useCallback(
    async (ships: number[], wagerLamports: number = 0): Promise<CreateGameResult | null> => {
      if (!baseProvider || !publicKey) {
        setError("Wallet not connected");
        return null;
      }

      if (ships.length !== 9) {
        setError("Must place exactly 9 ship cells");
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        const program = getProgram(baseProvider);
        
        // Generate random game ID
        const gameIdBytes = new Uint8Array(8);
        crypto.getRandomValues(gameIdBytes);
        const gameId = new BN(gameIdBytes, "le");

        // Compute board hash
        const boardBits = shipsToBitmask(ships);
        const salt = generateSalt();
        const boardHash = await computeBoardHash(boardBits, salt);

        const [gamePda] = getGamePda(publicKey, gameId);

        const signature = await program.methods
          .createGame(gameId, Array.from(boardHash), new BN(wagerLamports))
          .accountsPartial({
            game: gamePda,
            player1: publicKey,
          })
          .rpc();

        console.log("Game created:", gamePda.toBase58(), "tx:", signature);

        return {
          gamePda,
          gameId,
          salt,
          signature,
        };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to create game";
        console.error("Create game error:", err);
        setError(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [baseProvider, publicKey]
  );

  // Delegate game to MagicBlock ER
  const delegateGame = useCallback(
    async (gamePda: PublicKey, gameId: BN): Promise<string | null> => {
      if (!baseProvider || !publicKey) {
        setError("Wallet not connected");
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        const program = getProgram(baseProvider);
        
        const [bufferPda] = getBufferPda(gamePda);
        const [delegationRecordPda] = getDelegationRecordPda(gamePda);
        const [delegationMetadataPda] = getDelegationMetadataPda(gamePda);

        const signature = await program.methods
          .delegateGame(gameId)
          .accountsPartial({
            player1: publicKey,
            validator: ER_VALIDATOR,
            bufferPda,
            delegationRecordPda,
            delegationMetadataPda,
            pda: gamePda,
          })
          .rpc();

        console.log("Game delegated:", signature);
        return signature;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to delegate game";
        console.error("Delegate game error:", err);
        setError(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [baseProvider, publicKey]
  );

  // Join game on L1
  const joinGame = useCallback(
    async (gamePda: PublicKey, ships: number[]): Promise<{ salt: Uint8Array; signature: string } | null> => {
      if (!baseProvider || !publicKey) {
        setError("Wallet not connected");
        return null;
      }

      if (ships.length !== 9) {
        setError("Must place exactly 9 ship cells");
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        const program = getProgram(baseProvider);

        // Compute board hash
        const boardBits = shipsToBitmask(ships);
        const salt = generateSalt();
        const boardHash = await computeBoardHash(boardBits, salt);

        const signature = await program.methods
          .joinGame(Array.from(boardHash))
          .accountsPartial({
            game: gamePda,
            player2: publicKey,
          })
          .rpc();

        console.log("Joined game:", signature);
        return { salt, signature };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to join game";
        console.error("Join game error:", err);
        setError(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [baseProvider, publicKey]
  );

  // Fire shot on ER
  const fireShot = useCallback(
    async (gamePda: PublicKey, cell: number): Promise<string | null> => {
      if (!erProvider || !publicKey) {
        setError("Wallet not connected");
        return null;
      }

      if (cell < 0 || cell > 63) {
        setError("Invalid cell (must be 0-63)");
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        const program = getProgram(erProvider);

        const signature = await program.methods
          .fireShot(cell)
          .accounts({
            game: gamePda,
            player: publicKey,
          })
          .rpc();

        console.log("Shot fired at cell", cell, "tx:", signature);
        return signature;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to fire shot";
        console.error("Fire shot error:", err);
        setError(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [erProvider, publicKey]
  );

  // Respond to shot on ER
  const respondShot = useCallback(
    async (gamePda: PublicKey, hit: boolean): Promise<string | null> => {
      if (!erProvider || !publicKey) {
        setError("Wallet not connected");
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        const program = getProgram(erProvider);

        const signature = await program.methods
          .respondShot(hit)
          .accounts({
            game: gamePda,
            player: publicKey,
          })
          .rpc();

        console.log("Responded to shot, hit:", hit, "tx:", signature);
        return signature;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to respond to shot";
        console.error("Respond shot error:", err);
        setError(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [erProvider, publicKey]
  );

  // End session (manual undelegate)
  const endSession = useCallback(
    async (gamePda: PublicKey): Promise<string | null> => {
      if (!erProvider || !publicKey) {
        setError("Wallet not connected");
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        const program = getProgram(erProvider);

        const signature = await program.methods
          .endSession()
          .accountsPartial({
            game: gamePda,
            player: publicKey,
          })
          .rpc();

        console.log("Session ended:", signature);
        return signature;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to end session";
        console.error("End session error:", err);
        setError(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [erProvider, publicKey]
  );

  // Reveal board on L1 (after undelegation)
  const revealBoard = useCallback(
    async (gamePda: PublicKey, ships: number[], salt: Uint8Array): Promise<string | null> => {
      if (!baseProvider || !publicKey) {
        setError("Wallet not connected");
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        const program = getProgram(baseProvider);
        const boardBits = shipsToBitmask(ships);

        const signature = await program.methods
          .revealBoard(new BN(boardBits.toString()), Array.from(salt))
          .accounts({
            game: gamePda,
            player: publicKey,
          })
          .rpc();

        console.log("Board revealed:", signature);
        return signature;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to reveal board";
        console.error("Reveal board error:", err);
        setError(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [baseProvider, publicKey]
  );

  // Finalize game on L1
  const finalize = useCallback(
    async (gamePda: PublicKey, winnerPubkey: PublicKey): Promise<string | null> => {
      if (!baseProvider || !publicKey) {
        setError("Wallet not connected");
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        const program = getProgram(baseProvider);

        const signature = await program.methods
          .finalize()
          .accounts({
            game: gamePda,
            winner: winnerPubkey,
            caller: publicKey,
          })
          .rpc();

        console.log("Game finalized:", signature);
        return signature;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to finalize game";
        console.error("Finalize error:", err);
        setError(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [baseProvider, publicKey]
  );

  // Fetch game account from L1
  const fetchGame = useCallback(
    async (gamePda: PublicKey): Promise<GameAccount | null> => {
      if (!baseProvider) return null;

      try {
        const program = getProgram(baseProvider);
        const game = await program.account.game.fetch(gamePda);
        return game as unknown as GameAccount;
      } catch (err) {
        console.error("Fetch game error:", err);
        return null;
      }
    },
    [baseProvider]
  );

  // Fetch game account from ER
  const fetchGameER = useCallback(
    async (gamePda: PublicKey): Promise<GameAccount | null> => {
      if (!erProvider) return null;

      try {
        const program = getProgram(erProvider);
        const game = await program.account.game.fetch(gamePda);
        return game as unknown as GameAccount;
      } catch (err) {
        console.error("Fetch game ER error:", err);
        return null;
      }
    },
    [erProvider]
  );

  // Get game info with computed fields
  const getGameInfo = useCallback(
    async (gamePda: PublicKey, useER: boolean = false): Promise<GameInfo | null> => {
      if (!publicKey) return null;

      const account = useER ? await fetchGameER(gamePda) : await fetchGame(gamePda);
      if (!account) return null;

      const isPlayer1 = account.player1.equals(publicKey);
      const isPlayer2 = account.player2.equals(publicKey);
      
      if (!isPlayer1 && !isPlayer2) {
        return null;
      }

      const turnState = account.turnState;
      const isMyTurn = 
        (isPlayer1 && (turnState === TurnState.P1Fires || turnState === TurnState.P1Responds)) ||
        (isPlayer2 && (turnState === TurnState.P2Fires || turnState === TurnState.P2Responds));

      const canFire = 
        (isPlayer1 && turnState === TurnState.P1Fires) ||
        (isPlayer2 && turnState === TurnState.P2Fires);

      const canRespond =
        (isPlayer1 && turnState === TurnState.P1Responds) ||
        (isPlayer2 && turnState === TurnState.P2Responds);

      return {
        pda: gamePda,
        account,
        isPlayer1,
        isMyTurn,
        canFire,
        canRespond,
      };
    },
    [publicKey, fetchGame, fetchGameER]
  );

  return {
    loading,
    error,
    connected: !!publicKey,
    publicKey,
    createGame,
    delegateGame,
    joinGame,
    fireShot,
    respondShot,
    endSession,
    revealBoard,
    finalize,
    fetchGame,
    fetchGameER,
    getGameInfo,
    getGamePda: (player1: PublicKey, gameId: BN) => getGamePda(player1, gameId),
  };
}
