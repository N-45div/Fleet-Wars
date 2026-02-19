# Fleet Wars Architecture

## System Overview

```mermaid
graph TB
    subgraph "User Layer"
        Browser[Web Browser]
        Wallet[Solana Wallet<br/>Phantom/Solflare]
    end

    subgraph "Frontend Application"
        Next[Next.js 16 App]
        React[React Components]
        Hooks[useFleetWars Hook]
        Anchor[Anchor Client]
    end

    subgraph "Blockchain Layer"
        subgraph "Solana L1 (Devnet)"
            Program[Fleet Wars Program<br/>DiXQ85...qdJn]
            GamePDA[Game Account PDA]
            DelegationProg[Delegation Program<br/>DELeGG...aeSh]
        end
        
        subgraph "MagicBlock ER"
            Router[ER Router<br/>devnet-router.magicblock.app]
            Validator[ER Validator<br/>MUS3hc...NHNd]
            ERState[Ephemeral State]
        end
    end

    Browser --> Wallet
    Browser --> Next
    Next --> React
    React --> Hooks
    Hooks --> Anchor
    Anchor --> Wallet
    Wallet --> Program
    Wallet --> Router
    Program --> GamePDA
    Program --> DelegationProg
    DelegationProg --> Validator
    Router --> ERState
    ERState -.-> GamePDA
```

## Game State Machine

```mermaid
stateDiagram-v2
    [*] --> WaitingForPlayer: Player1 calls create_game()
    
    WaitingForPlayer --> WaitingForPlayer: Player1 calls delegate_game()
    WaitingForPlayer --> Active: Player2 calls join_game()
    
    state Active {
        [*] --> P1Fires
        P1Fires --> P1Responds: Player1 fires shot
        P1Responds --> P2Fires: Player1 responds
        P2Fires --> P2Responds: Player2 fires shot
        P2Responds --> P1Fires: Player2 responds
        
        P1Responds --> GameOver: 9 hits on P1
        P2Responds --> GameOver: 9 hits on P2
    }
    
    Active --> Finished: Auto-undelegate
    
    state Finished {
        [*] --> AwaitingReveals
        AwaitingReveals --> P1Revealed: Player1 reveals
        AwaitingReveals --> P2Revealed: Player2 reveals
        P1Revealed --> BothRevealed: Player2 reveals
        P2Revealed --> BothRevealed: Player1 reveals
        BothRevealed --> Settled: finalize()
    }
    
    Finished --> [*]: Winner paid
```

## Data Flow

```mermaid
sequenceDiagram
    actor P1 as Player 1
    actor P2 as Player 2
    participant FE as Frontend
    participant L1 as Solana L1
    participant DP as Delegation Program
    participant ER as Ephemeral Rollup

    rect rgb(40, 40, 60)
        Note over P1,L1: Phase 1: Game Creation (L1)
        P1->>FE: Place ships on board
        FE->>FE: Generate salt, compute hash
        FE->>L1: create_game(hash, wager)
        L1->>L1: Create Game PDA
        L1-->>FE: Game created ✓
        
        FE->>DP: delegate_game()
        DP->>DP: Create delegation records
        DP-->>FE: Delegated ✓
    end

    rect rgb(40, 60, 40)
        Note over P2,L1: Phase 1: Join Game (L1)
        P2->>FE: Place ships on board
        FE->>FE: Generate salt, compute hash
        FE->>L1: join_game(hash)
        L1->>L1: Update Game PDA
        L1-->>FE: Joined ✓
    end

    rect rgb(60, 40, 40)
        Note over P1,ER: Phase 2: Battle (ER)
        ER->>ER: Clone state from L1
        
        loop Until game ends
            P1->>FE: Click cell to fire
            FE->>ER: fire_shot(cell)
            ER-->>FE: Shot registered
            
            P2->>FE: Declare hit/miss
            FE->>ER: respond_shot(hit)
            ER-->>FE: Response recorded
            
            P2->>FE: Click cell to fire
            FE->>ER: fire_shot(cell)
            ER-->>FE: Shot registered
            
            P1->>FE: Declare hit/miss
            FE->>ER: respond_shot(hit)
            ER-->>FE: Response recorded
        end
        
        ER->>ER: Auto-commit & undelegate
        ER->>L1: State committed
    end

    rect rgb(40, 40, 60)
        Note over P1,L1: Phase 3: Settlement (L1)
        P1->>FE: Reveal board
        FE->>L1: reveal_board(board, salt)
        L1->>L1: Verify hash matches
        
        P2->>FE: Reveal board
        FE->>L1: reveal_board(board, salt)
        L1->>L1: Verify hash matches
        
        P1->>FE: Finalize game
        FE->>L1: finalize()
        L1->>L1: Verify hits, determine winner
        L1->>L1: Transfer wager to winner
        L1-->>FE: Game complete ✓
    end
```

## Account Structure

