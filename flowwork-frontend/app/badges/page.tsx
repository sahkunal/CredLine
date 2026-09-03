"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useWallet } from "@solana/wallet-adapter-react";
import { ShieldCheck, X } from "lucide-react";
import { BadgeCard } from "@/components/badge-card";
import { GlassCard } from "@/components/glass-card";
import { EmptyState } from "@/components/empty-state";
import { useBadge, ALL_TIERS } from "@/lib/hooks/useBadge";
import { useScoreAccount } from "@/lib/hooks/useScoreAccount";
import { formatUsdc, TIER_LABELS, type BadgeTier } from "@/lib/utils";

export default function BadgesPage() {
  const { connected } = useWallet();
  const { data: badge, isLoading: badgeLoading } = useBadge();
  const { data: score } = useScoreAccount();
  const [selected, setSelected] = useState<BadgeTier | null>(null);
  const [minting, setMinting] = useState(false);

  if (!connected) {
    return (
      <div className="pt-16">
        <EmptyState icon={ShieldCheck} title="Connect your wallet" description="Connect to view and mint your FlowBadge." />
      </div>
    );
  }

const currentTierIndex = badge ? ALL_TIERS.findIndex((t) => t.tier === badge.tierLabel) : -1;
  const eligibleForNext =
    score && currentTierIndex < ALL_TIERS.length - 1
      ? score.composite >= ALL_TIERS[currentTierIndex + 1].minScore
      : false;

  const handleMint = async () => {
    setMinting(true);
    // TODO: call flowbadge.mintBadge() via Anchor program
    await new Promise((r) => setTimeout(r, 1600));
    setMinting(false);
  };

  return (
    <div className="pt-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-bold">Badges</h1>
        {eligibleForNext && (
          <button
            onClick={handleMint}
            disabled={minting}
            className="rounded-xl px-4 py-2 text-sm font-display font-semibold text-background bg-flow-gradient hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {minting ? "Minting..." : "Mint badge"}
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {badgeLoading ? (
          [0, 1, 2, 3].map((i) => <div key={i} className="skeleton aspect-[3/4] rounded-2xl" />)
        ) : (
          ALL_TIERS.map((tierInfo, i) => {
            const isUnlocked = badge && i <= currentTierIndex;
            return (
              <motion.div
                key={tierInfo.tier}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
              >
                <BadgeCard
                  tier={tierInfo.tier}
                  locked={!isUnlocked}
                  requiredScore={tierInfo.minScore}
                  mintDate={isUnlocked && i === currentTierIndex && badge?.memberSince ? new Date(Number(badge.memberSince) * 1000).toLocaleDateString() : undefined}
compositeScore={isUnlocked && i === currentTierIndex ? badge?.compositeScore ?? undefined : undefined}
                  onClick={() => isUnlocked && i === currentTierIndex && setSelected(tierInfo.tier)}
                />
              </motion.div>
            );
          })
        )}
      </div>

      <AnimatePresence>
        {selected && badge && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
            onClick={() => setSelected(null)}
          >
            <motion.div
              initial={{ scale: 0.85, rotateY: -90 }}
              animate={{ scale: 1, rotateY: 0 }}
              exit={{ scale: 0.85, rotateY: 90 }}
              transition={{ duration: 0.4 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-xs"
            >
              <button
                onClick={() => setSelected(null)}
                className="absolute -top-10 right-0 text-muted-foreground hover:text-foreground"
              >
                <X size={20} />
              </button>
              <BadgeCard
                tier={selected}
               mintDate={badge.memberSince ? new Date(Number(badge.memberSince) * 1000).toLocaleDateString() : undefined}
compositeScore={badge.compositeScore ?? undefined}
totalContracts={badge.totalContracts ?? undefined}
totalEarned={badge.totalEarned ? formatUsdc(badge.totalEarned) : undefined}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
