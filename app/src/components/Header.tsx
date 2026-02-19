"use client";

import { FC } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Anchor, Zap } from "lucide-react";

export const Header: FC = () => {
  const { connected, publicKey } = useWallet();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-cyan-500/30 bg-black/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Anchor className="w-8 h-8 text-cyan-400" />
            <Zap className="w-4 h-4 text-pink-500 absolute -top-1 -right-1" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-wider">
              <span className="text-cyan-400">FLEET</span>
              <span className="text-pink-500">WARS</span>
            </h1>
            <p className="text-[10px] text-gray-500 tracking-widest">POWERED BY SOLANA</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {connected && publicKey && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded border border-green-500/50 bg-green-500/10">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs text-green-400 font-mono">
                {publicKey.toString().slice(0, 4)}...{publicKey.toString().slice(-4)}
              </span>
            </div>
          )}
          <WalletMultiButton />
        </div>
      </div>
    </header>
  );
};
