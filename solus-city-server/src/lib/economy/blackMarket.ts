import { Prisma, PrismaClient } from "@prisma/client";
import {
  BLACK_MARKET_MAX_LISTINGS,
  BLACK_MARKET_ROTATION_HOURS,
  BLACK_MARKET_STING_MAX_PERCENT,
} from "../config/balance";
import { applyHeat, decayHeat } from "../player/heat";
import { calculateBlackMarketHeatGain, calculateBlackMarketPrice } from "./marketPricing";
import { getPlayerPerkContext } from "../player/perks";

export class BlackMarketError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

type PrismaLike = PrismaClient | Prisma.TransactionClient;

function getRotationWindow(now: Date) {
  const slotHours = BLACK_MARKET_ROTATION_HOURS;
  const startHour = Math.floor(now.getUTCHours() / slotHours) * slotHours;
  const startsAt = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    startHour,
    0,
    0,
    0
  ));
  const endsAt = new Date(startsAt.getTime() + slotHours * 60 * 60 * 1000);
  return { startsAt, endsAt };
}

function getRotationTheme(startsAt: Date) {
  const themes = ["contraband", "street meds", "dirty tech", "armor scraps"];
  return themes[startsAt.getUTCHours() % themes.length];
}

function pickRotationItems<T>(items: T[], startsAt: Date) {
  if (items.length <= BLACK_MARKET_MAX_LISTINGS) return items;
  const offset = startsAt.getUTCHours() % items.length;
  return Array.from({ length: BLACK_MARKET_MAX_LISTINGS }, (_, index) => items[(offset + index) % items.length]);
}

export function reserveListingStock(currentStock: number, qty: number) {
  if (qty <= 0) {
    throw new Error("Quantity must be greater than 0");
  }
  if (qty > currentStock) {
    throw new Error("Listing does not have enough stock");
  }
  return currentStock - qty;
}

async function createRotation(tx: PrismaLike, now: Date) {
  const { startsAt, endsAt } = getRotationWindow(now);
  const existing = await tx.blackMarketRotation.findFirst({
    where: { startsAt, endsAt, status: "active" },
    include: { listings: true },
  });

  if (existing) return existing;

  await tx.blackMarketRotation.updateMany({
    where: { status: "active", endsAt: { lte: now } },
    data: { status: "ended" },
  });

  const rotation = await tx.blackMarketRotation.create({
    data: {
      startsAt,
      endsAt,
      status: "active",
      theme: getRotationTheme(startsAt),
    },
  });

  const items = await tx.item.findMany({
    where: { blackMarketOnly: true },
    orderBy: [{ price: "asc" }, { name: "asc" }],
  });
  const pickedItems = pickRotationItems(items, startsAt);

  for (const item of pickedItems) {
    const riskPercent = Math.min(
      BLACK_MARKET_STING_MAX_PERCENT,
      Math.max(4, Math.round((item.riskValue ?? 0) + (item.consumable ? 2 : 5)))
    );
    const stock = item.isUnique ? 1 : item.stackable ? 8 : 3;

    await tx.blackMarketListing.create({
      data: {
        rotationId: rotation.id,
        itemId: item.id,
        basePrice: item.price,
        finalPrice: calculateBlackMarketPrice(item.price, riskPercent, item.consumable ? "consumable" : item.category),
        stock,
        remainingStock: stock,
        riskPercent,
        requiredHeatMin: Math.max(0, Math.round((item.riskValue ?? 0) * 2)),
        requiredLevelMin: item.levelRequirement,
        listingType: item.consumable ? "consumable" : item.category === "equipment" ? "gear" : item.category,
      },
    });
  }

  return tx.blackMarketRotation.findUniqueOrThrow({
    where: { id: rotation.id },
    include: { listings: true },
  });
}

export async function getActiveRotation(prisma: PrismaLike, now: Date = new Date()) {
  const active = await prisma.blackMarketRotation.findFirst({
    where: { status: "active", startsAt: { lte: now }, endsAt: { gt: now } },
    include: { listings: true },
    orderBy: { startsAt: "desc" },
  });

  if (active) return active;
  return createRotation(prisma, now);
}

export async function getBlackMarketListings(prisma: PrismaClient, userId?: string, now: Date = new Date()) {
  const rotation = await getActiveRotation(prisma, now);
  const listings = await prisma.blackMarketListing.findMany({
    where: { rotationId: rotation.id, active: true },
    include: { item: true },
    orderBy: [{ finalPrice: "asc" }, { createdAt: "asc" }],
  });

  const [profile, perkContext] = userId
    ? await Promise.all([
        prisma.profile.findUnique({ where: { userId } }),
        getPlayerPerkContext(userId, prisma),
      ])
    : [null, null];

  return {
    rotation,
    listings: listings.map((listing) => ({
      ...listing,
      finalPrice:
        perkContext && perkContext.effects.black_market_discount_percent
          ? Math.max(
              1,
              Math.round(
                listing.finalPrice * (1 - Math.min(0.35, perkContext.effects.black_market_discount_percent))
              )
            )
          : listing.finalPrice,
    })),
    profile,
  };
}

