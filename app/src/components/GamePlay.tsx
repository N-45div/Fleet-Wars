"use client";

import { FC, useState } from "react";
import { motion } from "framer-motion";
import { GameBoard } from "./GameBoard";
import { Timer, Zap, Target, Shield } from "lucide-react";

interface GamePlayProps {
  gameId: string;
  isMyTurn: boolean;
  myBoard: bigint;
  myShots: bigint;
  myHits: bigint;
  opponentShots: bigint;
  opponentHits: bigint;
  onFireShot: (cell: number) => void;
  onRespondHit: (hit: boolean) => void;
  pendingShot?: number;
  gamePhase: "firing" | "responding" | "waiting" | "finished";
  winner?: "me" | "opponent";
}

export const GamePlay: FC<GamePlayProps> = ({
  gameId,
  isMyTurn,
  myBoard,
  myShots,
  myHits,
  opponentShots,
  opponentHits,
  onFireShot,
  onRespondHit,
  pendingShot,
  gamePhase,
  winner,
}) => {
  const [selectedCell, setSelectedCell] = useState<number | null>(null);

  const myHitCount = myHits.toString(2).split("1").length - 1;
  const opponentHitCount = opponentHits.toString(2).split("1").length - 1;

  return (
    <div className="w-full max-w-6xl mx-auto">
      {/* Game status bar */}
      <div className="card-cyber rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`px-4 py-2 rounded-lg border ${
              isMyTurn 
                ? "border-green-500 bg-green-500/10 text-green-400" 
                : "border-gray-600 bg-gray-800/50 text-gray-400"
            }`}>
              {isMyTurn ? (
                <span className="flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  YOUR TURN
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Timer className="w-4 h-4 animate-spin" />
                  OPPONENT'S TURN
                </span>
              )}
            </div>
            <div className="text-sm text-gray-500">
              Battle ID: <span className="font-mono text-cyan-400">{gameId.slice(0, 8)}...</span>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-xs text-gray-500 uppercase">Your Hits</p>
              <p className="text-2xl font-bold text-cyan-400">{myHitCount}/9</p>
            </div>
            <div className="text-gray-600">VS</div>
            <div className="text-center">
              <p className="text-xs text-gray-500 uppercase">Enemy Hits</p>
              <p className="text-2xl font-bold text-pink-400">{opponentHitCount}/9</p>
            </div>
          </div>
        </div>
      </div>

      {/* Boards */}
      <div className="grid md:grid-cols-2 gap-8">
        {/* Enemy board - where you fire */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <GameBoard
            board={BigInt(0)}
            shots={myShots}
            hits={myHits}
            isOwn={false}
            onCellClick={(cell) => {
              if (gamePhase === "firing" && isMyTurn) {
                setSelectedCell(cell);
              }
            }}
            disabled={gamePhase !== "firing" || !isMyTurn}
            label="ENEMY WATERS"
          />
          
          {/* Fire button */}
          {selectedCell !== null && gamePhase === "firing" && isMyTurn && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 text-center"
            >
              <button
                onClick={() => {
                  onFireShot(selectedCell);
                  setSelectedCell(null);
                }}
                className="btn-cyber flex items-center gap-2 mx-auto"
              >
                <Target className="w-5 h-5" />
                FIRE AT {String.fromCharCode(65 + Math.floor(selectedCell / 8))}{(selectedCell % 8) + 1}
              </button>
            </motion.div>
          )}
        </motion.div>

        {/* My board - shows my ships and enemy hits */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <GameBoard
            board={myBoard}
            shots={opponentShots}
            hits={opponentHits}
            isOwn={true}
            disabled={true}
            label="YOUR FLEET"
          />

          {/* Response buttons */}
          {gamePhase === "responding" && pendingShot !== undefined && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4"
            >
              <p className="text-center text-sm text-gray-400 mb-3">
                Enemy fired at{" "}
                <span className="text-pink-400 font-bold">
                  {String.fromCharCode(65 + Math.floor(pendingShot / 8))}{(pendingShot % 8) + 1}
                </span>
              </p>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => onRespondHit(true)}
                  className="btn-cyber btn-cyber-pink flex items-center gap-2"
                >
                  <Target className="w-5 h-5" />
                  HIT!
                </button>
                <button
                  onClick={() => onRespondHit(false)}
                  className="btn-cyber flex items-center gap-2"
                >
                  <Shield className="w-5 h-5" />
                  MISS
                </button>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>

      <div className="mt-8 card-cyber rounded-lg p-4 text-sm text-gray-400">
        <p className="text-gray-200 font-semibold mb-2">How battle works</p>
        <ul className="list-disc list-inside space-y-1">
          <li>When it says <span className="text-green-400">YOUR TURN</span>, click a cell on the enemy board and press Fire.</li>
          <li>When you see <span className="text-pink-400">Enemy fired at ...</span>, choose Hit or Miss to respond.</li>
          <li>First player to reach <span className="text-cyan-400">9 hits</span> wins. The game then enters reveal phase.</li>
          <li>Click <span className="text-green-400">Reveal Board</span> at the end to prove your hits and claim rewards.</li>
        </ul>
      </div>

      {/* Winner announcement */}
      {gamePhase === "finished" && winner && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-50"
        >
          <div className="text-center">
            <motion.h2
              initial={{ y: -20 }}
              animate={{ y: 0 }}
              className={`text-6xl font-bold mb-4 ${
                winner === "me" ? "neon-text" : "neon-text-pink"
              }`}
            >
              {winner === "me" ? "VICTORY!" : "DEFEAT"}
            </motion.h2>
            <p className="text-xl text-gray-400 mb-8">
              {winner === "me" 
                ? "You destroyed the enemy fleet!" 
                : "Your fleet was destroyed..."}
            </p>
            <button className="btn-cyber">
              Return to Lobby
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
};
