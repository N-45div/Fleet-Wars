"use client";

import { FC, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { RotateCw, Trash2, Sparkles } from "lucide-react";
import { ShipSkin, SHIP_SKINS } from "@/hooks/useShipNFTs";

interface ShipPlacementProps {
  onBoardComplete: (board: bigint) => void;
  onSkinSelect?: (skin: ShipSkin) => void;
  selectedSkin?: ShipSkin;
}

const SHIPS = [
  { name: "Carrier", size: 5 },
  { name: "Battleship", size: 4 },
  { name: "Cruiser", size: 3 },
  { name: "Submarine", size: 3 },
  { name: "Destroyer", size: 2 },
];

// Total cells: 5+4+3+3+2 = 17, but game uses 9 cells
const GAME_SHIPS = [
  { name: "Destroyer", size: 3 },
  { name: "Cruiser", size: 3 },
  { name: "Submarine", size: 3 },
];

export const ShipPlacement: FC<ShipPlacementProps> = ({ onBoardComplete, onSkinSelect, selectedSkin }) => {
  const currentSkin = selectedSkin || SHIP_SKINS.default;
  const [board, setBoard] = useState<bigint>(BigInt(0));
  const [currentShipIndex, setCurrentShipIndex] = useState(0);
  const [isHorizontal, setIsHorizontal] = useState(true);
  const [hoveredCells, setHoveredCells] = useState<number[]>([]);
  const [placedShips, setPlacedShips] = useState<number[][]>([]);

  const currentShip = GAME_SHIPS[currentShipIndex];
  const allShipsPlaced = currentShipIndex >= GAME_SHIPS.length;
  const cellCount = board.toString(2).split("1").length - 1;

  const getShipCells = useCallback(
    (startCell: number): number[] | null => {
      if (!currentShip) return null;

      const cells: number[] = [];
      const startRow = Math.floor(startCell / 8);
      const startCol = startCell % 8;

      for (let i = 0; i < currentShip.size; i++) {
        let row: number, col: number;
        if (isHorizontal) {
          row = startRow;
          col = startCol + i;
        } else {
          row = startRow + i;
          col = startCol;
        }

        if (row >= 8 || col >= 8) return null;

        const cellIndex = row * 8 + col;
        const bit = BigInt(1) << BigInt(cellIndex);
        if ((board & bit) !== BigInt(0)) return null;

        cells.push(cellIndex);
      }

      return cells;
    },
    [currentShip, isHorizontal, board]
  );

  const handleCellHover = (cellIndex: number) => {
    const cells = getShipCells(cellIndex);
    setHoveredCells(cells || []);
  };

  const handleCellClick = (cellIndex: number) => {
    const cells = getShipCells(cellIndex);
    if (!cells) return;

    let newBoard = board;
    for (const cell of cells) {
      newBoard |= BigInt(1) << BigInt(cell);
    }

    setBoard(newBoard);
    setPlacedShips([...placedShips, cells]);
    setCurrentShipIndex(currentShipIndex + 1);
    setHoveredCells([]);
  };

  const handleReset = () => {
    setBoard(BigInt(0));
    setCurrentShipIndex(0);
    setPlacedShips([]);
    setHoveredCells([]);
  };

  const rows = ["A", "B", "C", "D", "E", "F", "G", "H"];
  const cols = [1, 2, 3, 4, 5, 6, 7, 8];

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold neon-text mb-2">DEPLOY YOUR FLEET</h2>
        {!allShipsPlaced ? (
          <p className="text-cyan-400">
            Place your <span className="text-pink-400 font-bold">{currentShip?.name}</span>{" "}
            ({currentShip?.size} cells)
          </p>
        ) : (
          <p className="text-green-400 font-bold">All ships deployed! Ready for battle.</p>
        )}
      </div>

      <div className="card-cyber rounded-lg p-4 max-w-xl text-sm text-gray-400">
        <p className="text-gray-200 font-semibold mb-2">How to place ships</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Click any grid cell to place the highlighted ship.</li>
          <li>Use <span className="text-cyan-400">Rotate</span> to switch horizontal/vertical.</li>
          <li>Place 3 ships of 3 cells each (total 9 ship cells).</li>
          <li>Press <span className="text-green-400">Ready for Battle</span> once all ships are placed.</li>
        </ul>
      </div>

      {/* Controls */}
      <div className="flex gap-4">
        <button
          onClick={() => setIsHorizontal(!isHorizontal)}
          className="btn-cyber flex items-center gap-2 text-sm"
          disabled={allShipsPlaced}
        >
          <RotateCw size={16} />
          {isHorizontal ? "Horizontal" : "Vertical"}
        </button>
        <button
          onClick={handleReset}
          className="btn-cyber btn-cyber-pink flex items-center gap-2 text-sm"
        >
          <Trash2 size={16} />
          Reset
        </button>
      </div>

      {/* Board */}
      <div className="card-cyber p-4 rounded-lg">
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

        {rows.map((row, rowIndex) => (
          <div key={row} className="flex">
            <div className="w-8 h-10 flex items-center justify-center text-xs text-cyan-400 font-bold">
              {row}
            </div>
            {cols.map((_, colIndex) => {
              const cellIndex = rowIndex * 8 + colIndex;
              const bit = BigInt(1) << BigInt(cellIndex);
              const hasShip = (board & bit) !== BigInt(0);
              const isHovered = hoveredCells.includes(cellIndex);
              const isValid = hoveredCells.length > 0;

              return (
                <motion.button
                  key={cellIndex}
                  whileHover={{ scale: allShipsPlaced ? 1 : 1.05 }}
                  className={cn(
                    "w-10 h-10 cell rounded-sm",
                    hasShip && "ship",
                    isHovered && isValid && "!bg-cyan-500/40 !border-cyan-400",
                    isHovered && !isValid && "!bg-red-500/40 !border-red-400",
                    allShipsPlaced && "cursor-default"
                  )}
                  onClick={() => !allShipsPlaced && handleCellClick(cellIndex)}
                  onMouseEnter={() => !allShipsPlaced && handleCellHover(cellIndex)}
                  onMouseLeave={() => setHoveredCells([])}
                  disabled={allShipsPlaced || hasShip}
                />
              );
            })}
          </div>
        ))}
      </div>

      {/* Ship list */}
      <div className="flex gap-2">
        {GAME_SHIPS.map((ship, index) => (
          <div
            key={ship.name}
            className={cn(
              "px-3 py-1 rounded text-xs font-bold border",
              index < currentShipIndex
                ? "border-green-500 text-green-400 bg-green-500/10"
                : index === currentShipIndex
                ? "border-pink-500 text-pink-400 bg-pink-500/10 animate-pulse"
                : "border-gray-600 text-gray-500"
            )}
          >
            {ship.name}
          </div>
        ))}
      </div>

      {/* Skin selector */}
      {onSkinSelect && (
        <div className="mt-4 p-4 card-cyber rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-bold text-purple-400">Ship Skin (NFT)</span>
          </div>
          <div className="flex gap-2">
            {Object.values(SHIP_SKINS).map((skin) => (
              <button
                key={skin.id}
                onClick={() => onSkinSelect(skin)}
                className={cn(
                  "px-3 py-2 rounded border text-xs transition-all",
                  currentSkin.id === skin.id
                    ? "border-purple-500 bg-purple-500/20 text-purple-400"
                    : "border-gray-600 text-gray-400 hover:border-gray-500"
                )}
              >
                {skin.rarity === "legendary" && "🚀"}
                {skin.rarity === "epic" && "⚔️"}
                {skin.rarity === "rare" && "🛡️"}
                {skin.rarity === "common" && "⚓"}
                {" "}{skin.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Confirm button */}
      {allShipsPlaced && (
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="btn-cyber text-lg"
          onClick={() => onBoardComplete(board)}
        >
          ⚔️ Ready for Battle
        </motion.button>
      )}
    </div>
  );
};
