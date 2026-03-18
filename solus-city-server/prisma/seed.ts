import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // -- Items (units + equipment) --
  const items = [
    { category: "unit", name: "Recruit", atk: 5, def: 3, speed: 0, dex: 0, price: 100, levelRequirement: 1, rarity: "common", description: "Entry unit", stackable: true, isUnique: false },
    { category: "unit", name: "Soldier", atk: 12, def: 10, speed: 0, dex: 0, price: 500, levelRequirement: 2, rarity: "common", description: "Reliable frontline", stackable: true, isUnique: false },
    { category: "unit", name: "Elite", atk: 30, def: 25, speed: 0, dex: 0, price: 2000, levelRequirement: 6, rarity: "rare", description: "Trained tactical unit", stackable: true, isUnique: false },
    { category: "unit", name: "Mercenary", atk: 50, def: 35, speed: 0, dex: 0, price: 5000, levelRequirement: 10, rarity: "rare", description: "Paid heavy hitter", stackable: true, isUnique: false },
    { category: "unit", name: "Assassin", atk: 80, def: 20, speed: 0, dex: 0, price: 10000, levelRequirement: 14, rarity: "epic", description: "Glass cannon specialist", stackable: true, isUnique: false },
    { category: "unit", name: "Guardian", atk: 20, def: 90, speed: 0, dex: 0, price: 10000, levelRequirement: 14, rarity: "epic", description: "Defensive tank", stackable: true, isUnique: false },
    { category: "unit", name: "Warlord", atk: 120, def: 100, speed: 0, dex: 0, price: 25000, levelRequirement: 22, rarity: "legendary", description: "Endgame command unit", stackable: true, isUnique: false },
    { category: "equipment", name: "Knife", atk: 10, def: 0, speed: 0, dex: 0, price: 350, levelRequirement: 1, rarity: "common", description: "Light melee weapon", stackable: true, isUnique: false },
    { category: "equipment", name: "Pistol", atk: 25, def: 0, speed: 0, dex: 0, price: 1200, levelRequirement: 4, rarity: "uncommon", description: "Standard sidearm", stackable: true, isUnique: false },
    { category: "equipment", name: "Kevlar Vest", atk: 0, def: 30, speed: 0, dex: 0, price: 1800, levelRequirement: 5, rarity: "uncommon", description: "Layered body armor", stackable: true, isUnique: false },
    { category: "equipment", name: "Tactical Boots", atk: 0, def: 0, speed: 8, dex: 0, price: 1400, levelRequirement: 5, rarity: "uncommon", description: "Mobility upgrade", stackable: true, isUnique: false },
    { category: "equipment", name: "Smart Goggles", atk: 0, def: 0, speed: 0, dex: 8, price: 1600, levelRequirement: 6, rarity: "rare", description: "Targeting assist optics", stackable: true, isUnique: false },
    { category: "equipment", name: "Combat Drone", atk: 15, def: 0, speed: 0, dex: 10, price: 4200, levelRequirement: 12, rarity: "epic", description: "Autonomous support platform", stackable: true, isUnique: false },
  ];

  const itemCount = await prisma.item.count();
  if (itemCount === 0) {
    await prisma.item.createMany({ data: items });
    console.log(`Seeded ${items.length} items.`);
  } else {
    // Upsert any new items that don't exist yet
    let added = 0;
    for (const item of items) {
      const exists = await prisma.item.findFirst({ where: { name: item.name } });
      if (!exists) {
        await prisma.item.create({ data: item });
        added++;
      } else {
        await prisma.item.update({
          where: { id: exists.id },
          data: {
            category: item.category,
            atk: item.atk,
            def: item.def,
            speed: item.speed,
            dex: item.dex,
            price: item.price,
            levelRequirement: item.levelRequirement,
            rarity: item.rarity,
            description: item.description,
            stackable: item.stackable,
            isUnique: item.isUnique,
          },
        });
      }
    }
    if (added > 0) {
      console.log(`Added ${added} new items (${itemCount} already existed).`);
    } else {
      console.log(`All ${itemCount} items already seeded.`);
    }
  }

  // -- Crimes --
  const crimes = [
    { name: "Pickpocket",         nerveCost: 1, cashMin: 10,    cashMax: 50,     xpReward: 5,   successRate: 0.9,  levelReq: 1  },
    { name: "Shoplift",           nerveCost: 2, cashMin: 30,    cashMax: 120,    xpReward: 8,   successRate: 0.8,  levelReq: 1  },
    { name: "Mug a Stranger",     nerveCost: 3, cashMin: 80,    cashMax: 300,    xpReward: 12,  successRate: 0.7,  levelReq: 3  },
    { name: "Rob a Store",        nerveCost: 4, cashMin: 200,   cashMax: 800,    xpReward: 18,  successRate: 0.6,  levelReq: 5  },
    { name: "Grand Theft Auto",   nerveCost: 5, cashMin: 500,   cashMax: 2000,   xpReward: 25,  successRate: 0.5,  levelReq: 8  },
    { name: "Armed Robbery",      nerveCost: 6, cashMin: 1000,  cashMax: 4000,   xpReward: 35,  successRate: 0.4,  levelReq: 12 },
    { name: "Hack a Corporation", nerveCost: 8, cashMin: 3000,  cashMax: 10000,  xpReward: 50,  successRate: 0.3,  levelReq: 18 },
    { name: "Heist",              nerveCost: 10, cashMin: 8000, cashMax: 25000,  xpReward: 75,  successRate: 0.2,  levelReq: 25 },
  ];

  const crimeCount = await prisma.crime.count();
  if (crimeCount === 0) {
    await prisma.crime.createMany({ data: crimes });
    console.log(`Seeded ${crimes.length} crimes.`);
  } else {
    console.log(`Crimes already seeded (${crimeCount} found). Skipping.`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
