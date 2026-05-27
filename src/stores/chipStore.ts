import { create } from "zustand";

type ChipState = {
  balance: number;
  streak: number;
  multiplier: number;
  wager: (amount: number) => boolean;
  win: (amount: number) => void;
  lose: () => void;
  setMultiplier: (value: number) => void;
  reset: () => void;
};

const STARTER_CHIPS = 2500;

export const useChipStore = create<ChipState>((set, get) => ({
  balance: STARTER_CHIPS,
  streak: 0,
  multiplier: 1,
  wager: (amount) => {
    const balance = get().balance;
    if (amount <= 0 || amount > balance) return false;
    set({ balance: balance - amount });
    return true;
  },
  win: (amount) =>
    set((state) => {
      const streak = state.streak + 1;
      const streakBonus = streak > 2 ? Math.min(0.5, streak * 0.05) : 0;
      return {
        balance: state.balance + Math.round(amount * (1 + streakBonus)),
        streak,
        multiplier: Number((state.multiplier + 0.1).toFixed(1))
      };
    }),
  lose: () => set({ streak: 0, multiplier: 1 }),
  setMultiplier: (value) => set({ multiplier: value }),
  reset: () => set({ balance: STARTER_CHIPS, streak: 0, multiplier: 1 })
}));
