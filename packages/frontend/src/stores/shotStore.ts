import { create } from "zustand";
import type { Shot } from "@openoii/shared";

interface ShotState {
  shots: Shot[];
  isLoading: boolean;

  setShots: (shots: Shot[]) => void;
  addShot: (shot: Shot) => void;
  updateShot: (id: string, partial: Partial<Shot>) => void;
  removeShot: (id: string) => void;
  clearShots: () => void;
  reorderShots: (fromIndex: number, toIndex: number) => void;
}

export const useShotStore = create<ShotState>((set) => ({
  shots: [],
  isLoading: false,

  setShots: (shots) => set({ shots: shots.sort((a, b) => a.order - b.order) }),
  addShot: (shot) =>
    set((state) => ({
      shots: [...state.shots, shot].sort((a, b) => a.order - b.order),
    })),
  updateShot: (id, partial) =>
    set((state) => ({
      shots: state.shots.map((s) => (s.id === id ? { ...s, ...partial } : s)),
    })),
  removeShot: (id) =>
    set((state) => ({ shots: state.shots.filter((s) => s.id !== id) })),
  clearShots: () => set({ shots: [] }),
  reorderShots: (fromIndex, toIndex) =>
    set((state) => {
      const newShots = [...state.shots];
      const [moved] = newShots.splice(fromIndex, 1);
      newShots.splice(toIndex, 0, moved);
      return { shots: newShots.map((s, i) => ({ ...s, order: i })) };
    }),
}));
