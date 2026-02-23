"use client";

import { useCallback, useState, useMemo } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { walletAdapterIdentity } from "@metaplex-foundation/umi-signer-wallet-adapters";
import {
  mplCore,
  fetchAssetsByOwner,
  create,
  createCollection,
  fetchCollection,
} from "@metaplex-foundation/mpl-core";
import { generateSigner, publicKey } from "@metaplex-foundation/umi";

// Fleet Wars Ship Collection on devnet
const FLEET_WARS_COLLECTION = "FLEETwars1111111111111111111111111111111111";

export interface ShipSkin {
  id: string;
  name: string;
  image: string;
  rarity: "common" | "rare" | "epic" | "legendary";
  attributes: {
    hull: string;
    weapons: string;
    speed: number;
  };
}

export interface ShipNFT {
  address: string;
  name: string;
  uri: string;
  skin: ShipSkin | null;
}

// Pre-defined ship skins (metadata URIs would point to these)
export const SHIP_SKINS: Record<string, ShipSkin> = {
  default: {
    id: "default",
    name: "Standard Fleet",
    image: "/ships/default.png",
    rarity: "common",
    attributes: { hull: "Steel", weapons: "Cannons", speed: 10 },
  },
  phantom: {
    id: "phantom",
    name: "Phantom Class",
    image: "/ships/phantom.png",
    rarity: "rare",
    attributes: { hull: "Stealth Alloy", weapons: "Missiles", speed: 15 },
  },
  cyber: {
    id: "cyber",
    name: "Cyber Armada",
    image: "/ships/cyber.png",
    rarity: "epic",
    attributes: { hull: "Neon Composite", weapons: "Lasers", speed: 20 },
  },
  genesis: {
    id: "genesis",
    name: "Genesis Destroyer",
    image: "/ships/genesis.png",
    rarity: "legendary",
    attributes: { hull: "Quantum Steel", weapons: "Plasma", speed: 25 },
  },
};

export function useShipNFTs() {
  const { connection } = useConnection();
  const wallet = useWallet();
  
  const [ownedShips, setOwnedShips] = useState<ShipNFT[]>([]);
  const [selectedSkin, setSelectedSkin] = useState<ShipSkin>(SHIP_SKINS.default);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize Umi with wallet adapter
  const umi = useMemo(() => {
    if (!wallet.publicKey) return null;
    
    const umiInstance = createUmi(connection.rpcEndpoint)
      .use(mplCore())
      .use(walletAdapterIdentity(wallet));
    
    return umiInstance;
  }, [connection.rpcEndpoint, wallet]);

  // Fetch all ship NFTs owned by the connected wallet
  const fetchOwnedShips = useCallback(async () => {
    if (!umi || !wallet.publicKey) {
      setOwnedShips([]);
      return [];
    }

    setLoading(true);
    setError(null);

    try {
      const assets = await fetchAssetsByOwner(umi, publicKey(wallet.publicKey.toBase58()));
      
      // Filter for Fleet Wars collection ships
      const shipNFTs: ShipNFT[] = [];
      
      for (const asset of assets) {
        // Check if it belongs to Fleet Wars collection (if collection exists)
        const isFleetWarsShip = asset.updateAuthority.type === "Collection" 
          ? true // For now, accept all collection assets
          : asset.name.toLowerCase().includes("fleet") || 
            asset.name.toLowerCase().includes("ship");

        if (isFleetWarsShip) {
          // Try to match skin from metadata
          let skin: ShipSkin | null = null;
          const nameLower = asset.name.toLowerCase();
          
          if (nameLower.includes("genesis")) {
            skin = SHIP_SKINS.genesis;
          } else if (nameLower.includes("cyber")) {
            skin = SHIP_SKINS.cyber;
          } else if (nameLower.includes("phantom")) {
            skin = SHIP_SKINS.phantom;
          } else {
            skin = SHIP_SKINS.default;
          }

          shipNFTs.push({
            address: asset.publicKey.toString(),
            name: asset.name,
            uri: asset.uri,
            skin,
          });
        }
      }

      setOwnedShips(shipNFTs);
      return shipNFTs;
    } catch (err) {
      console.error("Failed to fetch ship NFTs:", err);
      setError("Failed to load ship NFTs");
      return [];
    } finally {
      setLoading(false);
    }
  }, [umi, wallet.publicKey]);

  // Mint a new ship NFT (for demo/testing)
  const mintShipNFT = useCallback(async (skinId: string): Promise<string | null> => {
    if (!umi || !wallet.publicKey) {
      setError("Wallet not connected");
      return null;
    }

    const skin = SHIP_SKINS[skinId];
    if (!skin) {
      setError("Invalid skin ID");
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const asset = generateSigner(umi);
      
      // Create the ship NFT
      const tx = await create(umi, {
        asset,
        name: `Fleet Wars - ${skin.name}`,
        uri: `https://arweave.net/fleet-wars/${skinId}.json`, // Placeholder URI
      }).sendAndConfirm(umi);

      console.log("Ship NFT minted:", asset.publicKey.toString());
      
      // Refresh owned ships
      await fetchOwnedShips();
      
      return asset.publicKey.toString();
    } catch (err) {
      console.error("Failed to mint ship NFT:", err);
      setError("Failed to mint ship NFT");
      return null;
    } finally {
      setLoading(false);
    }
  }, [umi, wallet.publicKey, fetchOwnedShips]);

  // Select a skin for gameplay
  const selectSkin = useCallback((skinId: string) => {
    const skin = SHIP_SKINS[skinId];
    if (skin) {
      setSelectedSkin(skin);
    }
  }, []);

  // Get rarity color for UI
  const getRarityColor = useCallback((rarity: ShipSkin["rarity"]) => {
    switch (rarity) {
      case "common": return "text-gray-400";
      case "rare": return "text-blue-400";
      case "epic": return "text-purple-400";
      case "legendary": return "text-yellow-400";
      default: return "text-gray-400";
    }
  }, []);

  // Get rarity border color for UI
  const getRarityBorder = useCallback((rarity: ShipSkin["rarity"]) => {
    switch (rarity) {
      case "common": return "border-gray-500";
      case "rare": return "border-blue-500";
      case "epic": return "border-purple-500";
      case "legendary": return "border-yellow-500";
      default: return "border-gray-500";
    }
  }, []);

  return {
    // State
    ownedShips,
    selectedSkin,
    loading,
    error,
    
    // Actions
    fetchOwnedShips,
    mintShipNFT,
    selectSkin,
    
    // Helpers
    getRarityColor,
    getRarityBorder,
    allSkins: SHIP_SKINS,
  };
}
