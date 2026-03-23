"use client";

import { useMemo, useState } from "react";

function formatCash(value: number) {
  return `$${Math.floor(value).toLocaleString()}`;
}

type Props = {
  vaultCash: number;
  canDeposit?: boolean;
  canWithdraw?: boolean;
  busy?: boolean;
  onDeposit?: (amount: number) => Promise<void> | void;
  onWithdraw?: (amount: number) => Promise<void> | void;
};

export function SyndicateVaultCard({
  vaultCash,
  canDeposit = false,
  canWithdraw = false,
  busy = false,
  onDeposit,
  onWithdraw,
}: Props) {
  const [amount, setAmount] = useState("1000");
  const parsedAmount = useMemo(() => Math.max(0, Math.floor(Number(amount) || 0)), [amount]);

  return (
    <div className="rounded-lg border border-white/10 bg-black/20 p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black tracking-[3px] text-[#aab0a3] uppercase">Syndicate Vault</p>
          <p className="text-[12px] text-[#d0d5ca] mt-1">Shared funds for war pressure, safehouse upkeep, and social progression.</p>
        </div>
        <p className="text-[20px] font-black text-[#fdd835]">{formatCash(vaultCash)}</p>
      </div>

      {(canDeposit || canWithdraw) && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            inputMode="numeric"
            className="flex-1 rounded-md border border-white/10 bg-black/20 px-3 py-2 text-[12px] text-[#f2f4ec] outline-none"
            placeholder="Amount"
          />
          <div className="flex gap-2">
            {canDeposit && (
              <button
                type="button"
                disabled={busy || parsedAmount <= 0}
                onClick={() => onDeposit?.(parsedAmount)}
                className="rounded-md border border-[#1f5f36] bg-[#0f2a18] px-3 py-2 text-[10px] font-black tracking-[2px] text-[#66bb6a] disabled:opacity-40"
              >
                DEPOSIT
              </button>
            )}
            {canWithdraw && (
              <button
                type="button"
                disabled={busy || parsedAmount <= 0}
                onClick={() => onWithdraw?.(parsedAmount)}
                className="rounded-md border border-[rgba(153,69,255,0.3)] bg-[#1a0a2e] px-3 py-2 text-[10px] font-black tracking-[2px] text-[#9945FF] disabled:opacity-40"
              >
                WITHDRAW
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

