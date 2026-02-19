"use client";

import { FC, useState } from "react";
import { motion } from "framer-motion";
import { useWallet } from "@solana/wallet-adapter-react";
import { Plus, Users, Swords, Trophy, Coins, Anchor } from "lucide-react";

interface Game {
  id: string;
  creator: string;
  wager: number;
  status: "waiting" | "active" | "finished";
}

interface GameLobbyProps {
  onCreateGame: (wager: number) => void;
  onJoinGame: (gameId: string) => void;
}

export const GameLobby: FC<GameLobbyProps> = ({ onCreateGame, onJoinGame }) => {
  const { connected } = useWallet();
  const [wager, setWager] = useState(0.1);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Mock games for UI demo
  const games: Game[] = [
    { id: "game1", creator: "7xKX...3nPq", wager: 0.5, status: "waiting" },
    { id: "game2", creator: "4daU...rGRF", wager: 1.0, status: "waiting" },
    { id: "game3", creator: "9mNb...7hYt", wager: 0.25, status: "active" },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { icon: Users, label: "Players Online", value: "127" },
          { icon: Swords, label: "Active Battles", value: "34" },
          { icon: Trophy, label: "Total Wagered", value: "1,247 SOL" },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="card-cyber rounded-lg p-4 text-center"
          >
            <stat.icon className="w-6 h-6 mx-auto mb-2 text-cyan-400" />
            <p className="text-2xl font-bold text-white">{stat.value}</p>
            <p className="text-xs text-gray-500 uppercase tracking-wider">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Create game button */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold tracking-wider">
          <span className="text-cyan-400">OPEN</span>{" "}
          <span className="text-white">BATTLES</span>
        </h2>
        <button
          onClick={() => setShowCreateModal(true)}
          disabled={!connected}
          className="btn-cyber flex items-center gap-2"
        >
          <Plus size={18} />
          Create Battle
        </button>
      </div>

      {/* Games list */}
      <div className="space-y-3">
        {games.filter(g => g.status === "waiting").map((game, i) => (
          <motion.div
            key={game.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className="card-cyber rounded-lg p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-pink-500 flex items-center justify-center">
                <Anchor className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="font-bold text-white">Commander {game.creator}</p>
                <p className="text-xs text-gray-500">Awaiting challenger...</p>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="text-right">
                <div className="flex items-center gap-1 text-yellow-400">
                  <Coins size={14} />
                  <span className="font-bold">{game.wager} SOL</span>
                </div>
                <p className="text-xs text-gray-500">Wager</p>
              </div>

              <button
                onClick={() => onJoinGame(game.id)}
                disabled={!connected}
                className="btn-cyber btn-cyber-pink text-sm"
              >
                ⚔️ Challenge
              </button>
            </div>
          </motion.div>
        ))}

        {games.filter(g => g.status === "waiting").length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Swords className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No open battles. Create one to start!</p>
          </div>
        )}
      </div>

      {/* Create game modal */}
      {showCreateModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setShowCreateModal(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="card-cyber rounded-lg p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold neon-text mb-6 text-center">CREATE BATTLE</h3>

            <div className="mb-6">
              <label className="block text-sm text-gray-400 mb-2">Wager Amount (SOL)</label>
              <div className="flex gap-2">
                {[0.1, 0.25, 0.5, 1.0].map((amount) => (
                  <button
                    key={amount}
                    onClick={() => setWager(amount)}
                    className={`flex-1 py-2 rounded border transition-all ${
                      wager === amount
                        ? "border-cyan-500 bg-cyan-500/20 text-cyan-400"
                        : "border-gray-600 text-gray-400 hover:border-gray-500"
                    }`}
                  >
                    {amount}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6 p-3 rounded bg-yellow-500/10 border border-yellow-500/30">
              <p className="text-sm text-yellow-400">
                💰 You'll deposit <span className="font-bold">{wager} SOL</span> as wager.
                Winner takes all!
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 py-3 rounded border border-gray-600 text-gray-400 hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onCreateGame(wager);
                  setShowCreateModal(false);
                }}
                className="flex-1 btn-cyber"
              >
                Deploy Fleet
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};