export async function buyBlackMarketListing(
  prisma: PrismaClient,
  userId: string,
  listingId: string,
  qty: number,
  now: Date = new Date()
) {
  if (!Number.isInteger(qty) || qty <= 0) {
    throw new BlackMarketError(400, "Quantity must be greater than 0");
  }

  return prisma.$transaction(async (tx) => {
    const rotation = await getActiveRotation(tx, now);
    const listing = await tx.blackMarketListing.findUnique({
      where: { id: listingId },
      include: { item: true },
    });
    const [profile, perkContext] = await Promise.all([
      tx.profile.findUnique({ where: { userId } }),
      getPlayerPerkContext(userId, tx),
    ]);

    if (!listing || !listing.active || listing.rotationId !== rotation.id || listing.remainingStock <= 0) {
      throw new BlackMarketError(404, "Listing is not available");
    }
    if (!profile) {
      throw new BlackMarketError(404, "Profile not found");
    }

    const heatState = decayHeat(profile, now);
    if (profile.level < listing.requiredLevelMin) {
      throw new BlackMarketError(400, `Requires level ${listing.requiredLevelMin}`);
    }
    if (heatState.heat < listing.requiredHeatMin) {
      throw new BlackMarketError(400, `Requires heat ${listing.requiredHeatMin}`);
    }

    reserveListingStock(listing.remainingStock, qty);

    const perkDiscount = Math.min(0.35, perkContext.effects.black_market_discount_percent ?? 0);
    const pricePaid = Math.max(1, Math.round(listing.finalPrice * (1 - perkDiscount))) * qty;
    if (profile.cash < pricePaid) {
      throw new BlackMarketError(400, "Insufficient wallet cash");
    }

    const updateStock = await tx.blackMarketListing.updateMany({
      where: { id: listing.id, remainingStock: { gte: qty } },
      data: { remainingStock: { decrement: qty } },
    });
    if (updateStock.count === 0) {
      throw new BlackMarketError(409, "Listing sold out");
    }

    const stingTriggered = Math.random() * 100 < listing.riskPercent;
    let heatChange = calculateBlackMarketHeatGain(listing.riskPercent, listing.item.riskValue ?? 0) * qty;
    if (stingTriggered) {
      heatChange += 8;
    }
    const heatUpdate = applyHeat({ ...profile, ...heatState }, heatChange, now);

    const updatedProfile = await tx.profile.update({
      where: { userId },
      data: {
        cash: profile.cash - pricePaid,
        heat: heatUpdate.heat,
        wantedTier: heatUpdate.wantedTier,
        lastHeatDecayAt: heatUpdate.lastHeatDecayAt,
      },
    });

    await tx.inventory.upsert({
      where: { userId_itemId: { userId, itemId: listing.itemId } },
      update: {
        qty: { increment: qty },
        sourceType: "black_market",
        durability: listing.item.slot ? 100 : undefined,
        expiresAt: listing.item.effectDurationSecs
          ? new Date(now.getTime() + listing.item.effectDurationSecs * 1000)
          : undefined,
      },
      create: {
        userId,
        itemId: listing.itemId,
        qty,
        sourceType: "black_market",
        durability: listing.item.slot ? 100 : null,
        expiresAt: listing.item.effectDurationSecs
          ? new Date(now.getTime() + listing.item.effectDurationSecs * 1000)
          : null,
      },
    });

    if (listing.item.slot) {
      const equippedSameSlot = await tx.inventory.findFirst({
        where: {
          userId,
          equipped: true,
          item: { slot: listing.item.slot },
        },
      });

      if (!equippedSameSlot) {
        await tx.inventory.update({
          where: { userId_itemId: { userId, itemId: listing.itemId } },
          data: { equipped: true },
        });
      }
    }

    const purchase = await tx.blackMarketPurchase.create({
      data: {
        userId,
        listingId: listing.id,
        itemId: listing.itemId,
        qty,
        pricePaid,
        heatGained: heatChange,
        stingTriggered,
      },
    });

    await tx.eventLog.create({
      data: {
        userId,
        type: "black_market_purchase",
        message: `Bought ${qty}x ${listing.item.name} from the black market`,
        metadata: {
          listingId: listing.id,
          qty,
          pricePaid,
          heatChange,
          stingTriggered,
          perkDiscount,
        },
      },
    });

    return {
      purchase,
      listing,
      profile: updatedProfile,
      heatChange,
      stingTriggered,
    };
  });
}
