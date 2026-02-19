/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/fleet_wars.json`.
 */
export type FleetWars = {
  "address": "DiXQ85BSfM9qgPaTv6PAb2GhxRgGhfoarNGyAYJAqdJn",
  "metadata": {
    "name": "fleetWars",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "createGame",
      "docs": [
        "Phase 1 — L1: Player1 creates a game, commits their board hash, deposits wager."
      ],
      "discriminator": [
        124,
        69,
        75,
        66,
        184,
        220,
        72,
        206
      ],
      "accounts": [
        {
          "name": "game",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  97,
                  109,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "player1"
              },
              {
                "kind": "arg",
                "path": "gameId"
              }
            ]
          }
        },
        {
          "name": "player1",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "gameId",
          "type": "u64"
        },
        {
          "name": "boardHash",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "wager",
          "type": "u64"
        }
      ]
    },
    {
      "name": "delegateGame",
      "docs": [
        "Phase 1 — L1: Player1 delegates the game account to MagicBlock Ephemeral Rollup."
      ],
      "discriminator": [
        116,
        183,
        70,
        107,
        112,
        223,
        122,
        210
      ],
      "accounts": [
        {
          "name": "player1",
          "writable": true,
          "signer": true
        },
        {
          "name": "validator",
          "optional": true
        },
        {
          "name": "bufferPda",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  117,
                  102,
                  102,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "pda"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                188,
                239,
                109,
                155,
                161,
                35,
                107,
                125,
                162,
                216,
                132,
                38,
                196,
                170,
                53,
                71,
                199,
                79,
                25,
                229,
                184,
                67,
                244,
                225,
                187,
                234,
                236,
                194,
                169,
                37,
                212,
                7
              ]
            }
          }
        },
        {
          "name": "delegationRecordPda",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  108,
                  101,
                  103,
                  97,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "pda"
              }
            ],
            "program": {
              "kind": "account",
              "path": "delegationProgram"
            }
          }
        },
        {
          "name": "delegationMetadataPda",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  108,
                  101,
                  103,
                  97,
                  116,
                  105,
                  111,
                  110,
                  45,
                  109,
                  101,
                  116,
                  97,
                  100,
                  97,
                  116,
                  97
                ]
              },
              {
                "kind": "account",
                "path": "pda"
              }
            ],
            "program": {
              "kind": "account",
              "path": "delegationProgram"
            }
          }
        },
        {
          "name": "pda",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  97,
                  109,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "player1"
              },
              {
                "kind": "arg",
                "path": "gameId"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "ownerProgram",
          "address": "DiXQ85BSfM9qgPaTv6PAb2GhxRgGhfoarNGyAYJAqdJn"
        },
        {
          "name": "delegationProgram",
          "address": "DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh"
        }
      ],
      "args": [
        {
          "name": "gameId",
          "type": "u64"
        }
      ]
    },
    {
      "name": "endSession",
      "docs": [
        "Phase 2 — ER: Manually end the ER session (e.g. opponent abandoned)."
      ],
      "discriminator": [
        11,
        244,
        61,
        154,
        212,
        249,
        15,
        66
      ],
      "accounts": [
        {
          "name": "game",
          "writable": true
        },
        {
          "name": "player",
          "writable": true,
          "signer": true
        },
        {
          "name": "magicContext",
          "writable": true,
          "address": "MagicContext1111111111111111111111111111111"
        },
        {
          "name": "magicProgram",
          "address": "Magic11111111111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "finalize",
      "docs": [
        "Phase 3 — L1: Verifies both reveals, detects cheaters, pays winner."
      ],
      "discriminator": [
        171,
        61,
        218,
        56,
        127,
        115,
        12,
        217
      ],
      "accounts": [
        {
          "name": "game",
          "writable": true
        },
        {
          "name": "winner",
          "writable": true
        },
        {
          "name": "caller",
          "signer": true
        }
      ],
      "args": []
    },
    {
      "name": "fireShot",
      "docs": [
        "Phase 2 — ER: Active player fires a shot at a cell (0–63)."
      ],
      "discriminator": [
        66,
        150,
        104,
        42,
        242,
        254,
        17,
        199
      ],
      "accounts": [
        {
          "name": "game",
          "writable": true
        },
        {
          "name": "player",
          "signer": true
        }
      ],
      "args": [
        {
          "name": "cell",
          "type": "u8"
        }
      ]
    },
    {
      "name": "joinGame",
      "docs": [
        "Phase 1 — L1: Player2 joins, commits their board hash, deposits wager."
      ],
      "discriminator": [
        107,
        112,
        18,
        38,
        56,
        173,
        60,
        128
      ],
      "accounts": [
        {
          "name": "game",
          "writable": true
        },
        {
          "name": "player2",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "boardHash",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        }
      ]
    },
    {
      "name": "processUndelegation",
      "discriminator": [
        196,
        28,
        41,
        206,
        48,
        37,
        51,
        167
      ],
      "accounts": [
        {
          "name": "baseAccount",
          "writable": true
        },
        {
          "name": "buffer"
        },
        {
          "name": "payer",
          "writable": true
        },
        {
          "name": "systemProgram"
        }
      ],
      "args": [
        {
          "name": "accountSeeds",
          "type": {
            "vec": "bytes"
          }
        }
      ]
    },
    {
      "name": "respondShot",
      "docs": [
        "Phase 2 — ER: Opponent declares hit or miss for the last shot.",
        "Auto-undelegates back to L1 when all ships are sunk."
      ],
      "discriminator": [
        59,
        59,
        219,
        146,
        86,
        104,
        104,
        45
      ],
      "accounts": [
        {
          "name": "game",
          "writable": true
        },
        {
          "name": "player",
          "writable": true,
          "signer": true
        }
      ],
      "args": [
        {
          "name": "hit",
          "type": "bool"
        }
      ]
    },
    {
      "name": "revealBoard",
      "docs": [
        "Phase 3 — L1: Each player reveals their actual board + salt to prove honesty."
      ],
      "discriminator": [
        24,
        194,
        178,
        9,
        120,
        113,
        199,
        252
      ],
      "accounts": [
        {
          "name": "game",
          "writable": true
        },
        {
          "name": "player",
          "signer": true
        }
      ],
      "args": [
        {
          "name": "board",
          "type": "u64"
        },
        {
          "name": "salt",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "game",
      "discriminator": [
        27,
        90,
        166,
        125,
        74,
        100,
        121,
        18
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "invalidGameState",
      "msg": "Game is not in the expected state"
    },
    {
      "code": 6001,
      "name": "notYourTurn",
      "msg": "Not your turn"
    },
    {
      "code": 6002,
      "name": "cellAlreadyShot",
      "msg": "Cell already shot"
    },
    {
      "code": 6003,
      "name": "invalidCell",
      "msg": "Invalid cell — out of bounds (0–63)"
    },
    {
      "code": 6004,
      "name": "gameNotActive",
      "msg": "Game is not active"
    },
    {
      "code": 6005,
      "name": "boardHashMismatch",
      "msg": "Board hash mismatch — cheater detected"
    },
    {
      "code": 6006,
      "name": "invalidBoard",
      "msg": "Invalid board: must have exactly 9 ship cells"
    },
    {
      "code": 6007,
      "name": "gameNotReady",
      "msg": "Both players must reveal before finalize"
    },
    {
      "code": 6008,
      "name": "unauthorized",
      "msg": "unauthorized"
    }
  ],
  "types": [
    {
      "name": "game",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "player1",
            "type": "pubkey"
          },
          {
            "name": "player2",
            "type": "pubkey"
          },
          {
            "name": "p1BoardHash",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "p2BoardHash",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "p1Shots",
            "type": "u64"
          },
          {
            "name": "p2Shots",
            "type": "u64"
          },
          {
            "name": "p1DeclaredHits",
            "type": "u64"
          },
          {
            "name": "p2DeclaredHits",
            "type": "u64"
          },
          {
            "name": "p1Board",
            "type": "u64"
          },
          {
            "name": "p2Board",
            "type": "u64"
          },
          {
            "name": "wager",
            "type": "u64"
          },
          {
            "name": "gameId",
            "type": "u64"
          },
          {
            "name": "p1HitsOnP2",
            "type": "u8"
          },
          {
            "name": "p2HitsOnP1",
            "type": "u8"
          },
          {
            "name": "lastShotCell",
            "type": "u8"
          },
          {
            "name": "turnState",
            "type": "u8"
          },
          {
            "name": "gameState",
            "type": "u8"
          },
          {
            "name": "p1Revealed",
            "type": "bool"
          },
          {
            "name": "p2Revealed",
            "type": "bool"
          },
          {
            "name": "winner",
            "type": "u8"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    }
  ]
};
