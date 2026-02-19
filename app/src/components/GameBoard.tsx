"use client";

import { FC, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface GameBoardProps {
  board: bigint;
  shots: bigint;
  hits: bigint;
  isOwn: boolean;
  onCellClick?: (cell: number) => void;
  disabled?: boolean;
  label: string;
}

export const GameBoard: FC<GameBoardProps> = ({
  board,
  shots,
  hits,
  isOwn,
  onCellClick,
  disabled,
  label,
}) => {
  const [hoveredCell, setHoveredCell] = useState<number | null>(null);

  const getCellState = (index: number): "empty" | "ship" | "hit" | "miss" | "shot" => {
    const bit = BigInt(1) << BigInt(index);
    const hasShip = isOwn && (board & bit) !== BigInt(0);
    const wasShot = (shots & bit) !== BigInt(0);
    const wasHit = (hits & bit) !== BigInt(0);

    if (wasHit) return "hit";
    if (wasShot && !wasHit) return "miss";
    if (hasShip) return "ship";
    if (wasShot) return "shot";
    return "empty";
  };

  const rows = ["A", "B", "C", "D", "E", "F", "G", "H"];
  const cols = [1, 2, 3, 4, 5, 6, 7, 8];

  return (
    <div className="flex flex-col items-center">
      <h3 className="text-lg font-bold mb-3 neon-text tracking-widest uppercase">
        {label}
      </h3>
      
      <div className="card-cyber p-4 rounded-lg">
        {/* Column headers */}
        <div className="flex mb-1">
          <div className="w-8 h-8" />
          {cols.map((col) => (
            <div
              key={col}
              className="w-10 h-8 flex items-center justify-center text-xs text-cyan-400 font-bold"
            >
              {col}
            </div>
          ))}
        </div>

        {/* Grid */}
        {rows.map((row, rowIndex) => (
          <div key={row} className="flex">
            <div className="w-8 h-10 flex items-center justify-center text-xs text-cyan-400 font-bold">
              {row}
            </div>
            {cols.map((_, colIndex) => {
              const cellIndex = rowIndex * 8 + colIndex;
              const state = getCellState(cellIndex);
              const isHovered = hoveredCell === cellIndex;

              return (
                <motion.button
                  key={cellIndex}
                  whileHover={{ scale: disabled ? 1 : 1.1 }}
                  whileTap={{ scale: disabled ? 1 : 0.95 }}
                  className={cn(
                    "w-10 h-10 cell rounded-sm relative",
                    state === "ship" && "ship",
                    state === "hit" && "hit",
                    state === "miss" && "miss",
                    !disabled && !isOwn && state === "empty" && "cursor-crosshair",
                    disabled && "cursor-not-allowed opacity-60"
                  )}
                  onClick={() => !disabled && onCellClick?.(cellIndex)}
                  onMouseEnter={() => setHoveredCell(cellIndex)}
                  onMouseLeave={() => setHoveredCell(null)}
                  disabled={disabled}
                >
                  {state === "hit" && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute inset-0 flex items-center justify-center"
                    >
                      <span className="text-red-500 text-xl font-bold">✕</span>
                    </motion.div>
                  )}
                  {state === "miss" && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute inset-0 flex items-center justify-center"
                    >
                      <span className="text-gray-500 text-lg">•</span>
                    </motion.div>
                  )}
                  {isHovered && !disabled && !isOwn && state === "empty" && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="absolute inset-0 flex items-center justify-center"
                    >
                      <span className="text-cyan-400 text-xl">⊕</span>
                    </motion.div>
                  )}
                </motion.button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};
