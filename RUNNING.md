# Running Fleet Wars

## Prerequisites

- **Node.js** 18+ 
- **Solana CLI** with a devnet wallet funded with SOL
- **Phantom** or **Solflare** wallet browser extension

## Quick Start

### 1. Install Dependencies

```bash
# Root dependencies (Anchor)
cd fleet-wars
npm install

# Frontend dependencies
cd app
npm install
```

### 2. Start the Frontend

```bash
cd app
npm run dev
```

Open http://localhost:3000 in your browser.

### 3. Connect Wallet

1. Click "Select Wallet" in the header
2. Choose Phantom or Solflare
3. Make sure you're on **Solana Devnet**
4. Ensure you have devnet SOL (use `solana airdrop 2` if needed)

## Playing the Game

### Creating a Game (Player 1)

1. Click **"ENTER BATTLE ZONE"** on the landing page
2. Click **"Create Battle"**
3. Select wager amount (0 for free game)
4. Click **"Deploy Fleet"**
5. Place 9 ship cells on the 8x8 grid
6. Click **"Confirm Placement"**
7. **Copy the Game PDA** shown after creation - share this with Player 2

### Joining a Game (Player 2)

1. Click **"ENTER BATTLE ZONE"**
2. Click **"Join by PDA"**
3. Paste the Game PDA shared by Player 1
4. Click **"Join Battle"**
5. Place your 9 ship cells
6. Click **"Confirm Placement"**

### Battle Phase

- **Your Turn (Firing)**: Click a cell on the opponent's board to fire
- **Opponent's Turn**: Wait for them to fire
- **Responding**: After opponent fires, declare if it was a hit or miss
- Game ends when one player sinks all 9 enemy ships

### Post-Game

After the game ends (auto-undelegates from ER):
1. Both players reveal their boards
2. Call finalize to verify and pay out winner

## Testing with Two Wallets

To test locally, you need two browser profiles or browsers:
1. **Browser 1**: Player 1 with Wallet A
2. **Browser 2**: Player 2 with Wallet B

Both wallets need devnet SOL.

## Troubleshooting

### "Wallet not connected"
- Make sure your wallet is connected and on devnet

### "Invalid public key input"
- Ensure you're pasting a valid Solana public key (base58, ~44 chars)

### Transaction fails
- Check you have enough SOL for fees
- Check browser console for detailed error

### Game not updating
- The UI polls every 2 seconds
- Check if game is delegated to ER or still on L1

## Architecture Notes

- **L1 (Devnet)**: Game creation, joining, reveal, finalize
- **ER (MagicBlock)**: fire_shot, respond_shot (sub-second)
- **State**: Polls ER first, falls back to L1

## Program Addresses

| Program | Address |
|---------|---------|
| Fleet Wars | `DiXQ85BSfM9qgPaTv6PAb2GhxRgGhfoarNGyAYJAqdJn` |
| Delegation | `DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh` |
| ER Validator | `MUS3hc9TCw4cGC12vHNoYcCGzJG1txjgQLZWVoeNHNd` |

## RPC Endpoints

| Network | URL |
|---------|-----|
| Devnet | `https://api.devnet.solana.com` |
| MagicBlock Router | `https://devnet-router.magicblock.app` |
