# Solus City — Comprehensive Game Guide

> A Torn-style mobile PvP crime RPG on Solana where players train stats, commit crimes, buy units, and battle for RP dominance.

---

## Table of Contents

1. [Core Resources & Bars](#core-resources--bars)
2. [Income System](#income-system)
3. [Leveling & XP](#leveling--xp)
4. [Combat System](#combat-system)
5. [Gym Training](#gym-training)
6. [Crimes](#crimes)
7. [Shop & Items](#shop--items)
8. [Hospital & Shield](#hospital--shield)
9. [Targets & Matchmaking](#targets--matchmaking)
10. [Event Log Types](#event-log-types)
11. [New Player Defaults](#new-player-defaults)
12. [Abbreviations & Glossary](#abbreviations--glossary)

---

## Core Resources & Bars

| Bar         | Max (Default) | Regen Rate              | Notes                            |
|-------------|---------------|-------------------------|----------------------------------|
| **Health**  | 100           | No passive regen        | +5 max HP per level up           |
| **Energy**  | 20            | 1 per 5 minutes         | Used for attacking & gym         |
| **Nerve**   | 10            | 1 per 3 minutes         | Used for crimes                  |
| **Happiness** | 50          | No passive regen        | Consumed by gym for bonus gains  |

- Energy and Nerve regenerate passively based on elapsed time since last tick (server-side).
- Full Energy refill from 0: **100 minutes** (1 hr 40 min).
- Full Nerve refill from 0: **30 minutes**.

---

## Income System

| Constant               | Value       |
|------------------------|-------------|
| Base income per hour   | **$100/hr** |
| Max accrual cap        | **24 hours** |

- Cash income accumulates passively while offline.
- Maximum offline earnings: **$2,400** (24 hrs × $100/hr).
- Income is applied on every server action (attack, train, crime, shop purchase).

---

## Leveling & XP

| Constant           | Value   |
|--------------------|---------|
| XP per level       | **100 × current level** |
| Max level          | **100** |
| HP per level       | **+5 max health** |

### XP Formula

XP required to level up = `100 × current_level`

- Level 1 → 2: 100 XP
- Level 2 → 3: 200 XP
- Level 10 → 11: 1,000 XP
- Multiple level-ups can occur in a single action if enough XP is accumulated.

### XP Sources

| Source            | XP Gained                         |
|-------------------|-----------------------------------|
| Battle (win)      | 15–24 (random)                    |
| Battle (loss)     | 5                                 |
| Gym training      | 10                                |
| Crime (success)   | Crime's `xpReward` value          |
| Crime (failure)   | Half of crime's `xpReward` (floored) |

---

## Combat System

### Attack Cost

- **1 Energy** per attack.
- **10-minute cooldown** per specific target after attacking them.

### Attack Power (AP) & Defense Power (DP)

```
AP = BASE_ATK + strength + Σ(item.atk × qty_owned)
DP = BASE_DEF + defense  + Σ(item.def × qty_owned)
```

| Constant   | Value |
|------------|-------|
| BASE_ATK   | 10    |
| BASE_DEF   | 10    |

- **Strength** stat (trained at gym) adds directly to AP.
- **Defense** stat (trained at gym) adds directly to DP.
- Every item owned contributes `atk × quantity` to AP and `def × quantity` to DP.

### Win Probability

```
pWin = attackerAP / (attackerAP + defenderDP)
```

A random roll (0–1) is compared against `pWin`. If `roll < pWin`, the attacker wins.

**Example:** Attacker AP 100 vs Defender DP 100 → 50% win chance.

### Damage

| Constant           | Value |
|--------------------|-------|
| Min base damage    | 15    |
| Max base damage    | 40    |

```
baseDmg = random(15–40)
winnerDmg = floor(baseDmg × 0.3)    // ~4–12 damage to winner
loserDmg  = baseDmg                   // 15–40 damage to loser
```

- The **winner** takes reduced damage (30% of base).
- The **loser** takes full base damage.
- If health reaches 0, the player is **hospitalized**.

### Loot (Win Only)

| Constant      | Value |
|---------------|-------|
| Loot percent  | **8%** of defender's cash |
| Loot cap      | **$5,000** max per attack |

```
loot = min(defender.cash × 0.08, 5000)
```

### Reputation Points (RP)

| Constant          | Value |
|-------------------|-------|
| RP base (win)     | +10   |
| RP bonus min      | −5    |
| RP bonus max      | +15   |
| RP loss (defeat)  | −5    |

**Win RP formula:**
```
rpGain = 10 + clamp((defenderRP − attackerRP) / 50, −5, +15)
```

- Beating higher-RP targets gives more RP (up to +25 total).
- Beating lower-RP targets gives less RP (minimum +5 total).
- RP cannot drop below 0.

**Loss:** Flat −5 RP.

---

## Gym Training

### Cost

| Resource   | Cost per Train |
|------------|----------------|
| Energy     | **5**          |
| Happiness  | **5** (optional, for bonus) |

### Trainable Stats

| Stat         | Effect                         |
|--------------|--------------------------------|
| **Strength** | Adds to Attack Power (AP)      |
| **Speed**    | Combat stat (future use)       |
| **Defense**  | Adds to Defense Power (DP)     |
| **Dexterity**| Combat stat (future use)       |

### Stat Gain

```
baseGain  = random(1–3)
happyBonus = 1 (if happiness ≥ 5, costs 5 happiness)
totalGain  = baseGain + happyBonus
```

- **Without happiness:** Gain 1–3 stat points.
- **With happiness (≥5):** Gain 2–4 stat points (spends 5 happiness).
- Awards **10 XP** per train session.

---

## Crimes

### How Crimes Work

1. Each crime has a **nerve cost**, **success rate**, **cash reward range**, **XP reward**, and **level requirement**.
2. Spend nerve → roll against success rate → earn cash & XP on success, half XP on failure.
3. Crimes are unlocked as your level increases.

### Crime List

| Crime                | Nerve | Success Rate | Cash Reward       | XP  | Level Req |
|----------------------|-------|-------------|-------------------|-----|-----------|
| Pickpocket           | 1     | 90%         | $10 – $50         | 5   | 1         |
| Shoplift             | 2     | 80%         | $30 – $120        | 8   | 1         |
| Mug a Stranger       | 3     | 70%         | $80 – $300        | 12  | 3         |
| Rob a Store          | 4     | 60%         | $200 – $800       | 18  | 5         |
| Grand Theft Auto     | 5     | 50%         | $500 – $2,000     | 25  | 8         |
| Armed Robbery        | 6     | 40%         | $1,000 – $4,000   | 35  | 12        |
| Hack a Corporation   | 8     | 30%         | $3,000 – $10,000  | 50  | 18        |
| Heist                | 10    | 20%         | $8,000 – $25,000  | 75  | 25        |

### Crime XP on Failure

On failure, you earn **half the XP** (floored): e.g., Heist failure = 37 XP.

---

## Shop & Items

### Purchase Rules

- Max **100 units** per single purchase.
- Items cost cash; each unit owned contributes its ATK/DEF to your AP/DP.

### Item List

| Item         | ATK | DEF | Price    | Role           |
|--------------|-----|-----|----------|----------------|
| Recruit      | 5   | 3   | $100     | Starter unit   |
| Soldier      | 12  | 10  | $500     | Early game     |
| Elite        | 30  | 25  | $2,000   | Mid game       |
| Mercenary    | 50  | 35  | $5,000   | Mid-late game  |
| Assassin     | 80  | 20  | $10,000  | Glass cannon   |
| Guardian     | 20  | 90  | $10,000  | Tank           |
| Warlord      | 120 | 100 | $25,000  | End game       |

### Effective Stats per Dollar

| Item      | ATK/$ | DEF/$ | Total/$ |
|-----------|-------|-------|---------|
| Recruit   | 0.050 | 0.030 | 0.080   |
| Soldier   | 0.024 | 0.020 | 0.044   |
| Elite     | 0.015 | 0.013 | 0.028   |
| Mercenary | 0.010 | 0.007 | 0.017   |
| Assassin  | 0.008 | 0.002 | 0.010   |
| Guardian  | 0.002 | 0.009 | 0.011   |
| Warlord   | 0.005 | 0.004 | 0.009   |

> **Note:** Recruits are the most cost-efficient; higher-tier units have better raw stats but worse $/point ratio.

---

## Hospital & Shield

### Hospital

| Constant                | Value          |
|-------------------------|----------------|
| Hospital time per damage | **1 minute per HP of damage dealt** |

- When health drops to **0** in battle, you are hospitalized.
- Hospital duration = `damage_taken × 1 minute`.
- While hospitalized: **cannot attack, train, or commit crimes**.
- If a blocked action is attempted, the server now returns `IN_HOSPITAL` and a `recoverAt` timestamp so UI can show the exact recovery time.
- Hospital time ranges from **15–40 minutes** (based on damage dealt).

### New Account Shield

| Constant         | Value      |
|------------------|------------|
| Shield duration  | **24 hours** |

- New accounts receive a **24-hour attack shield**.
- While shielded, other players **cannot attack you**.
- Shield does NOT prevent you from attacking others.

---

## Targets & Matchmaking

| Constant           | Value     |
|--------------------|-----------|
| Target count       | **10**    |
| RP band fraction   | **25%**   |
| RP band minimum    | **200**   |

### How Targets are Selected

1. Calculate RP band: `band = max(yourRP × 0.25, 200)`
2. RP range: `[yourRP − band, yourRP + band]`
3. Exclude: yourself, shielded players, players on cooldown.
4. Randomly select up to **10 targets** from candidates.

**Example:** At 1000 RP, you see targets between 750–1250 RP.
At 100 RP, band is minimum 200, so you see targets between 0–300 RP.

---

## Event Log Types

| Type           | Trigger                              |
|----------------|--------------------------------------|
| `attack_win`   | You won an attack                    |
| `attack_loss`  | You lost an attack                   |
| `attacked`     | Someone attacked you (win or lose)   |
| `crime`        | Crime committed (success or failure) |
| `gym`          | Gym training completed               |
| `hospital`     | Hospitalized from battle             |
| `level_up`     | Leveled up                           |
| `shop`         | Item purchased                       |

---

## New Player Defaults

| Stat          | Starting Value |
|---------------|----------------|
| Cash          | $1,000         |
| RP            | 100            |
| Health        | 100/100        |
| Energy        | 20/20          |
| Nerve         | 10/10          |
| Happiness     | 50/50          |
| Level         | 1              |
| XP            | 0              |
| Strength      | 0              |
| Speed         | 0              |
| Defense       | 0              |
| Dexterity     | 0              |
| Shield        | 24 hours       |

---

## Abbreviations & Glossary

| Term   | Meaning                                    |
|--------|--------------------------------------------|
| **AP** | Attack Power — total offensive strength     |
| **DP** | Defense Power — total defensive strength    |
| **RP** | Reputation Points — PvP ranking metric      |
| **XP** | Experience Points — progress toward leveling |
| **HP** | Health Points                               |
| **ATK**| Attack stat (on items)                      |
| **DEF**| Defense stat (on items)                     |
| **NPC**| Non-Player Character                        |
| **pWin** | Win probability in battle                 |
| **Regen** | Regeneration (passive resource recovery) |
| **Cooldown** | Timer preventing re-attack on same target |
| **Hospital** | Incapacitated state after losing all HP |
| **Shield** | Temporary attack immunity (new accounts) |
| **Nerve** | Resource consumed by crimes              |
| **Happiness** | Resource consumed by gym for bonus stats |
