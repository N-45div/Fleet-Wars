"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { motion, AnimatePresence } from "framer-motion";
import { GameLobby } from "@/components/GameLobby";
import { ShipPlacement } from "@/components/ShipPlacement";
import { GamePlay } from "@/components/GamePlay";
import { Anchor, Zap, Shield, Target, Coins, Loader2, Copy, Check, X, AlertCircle } from "lucide-react";
import { useFleetWars, GameState as OnChainGameState, TurnState } from "@/hooks/useFleetWars";
import { BN, bitmaskToShips, GameState } from "@/lib/program";

type ViewState = "landing" | "lobby" | "placement" | "waiting" | "playing" | "reveal" | "finished";
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
  const [copied, setCopied] = useState(false);
  const [winner, setWinner] = useState<"me" | "opponent" | null>(null);
  const [onChainGameState, setOnChainGameState] = useState<number>(0);
  const [hasDelegated, setHasDelegated] = useState(false);
  const delegatingRef = useRef(false);
  
  // Toast notifications
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  
  const showToast = useCallback((message: string, type: "success" | "error" | "info" = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);
  
  const copyGamePda = useCallback(() => {
    if (activeGame?.pda) {
      navigator.clipboard.writeText(activeGame.pda.toBase58());
      setCopied(true);
      showToast("Game PDA copied! Share with opponent.", "success");
      setTimeout(() => setCopied(false), 2000);
    }
  }, [activeGame, showToast]);

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
      showToast("Creating game on Solana...", "info");
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
        setHasDelegated(false);
        delegatingRef.current = false;
        showToast("Game created! Waiting for opponent to join.", "success");
        setViewState("waiting");
      } else {
        showToast(fleetWars.error || "Failed to create game", "error");
      }
    } else if (gameMode === "join" && pendingGamePda) {
      showToast("Joining game...", "info");
      const result = await fleetWars.joinGame(pendingGamePda, ships);
      if (result) {
        const gameAccount = await fleetWars.fetchGame(pendingGamePda);
        setActiveGame({
          pda: pendingGamePda,
          gameId: gameAccount?.gameId || new BN(0),
          salt: result.salt,
          ships,
          isPlayer1: false,
          wager: 0,
        });
        setHasDelegated(false);
        delegatingRef.current = false;
        showToast("Joined! Battle starting...", "success");
        setViewState("playing");
      } else {
        showToast(fleetWars.error || "Failed to join game", "error");
      }
    }
  }, [gameMode, pendingWager, pendingGamePda, fleetWars, showToast]);

  // Poll game state during waiting and playing
  useEffect(() => {
    if ((viewState !== "playing" && viewState !== "waiting") || !activeGame) return;

    const pollInterval = setInterval(async () => {
      // Try ER first, fallback to L1
      let gameInfo = await fleetWars.getGameInfo(activeGame.pda, true);
      if (!gameInfo) {
        gameInfo = await fleetWars.getGameInfo(activeGame.pda, false);
      }
      
      if (gameInfo) {
        const { account, isPlayer1 } = gameInfo;
        setOnChainGameState(account.gameState);
        
        // If waiting and game is now active, delegate to ER and transition to playing
        if (viewState === "waiting" && account.gameState === GameState.Active) {
          showToast("Opponent joined! Delegating to Ephemeral Rollup...", "info");
          
          // Player 1 delegates the game to ER now that both players have joined
          if (isPlayer1 && activeGame.gameId && !hasDelegated && !delegatingRef.current) {
            delegatingRef.current = true;
            const delegated = await fleetWars.delegateGame(activeGame.pda, activeGame.gameId);
            if (delegated) {
              setHasDelegated(true);
              showToast("Game delegated! Battle starting!", "success");
            } else {
              delegatingRef.current = false;
              showToast("Delegation failed, playing on L1.", "error");
            }
          }
          
          setViewState("playing");
        }
        
        // Check for game end - WaitingReveal means winner decided, needs reveal
        if (account.gameState === GameState.WaitingReveal || account.gameState === GameState.Finished) {
          const iWon = (isPlayer1 && account.winner === 1) || (!isPlayer1 && account.winner === 2);
          setWinner(iWon ? "me" : "opponent");
          setViewState("finished");
          return;
        }
        
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
  }, [viewState, activeGame, fleetWars, showToast]);

  // Fire shot handler
  const handleFireShot = useCallback(async (cell: number) => {
    if (!activeGame || !canFire) return;
    
    const result = await fleetWars.fireShot(activeGame.pda, cell);
    if (result) {
      const bit = BigInt(1) << BigInt(cell);
      setMyShots((prev) => prev | bit);
      showToast(`Shot fired at ${String.fromCharCode(65 + Math.floor(cell / 8))}${(cell % 8) + 1}!`, "success");
    } else {
      showToast(fleetWars.error || "Failed to fire shot", "error");
    }
  }, [activeGame, canFire, fleetWars, showToast]);

  // Respond to shot handler
  const handleRespondHit = useCallback(async (hit: boolean) => {
    if (!activeGame || !canRespond) return;
    
    const result = await fleetWars.respondShot(activeGame.pda, hit);
    if (result) {
      showToast(hit ? "Hit confirmed!" : "Miss confirmed!", "info");
    } else {
      showToast(fleetWars.error || "Failed to respond", "error");
    }
  }, [activeGame, canRespond, fleetWars, showToast]);
  
  // Handle reveal board
  const handleRevealBoard = useCallback(async () => {
    if (!activeGame) return;
    
    showToast("Revealing board...", "info");
    const result = await fleetWars.revealBoard(activeGame.pda, activeGame.ships, activeGame.salt);
    if (result) {
      showToast("Board revealed!", "success");
    } else {
      showToast(fleetWars.error || "Failed to reveal", "error");
    }
  }, [activeGame, fleetWars, showToast]);
  
  // Handle return to lobby
  const handleReturnToLobby = useCallback(() => {
    setViewState("lobby");
    setActiveGame(null);
    setGameMode(null);
    setWinner(null);
    setMyBoard(BigInt(0));
    setMyShots(BigInt(0));
    setMyHits(BigInt(0));
    setOpponentShots(BigInt(0));
    setOpponentHits(BigInt(0));
  }, []);

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
      <>
        <div className="py-8 flex justify-center">
          <ShipPlacement onBoardComplete={handleBoardComplete} />
        </div>
        {/* Loading overlay */}
        {fleetWars.loading && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="text-center">
              <Loader2 className="w-12 h-12 text-cyan-400 animate-spin mx-auto mb-4" />
              <p className="text-cyan-400">Processing transaction...</p>
            </div>
          </div>
        )}
        {/* Toast */}
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className={`fixed bottom-6 right-6 px-6 py-3 rounded-lg border z-50 ${
                toast.type === "success" ? "bg-green-500/20 border-green-500 text-green-400" :
                toast.type === "error" ? "bg-red-500/20 border-red-500 text-red-400" :
                "bg-cyan-500/20 border-cyan-500 text-cyan-400"
              }`}
            >
              <div className="flex items-center gap-2">
                {toast.type === "success" && <Check className="w-4 h-4" />}
                {toast.type === "error" && <X className="w-4 h-4" />}
                {toast.type === "info" && <AlertCircle className="w-4 h-4" />}
                {toast.message}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </>
    );
  }

  if (viewState === "waiting") {
    return (
      <div className="py-8 flex flex-col items-center justify-center min-h-[60vh]">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="card-cyber rounded-lg p-8 text-center max-w-md"
        >
          <Loader2 className="w-16 h-16 text-cyan-400 animate-spin mx-auto mb-6" />
          <h2 className="text-2xl font-bold neon-text mb-4">WAITING FOR OPPONENT</h2>
          <p className="text-gray-400 mb-6">
            Share the Game PDA below with your opponent so they can join.
          </p>
          
          {/* Game PDA Copy */}
          <div className="bg-black/50 rounded-lg p-4 mb-6">
            <p className="text-xs text-gray-500 mb-2">GAME PDA</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-cyan-400 font-mono text-sm break-all">
                {activeGame?.pda.toBase58()}
              </code>
              <button
                onClick={copyGamePda}
                className="p-2 rounded bg-cyan-500/20 hover:bg-cyan-500/30 transition-colors"
              >
                {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-cyan-400" />}
              </button>
            </div>
          </div>
          
          {activeGame && activeGame.wager > 0 && (
            <div className="text-yellow-400 text-sm mb-4">
              💰 Wager: {activeGame.wager} SOL
            </div>
          )}
          
          <button
            onClick={handleReturnToLobby}
            className="btn-cyber btn-cyber-pink text-sm"
          >
            Cancel & Return to Lobby
          </button>
        </motion.div>
        
        {/* Toast */}
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className={`fixed bottom-6 right-6 px-6 py-3 rounded-lg border z-50 ${
                toast.type === "success" ? "bg-green-500/20 border-green-500 text-green-400" :
                toast.type === "error" ? "bg-red-500/20 border-red-500 text-red-400" :
                "bg-cyan-500/20 border-cyan-500 text-cyan-400"
              }`}
            >
              <div className="flex items-center gap-2">
                {toast.type === "success" && <Check className="w-4 h-4" />}
                {toast.type === "error" && <X className="w-4 h-4" />}
                {toast.type === "info" && <AlertCircle className="w-4 h-4" />}
                {toast.message}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  if (viewState === "playing") {
    return (
      <>
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
            pendingShot={lastShotCell ?? undefined}
            gamePhase={gamePhase}
          />
        </div>
        {/* Loading overlay */}
        {fleetWars.loading && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="text-center">
              <Loader2 className="w-12 h-12 text-cyan-400 animate-spin mx-auto mb-4" />
              <p className="text-cyan-400">Processing transaction...</p>
            </div>
          </div>
        )}
        {/* Toast */}
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className={`fixed bottom-6 right-6 px-6 py-3 rounded-lg border z-50 ${
                toast.type === "success" ? "bg-green-500/20 border-green-500 text-green-400" :
                toast.type === "error" ? "bg-red-500/20 border-red-500 text-red-400" :
                "bg-cyan-500/20 border-cyan-500 text-cyan-400"
              }`}
            >
              <div className="flex items-center gap-2">
                {toast.type === "success" && <Check className="w-4 h-4" />}
                {toast.type === "error" && <X className="w-4 h-4" />}
                {toast.type === "info" && <AlertCircle className="w-4 h-4" />}
                {toast.message}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </>
    );
  }

  if (viewState === "finished") {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="py-8 flex flex-col items-center justify-center min-h-[60vh]"
      >
        <div className="card-cyber rounded-lg p-8 text-center max-w-md">
          <motion.h2
            initial={{ scale: 0.5 }}
            animate={{ scale: 1 }}
            className={`text-5xl font-bold mb-4 ${winner === "me" ? "neon-text" : "neon-text-pink"}`}
          >
            {winner === "me" ? "🏆 VICTORY!" : "💀 DEFEAT"}
          </motion.h2>
          
          <p className="text-xl text-gray-400 mb-6">
            {winner === "me" 
              ? "You destroyed the enemy fleet!" 
              : "Your fleet was destroyed..."}
          </p>
          
          <div className="space-y-3">
            <button
              onClick={handleRevealBoard}
              className="btn-cyber w-full"
            >
              Reveal Board & Claim Reward
            </button>
            <button
              onClick={handleReturnToLobby}
              className="w-full py-3 rounded border border-gray-600 text-gray-400 hover:bg-gray-800 transition-colors"
            >
              Return to Lobby
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  return null;
}
