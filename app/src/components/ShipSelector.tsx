"use client";

import { motion } from "framer-motion";
import { Sparkles, Lock, Check } from "lucide-react";
import { useShipNFTs, ShipSkin, SHIP_SKINS } from "@/hooks/useShipNFTs";

interface ShipSelectorProps {
  onSelect: (skin: ShipSkin) => void;
  selectedSkinId: string;
}

export function ShipSelector({ onSelect, selectedSkinId }: ShipSelectorProps) {
  const { ownedShips, getRarityColor, getRarityBorder } = useShipNFTs();

  const skins = Object.values(SHIP_SKINS);

  // Check if user owns a skin (for now, default is always owned)
  const isOwned = (skinId: string) => {
    if (skinId === "default") return true;
    return ownedShips.some(ship => ship.skin?.id === skinId);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-cyan-400" />
        <h3 className="text-lg font-bold text-cyan-400">Ship Skins</h3>
        <span className="text-xs text-gray-500 ml-2">(Metaplex Core NFTs)</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {skins.map((skin) => {
          const owned = isOwned(skin.id);
          const selected = selectedSkinId === skin.id;

          return (
            <motion.button
              key={skin.id}
              whileHover={{ scale: owned ? 1.02 : 1 }}
              whileTap={{ scale: owned ? 0.98 : 1 }}
              onClick={() => owned && onSelect(skin)}
              disabled={!owned}
              className={`
                relative p-3 rounded-lg border-2 transition-all
                ${selected ? "border-cyan-400 bg-cyan-400/10" : getRarityBorder(skin.rarity)}
                ${owned ? "cursor-pointer hover:bg-white/5" : "cursor-not-allowed opacity-50"}
              `}
            >
              {/* Selection indicator */}
              {selected && (
                <div className="absolute top-2 right-2">
                  <Check className="w-4 h-4 text-cyan-400" />
                </div>
              )}

              {/* Lock for unowned */}
              {!owned && (
                <div className="absolute top-2 right-2">
                  <Lock className="w-4 h-4 text-gray-500" />
                </div>
              )}

              {/* Ship preview */}
              <div className="w-full aspect-square bg-black/30 rounded mb-2 flex items-center justify-center">
                <div className={`text-3xl ${owned ? "" : "grayscale"}`}>
                  {skin.rarity === "legendary" && "🚀"}
                  {skin.rarity === "epic" && "⚔️"}
                  {skin.rarity === "rare" && "🛡️"}
                  {skin.rarity === "common" && "⚓"}
                </div>
              </div>

              {/* Skin info */}
              <div className="text-left">
                <p className={`font-bold text-sm ${getRarityColor(skin.rarity)}`}>
                  {skin.name}
                </p>
                <p className="text-xs text-gray-500 capitalize">
                  {skin.rarity}
                </p>
              </div>

              {/* Attributes on hover */}
              <div className="mt-2 text-xs text-gray-400 space-y-0.5">
                <p>Hull: {skin.attributes.hull}</p>
                <p>Speed: {skin.attributes.speed}</p>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Mint hint */}
      <div className="mt-4 p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
        <p className="text-xs text-purple-400">
          💎 Collect rare ship skins as Metaplex Core NFTs! Win battles to unlock exclusive designs.
        </p>
      </div>
    </div>
  );
}
