import { create } from "zustand";

type AccountProfile = {
  username?: string | null;
  displayName?: string | null;
  isNormieHolder: boolean;
  selectedNormieId?: number | null;
  selectedNormieImage?: string | null;
  holderVerifiedAt?: string | null;
  ownedNormieIds: number[];
};

type AccountState = AccountProfile & {
  setProfile: (profile: Partial<AccountProfile>) => void;
  resetProfile: () => void;
};

const emptyProfile: AccountProfile = {
  username: null,
  displayName: null,
  isNormieHolder: false,
  selectedNormieId: null,
  selectedNormieImage: null,
  holderVerifiedAt: null,
  ownedNormieIds: []
};

export const useAccountStore = create<AccountState>((set) => ({
  ...emptyProfile,
  setProfile: (profile) => set((state) => ({ ...state, ...profile })),
  resetProfile: () => set(emptyProfile)
}));
