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
    <div className="sc-panel-strong p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div>
<<<<<<< HEAD
          <p className="text-[10px] font-black tracking-[3px] text-[#aab0a3] uppercase">Syndicate Vault</p>
          <p className="text-[12px] text-[#d0d5ca] mt-1">Shared funds for war pressure, safehouse upkeep, and social progression.</p>
=======
          <p className="sc-kicker">Syndicate Vault</p>
          <p className="mt-2 text-[12px] text-[#84879a]">Shared funds for war pressure, safehouse upkeep, and social progression.</p>
>>>>>>> 7dccf61e7c80995907d8b90e223f68e5f9950b39
        </div>
        <p className="text-[24px] font-black text-[#36d47f]">{formatCash(vaultCash)}</p>
      </div>

      {canDeposit || canWithdraw ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            inputMode="numeric"
<<<<<<< HEAD
            className="flex-1 rounded-md border border-white/10 bg-black/20 px-3 py-2 text-[12px] text-[#f2f4ec] outline-none"
=======
            className="flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-[12px] text-[#eee] outline-none"
>>>>>>> 7dccf61e7c80995907d8b90e223f68e5f9950b39
            placeholder="Amount"
          />
          <div className="flex gap-2">
            {canDeposit ? (
              <button type="button" disabled={busy || parsedAmount <= 0} onClick={() => onDeposit?.(parsedAmount)} className="sc-button sc-button-green">
                Deposit
              </button>
            ) : null}
            {canWithdraw ? (
              <button type="button" disabled={busy || parsedAmount <= 0} onClick={() => onWithdraw?.(parsedAmount)} className="sc-button sc-button-primary">
                Withdraw
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
<<<<<<< HEAD
}

=======
}
>>>>>>> 7dccf61e7c80995907d8b90e223f68e5f9950b39
