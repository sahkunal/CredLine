"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, Play, X, RotateCcw } from "lucide-react";
import { GlassCard } from "@/components/glass-card";
import { AddressDisplay } from "@/components/address-display";
import { CountdownTimer } from "@/components/countdown-timer";
import { useContract } from "@/lib/hooks/useContracts";
import { formatUsdc, formatRelativeTime, cn } from "@/lib/utils";

export default function ContractDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { data: contract, isLoading } = useContract(params.id);
  const [confirmAction, setConfirmAction] = useState<"cancel" | "reapprove" | null>(null);

  if (isLoading) {
    return (
      <div className="pt-8 space-y-4">
        <div className="skeleton h-32 rounded-2xl" />
        <div className="skeleton h-64 rounded-2xl" />
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="pt-16 text-center text-muted-foreground">
        Contract not found.
      </div>
    );
  }

  const isDue = contract.status === "due";

  return (
    <div className="pt-8 space-y-5">
      <button
        onClick={() => router.push("/contracts")}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft size={15} /> Back to contracts
      </button>

      <GlassCard className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AddressDisplay address={contract.payer.toBase58()} showAvatar showCopy />
            <span className="text-muted-foreground">&rarr;</span>
            <AddressDisplay address={contract.payee.toBase58()} showAvatar showCopy />
          </div>
          <span
            className={cn(
              "text-xs font-medium px-2.5 py-1 rounded-full border capitalize",
              isDue
                ? "text-warning bg-warning/10 border-warning/30"
                : "text-success bg-success/10 border-success/30"
            )}
          >
            {contract.status}
          </span>
        </div>

        <div className="grid sm:grid-cols-3 gap-4 mt-6">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Amount</div>
            <div className="font-mono text-lg text-foreground">{formatUsdc(contract.amount)}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Frequency</div>
            <div className="text-lg text-foreground capitalize">{contract.frequency}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Next payout</div>
            <CountdownTimer targetTimestamp={contract.nextPayoutTimestamp} className="text-lg" />
          </div>
        </div>

        <div className="flex gap-2.5 mt-6">
          {isDue && (
            <button className="rounded-xl px-4 py-2 text-sm font-display font-semibold text-background bg-flow-gradient flex items-center gap-1.5">
              <Play size={14} /> Execute payment
            </button>
          )}
          <button
            onClick={() => setConfirmAction("reapprove")}
            className="rounded-xl px-4 py-2 text-sm font-medium glass glass-hover flex items-center gap-1.5"
          >
            <RotateCcw size={14} /> Reapprove
          </button>
          <button
            onClick={() => setConfirmAction("cancel")}
            className="rounded-xl px-4 py-2 text-sm font-medium text-danger border border-danger/30 bg-danger/10 hover:bg-danger/15 transition-colors flex items-center gap-1.5"
          >
            <X size={14} /> Cancel
          </button>
        </div>
      </GlassCard>

      <GlassCard className="p-6">
        <h2 className="font-display font-semibold text-base mb-4">Payment history</h2>
        {contract.history.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No payments yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-white/5">
                <th className="pb-2.5 font-medium">Date</th>
                <th className="pb-2.5 font-medium">Amount</th>
                <th className="pb-2.5 font-medium">Score delta</th>
                <th className="pb-2.5 font-medium">Signature</th>
              </tr>
            </thead>
            <tbody>
              {contract.history.map((h: (typeof contract.history)[number]) => (
                <tr key={h.signature} className="border-b border-white/5 last:border-0">
                  <td className="py-3 text-muted-foreground">{formatRelativeTime(h.timestamp)}</td>
                  <td className="py-3 font-mono text-foreground">{formatUsdc(h.amount)}</td>
                  <td className="py-3">
                    <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-success/10 text-success">
                      +{h.scoreDelta}
                    </span>
                  </td>
                  <td className="py-3 font-mono text-muted-foreground">{h.signature}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </GlassCard>

      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <GlassCard className="p-6 max-w-sm w-full">
            <h3 className="font-display font-semibold text-base mb-2">
              {confirmAction === "cancel" ? "Cancel this contract?" : "Reapprove delegate?"}
            </h3>
            <p className="text-sm text-muted-foreground mb-5">
              {confirmAction === "cancel"
                ? "This will stop future payouts. This action cannot be undone."
                : "This will refresh the SPL delegate approval for this contract's payout amount."}
            </p>
            <div className="flex gap-2.5">
              <button
                onClick={() => setConfirmAction(null)}
                className="flex-1 rounded-xl py-2.5 text-sm font-medium glass glass-hover"
              >
                Dismiss
              </button>
              <button
                onClick={() => setConfirmAction(null)}
                className={cn(
                  "flex-1 rounded-xl py-2.5 text-sm font-display font-semibold",
                  confirmAction === "cancel"
                    ? "text-danger border border-danger/30 bg-danger/10"
                    : "text-background bg-flow-gradient"
                )}
              >
                Confirm
              </button>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