```mermaid
erDiagram
    GAME_ACCOUNT {
        pubkey player1 "Game creator"
        pubkey player2 "Opponent"
        bytes32 p1_board_hash "SHA256(board|salt)"
        bytes32 p2_board_hash "SHA256(board|salt)"
        u64 p1_shots "Bitmask of P1's shots"
        u64 p2_shots "Bitmask of P2's shots"
        u64 p1_declared_hits "P1's declared hits"
        u64 p2_declared_hits "P2's declared hits"
        u64 p1_board "Revealed board (post-game)"
        u64 p2_board "Revealed board (post-game)"
        u64 wager "Lamports wagered"
        u64 game_id "Unique game identifier"
        u8 p1_hits_on_p2 "Count 0-9"
        u8 p2_hits_on_p1 "Count 0-9"
        u8 last_shot_cell "Cell 0-63"
        u8 turn_state "P1Fires/P1Responds/P2Fires/P2Responds"
        u8 game_state "Waiting/Active/Finished"
        bool p1_revealed "Has P1 revealed?"
        bool p2_revealed "Has P2 revealed?"
        u8 winner "0=none, 1=P1, 2=P2"
        u8 bump "PDA bump seed"
    }

    DELEGATION_RECORD {
        pubkey account "Delegated account"
        pubkey owner_program "Original owner"
        pubkey validator "ER validator"
    }
```

## Board Representation

```mermaid
graph LR
    subgraph "8x8 Board Grid"
        subgraph "Row 0"
            C0[0] --> C1[1] --> C2[2] --> C3[3] --> C4[4] --> C5[5] --> C6[6] --> C7[7]
        end
        subgraph "Row 1"
            C8[8] --> C9[9] --> C10[10] --> C11[11] --> C12[12] --> C13[13] --> C14[14] --> C15[15]
        end
    end
    
    subgraph "Bitmask (u64)"
        Bit[bit N = 1 if ship at cell N]
    end
    
    C0 -.-> Bit
    C63[63] -.-> Bit
```

**Example Board:**
```
Board: 0b0000_0001_1100_0111_0000_0000_...
       = Ships at cells 0,1,2,6,7,8 (6 cells shown)

Cell Index:
 0  1  2  3  4  5  6  7
 8  9 10 11 12 13 14 15
16 17 18 19 20 21 22 23
24 25 26 27 28 29 30 31
32 33 34 35 36 37 38 39
40 41 42 43 44 45 46 47
48 49 50 51 52 53 54 55
56 57 58 59 60 61 62 63
```

## Security Model

```mermaid
flowchart TD
    subgraph "Commitment Phase"
        Board[Ship Positions<br/>64-bit bitmask]
        Salt[Random Salt<br/>32 bytes]
        Hash[SHA256 Hash]
        
        Board --> Hash
        Salt --> Hash
    end
    
    subgraph "Reveal Phase"
        RevealBoard[Revealed Board]
        RevealSalt[Revealed Salt]
        ComputedHash[Recomputed Hash]
        StoredHash[Stored Hash]
        
        RevealBoard --> ComputedHash
        RevealSalt --> ComputedHash
        ComputedHash -->|Must Match| StoredHash
    end
    
    subgraph "Verification"
        HitsCheck[Verify declared hits<br/>match actual board]
        CheatDetect[Cheater Detection]
        
        RevealBoard --> HitsCheck
        HitsCheck -->|Mismatch| CheatDetect
    end
    
    Hash -->|Committed on-chain| StoredHash
```

## Frontend Component Tree

```mermaid
graph TD
    App[App Layout]
    WP[WalletProvider]
    Header[Header]
    Page[Page]
    
    App --> WP
    WP --> Header
    WP --> Page
    
    Page --> Landing[Landing View]
    Page --> Lobby[GameLobby]
    Page --> Placement[ShipPlacement]
    Page --> Play[GamePlay]
    
    Lobby --> CreateModal[Create Game Modal]
    Lobby --> GameList[Open Games List]
    
    Placement --> Board1[GameBoard]
    Placement --> ShipSelector[Ship Selector]
    
    Play --> MyBoard[My Board]
    Play --> OpponentBoard[Opponent Board]
    Play --> TurnIndicator[Turn Indicator]
    Play --> ActionButtons[Fire/Respond Buttons]
    
    MyBoard --> GameBoard2[GameBoard Component]
    OpponentBoard --> GameBoard3[GameBoard Component]
```

## Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend Framework | Next.js 16 (App Router) |
| UI Library | React 19 |
| Styling | TailwindCSS 4 |
| Animations | Framer Motion |
| Icons | Lucide React |
| Blockchain | Solana (Devnet) |
| Smart Contracts | Anchor 0.30.1 |
| Ephemeral Rollups | MagicBlock SDK |
| Wallet Connection | Solana Wallet Adapter |
| Type Safety | TypeScript 5 |
