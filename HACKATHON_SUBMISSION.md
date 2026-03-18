# Solus City - Hackathon Submission

## Project Summary
Solus City is a mobile-first, Solana-powered crime strategy RPG where players build stats, attack targets, earn rewards, and climb leaderboards in a persistent competitive world.

The MVP delivers a complete gameplay loop: wallet-based auth, progression through gym/crimes/shop, PvP and NPC battles, attack logs with revenge context, and social progression via syndicates. The experience is designed for quick session play with strategic decisions around risk, timing, and resource management.

## Tech Stack
- Mobile: React Native (TypeScript)
- Backend: Fastify + Prisma + PostgreSQL
- Auth: Wallet signature challenge/verify flow
- Game systems: combat stats, equipment effects, cooldowns, hospitalization, ranking, and event logs

## MVP Status
- End-to-end flow works from wallet connect to battle outcomes and progression.
- Android build/install verified on emulator.
- Core docs and setup guides included for reproducibility.

## Demo Script (1-2 Minutes)
1. 0:00 - 0:10 Intro
Solus City is a text-based crime RPG on Solana. I will show the full MVP gameplay loop in under two minutes.

2. 0:10 - 0:25 Login / Wallet
Open app -> Connect Wallet -> successful auth -> land on main gameplay view.
Callout: secure challenge-signature login flow.

3. 0:25 - 0:40 Progression Systems
Show gym and crimes quickly:
- Gym: train combat stats
- Crimes: risk/reward for cash and XP

4. 0:40 - 1:00 Targets and Battle
Open targets list (players + NPCs) -> attack one target -> show battle result details (damage, outcome, rewards, hospitalization impact).

5. 1:00 - 1:15 Logs + Revenge Context
Open attack logs -> show recent attacks and revenge-ready context.

6. 1:15 - 1:30 Shop + Equipment
Open shop -> show item categories and buy flow -> mention stat/equipment impact on combat.

7. 1:30 - 1:45 Syndicates + Leaderboard
Open syndicates (create/join/list) -> show leaderboard to demonstrate social and competitive layers.

8. 1:45 - 2:00 Close
This MVP proves the core game loop, wallet integration, progression systems, and social features. Next steps are deeper balancing, richer events, and expanded content.

## Known Limitations and Next Steps
- Balance and economy tuning are MVP-level, not final.
- Android-focused validation completed; broader device QA remains.
- More content depth planned: additional crimes, item tiers, NPC variety, and syndicate features.
- UX polish and onboarding can be expanded (tutorials and clearer progression guidance).
