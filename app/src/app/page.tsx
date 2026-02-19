"use client";

import { useState, useCallback, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { motion } from "framer-motion";
import { GameLobby } from "@/components/GameLobby";
import { ShipPlacement } from "@/components/ShipPlacement";
import { GamePlay } from "@/components/GamePlay";
import { Anchor, Zap, Shield, Target, Coins } from "lucide-react";
import { useFleetWars, GameState as OnChainGameState, TurnState } from "@/hooks/useFleetWars";
import { BN, bitmaskToShips } from "@/lib/program";

type ViewState = "landing" | "lobby" | "placement" | "playing";
type GameMode = "create" | "join" | null;

interface ActiveGame {
  pda: PublicKey;
  gameId: BN;
  salt: Uint8Array;
  ships: number[];
  isPlayer1: boolean;
  wager: number;
}

export default function Home() {
  const { connected, publicKey } = useWallet();
  const fleetWars = useFleetWars();
  
  const [viewState, setViewState] = useState<ViewState>("landing");
  const [gameMode, setGameMode] = useState<GameMode>(null);
  const [activeGame, setActiveGame] = useState<ActiveGame | null>(null);
  const [pendingWager, setPendingWager] = useState<number>(0);
  const [pendingGamePda, setPendingGamePda] = useState<PublicKey | null>(null);
  
  // Game state from chain
  const [myBoard, setMyBoard] = useState<bigint>(BigInt(0));
  const [myShots, setMyShots] = useState<bigint>(BigInt(0));
  const [myHits, setMyHits] = useState<bigint>(BigInt(0));
  const [opponentShots, setOpponentShots] = useState<bigint>(BigInt(0));
  const [opponentHits, setOpponentHits] = useState<bigint>(BigInt(0));
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [canFire, setCanFire] = useState(false);
  const [canRespond, setCanRespond] = useState(false);
  const [lastShotCell, setLastShotCell] = useState<number | null>(null);
  const [gamePhase, setGamePhase] = useState<"firing" | "responding">("firing");

  // Handle creating a new game
  const handleCreateGame = useCallback((wager: number) => {
    setGameMode("create");
    setPendingWager(wager);
    setViewState("placement");
  }, []);

  // Handle joining an existing game
  const handleJoinGame = useCallback((gameId: string) => {
    try {
      const pda = new PublicKey(gameId);
      setGameMode("join");
      setPendingGamePda(pda);
      setViewState("placement");
    } catch (err) {
      console.error("Invalid game ID:", err);
    }
  }, []);

  // Handle board placement complete
  const handleBoardComplete = useCallback(async (boardBitmask: bigint) => {
    const ships = bitmaskToShips(boardBitmask);
    setMyBoard(boardBitmask);

    if (gameMode === "create") {
      // Create game on L1
      const result = await fleetWars.createGame(ships, pendingWager * 1e9);
      if (result) {
        setActiveGame({
          pda: result.gamePda,
          gameId: result.gameId,
          salt: result.salt,
          ships,
          isPlayer1: true,
          wager: pendingWager,
        });
        
        // Delegate to ER
        await fleetWars.delegateGame(result.gamePda, result.gameId);
        setViewState("playing");
      }
    } else if (gameMode === "join" && pendingGamePda) {
      // Join game on L1
      const result = await fleetWars.joinGame(pendingGamePda, ships);
      if (result) {
        // Get game info to find gameId
        const gameAccount = await fleetWars.fetchGame(pendingGamePda);
        setActiveGame({
          pda: pendingGamePda,
          gameId: gameAccount?.gameId || new BN(0),
          salt: result.salt,
          ships,
          isPlayer1: false,
          wager: 0,
        });
        setViewState("playing");
      }
    }
  }, [gameMode, pendingWager, pendingGamePda, fleetWars]);

  // Poll game state during gameplay
  useEffect(() => {
    if (viewState !== "playing" || !activeGame) return;

    const pollInterval = setInterval(async () => {
      // Try ER first, fallback to L1
      let gameInfo = await fleetWars.getGameInfo(activeGame.pda, true);
      if (!gameInfo) {
        gameInfo = await fleetWars.getGameInfo(activeGame.pda, false);
      }
      
      if (gameInfo) {
        const { account, isPlayer1 } = gameInfo;
        
        // Update shots and hits based on player perspective
        if (isPlayer1) {
          setMyShots(BigInt(account.p1Shots.toString()));
          setMyHits(BigInt(account.p1DeclaredHits.toString()));
          setOpponentShots(BigInt(account.p2Shots.toString()));
          setOpponentHits(BigInt(account.p2DeclaredHits.toString()));
        } else {
          setMyShots(BigInt(account.p2Shots.toString()));
          setMyHits(BigInt(account.p2DeclaredHits.toString()));
          setOpponentShots(BigInt(account.p1Shots.toString()));
          setOpponentHits(BigInt(account.p1DeclaredHits.toString()));
        }

        setIsMyTurn(gameInfo.isMyTurn);
        setCanFire(gameInfo.canFire);
        setCanRespond(gameInfo.canRespond);
        setLastShotCell(account.lastShotCell);
        setGamePhase(gameInfo.canRespond ? "responding" : "firing");
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [viewState, activeGame, fleetWars]);

  // Fire shot handler
  const handleFireShot = useCallback(async (cell: number) => {
    if (!activeGame || !canFire) return;
    
    const result = await fleetWars.fireShot(activeGame.pda, cell);
    if (result) {
      // Optimistically update UI
      const bit = BigInt(1) << BigInt(cell);
      setMyShots((prev) => prev | bit);
    }
  }, [activeGame, canFire, fleetWars]);

  // Respond to shot handler
  const handleRespondHit = useCallback(async (hit: boolean) => {
    if (!activeGame || !canRespond) return;
    
    const result = await fleetWars.respondShot(activeGame.pda, hit);
    if (result) {
      console.log("Responded with hit:", hit);
    }
  }, [activeGame, canRespond, fleetWars]);

  if (viewState === "landing") {
    return (
      <div className="min-h-[calc(100vh-6rem)] flex flex-col items-center justify-center">
        {/* Hero section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center gap-4 mb-6">
            <motion.div
              animate={{ rotate: [0, -10, 10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Anchor className="w-16 h-16 text-cyan-400" />
            </motion.div>
            <Zap className="w-8 h-8 text-pink-500 animate-pulse" />
          </div>
          
          <h1 className="text-5xl md:text-7xl font-black mb-4 tracking-tight">
            <span className="text-cyan-400 neon-text">FLEET</span>
            <span className="text-pink-500 neon-text-pink">WARS</span>
          </h1>
          
          <p className="text-xl text-gray-400 max-w-lg mx-auto mb-2">
            Real-time naval combat on Solana
          </p>
          <p className="text-sm text-gray-600">
            Powered by MagicBlock Ephemeral Rollups
          </p>
        </motion.div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="grid md:grid-cols-3 gap-6 mb-12 max-w-4xl"
        >
          {[
            {
              icon: Target,
              title: "Strategic Combat",
              desc: "Deploy your fleet and hunt enemy ships",
              color: "cyan",
            },
            {
              icon: Zap,
              title: "Lightning Fast",
              desc: "Sub-second transactions on Ephemeral Rollups",
              color: "pink",
            },
            {
              icon: Coins,
              title: "Win SOL",
              desc: "Wager and win in skill-based battles",
              color: "yellow",
            },
          ].map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + i * 0.1 }}
              className="card-cyber rounded-lg p-6 text-center"
            >
              <feature.icon
                className={`w-10 h-10 mx-auto mb-4 ${
                  feature.color === "cyan"
                    ? "text-cyan-400"
                    : feature.color === "pink"
                    ? "text-pink-400"
                    : "text-yellow-400"
                }`}
              />
              <h3 className="font-bold text-white mb-2">{feature.title}</h3>
              <p className="text-sm text-gray-500">{feature.desc}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center"
        >
          {connected ? (
            <button
              onClick={() => setViewState("lobby")}
              className="btn-cyber text-lg px-12 py-4"
            >
              ⚓ ENTER BATTLE ZONE
            </button>
          ) : (
            <div className="text-center">
              <p className="text-gray-500 mb-4">Connect your wallet to play</p>
              <div className="inline-block animate-pulse">
                <Shield className="w-8 h-8 text-cyan-400 mx-auto" />
              </div>
            </div>
          )}
        </motion.div>

        {/* Bottom decoration */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-cyan-500/5 to-transparent pointer-events-none" />
      </div>
    );
  }

  if (viewState === "lobby") {
    return (
      <div className="py-8">
        <GameLobby onCreateGame={handleCreateGame} onJoinGame={handleJoinGame} />
      </div>
    );
  }

  if (viewState === "placement") {
    return (
      <div className="py-8 flex justify-center">
        <ShipPlacement onBoardComplete={handleBoardComplete} />
      </div>
    );
  }

  if (viewState === "playing") {
    return (
      <div className="py-8">
        <GamePlay
          gameId={activeGame?.pda.toBase58() || "waiting..."}
          isMyTurn={isMyTurn}
          myBoard={myBoard}
          myShots={myShots}
          myHits={myHits}
          opponentShots={opponentShots}
          opponentHits={opponentHits}
          onFireShot={handleFireShot}
          onRespondHit={handleRespondHit}
          gamePhase={gamePhase}
        />
      </div>
    );
  }

  return null;
}
