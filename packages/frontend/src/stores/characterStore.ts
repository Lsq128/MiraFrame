import { create } from "zustand";
import type { Character } from "@openoii/shared";

interface CharacterState {
  characters: Character[];
  isLoading: boolean;

  setCharacters: (characters: Character[]) => void;
  addCharacter: (character: Character) => void;
  updateCharacter: (id: string, partial: Partial<Character>) => void;
  removeCharacter: (id: string) => void;
  clearCharacters: () => void;
}

export const useCharacterStore = create<CharacterState>((set) => ({
  characters: [],
  isLoading: false,

  setCharacters: (characters) => set({ characters }),
  addCharacter: (character) =>
    set((state) => ({ characters: [...state.characters, character] })),
  updateCharacter: (id, partial) =>
    set((state) => ({
      characters: state.characters.map((c) => (c.id === id ? { ...c, ...partial } : c)),
    })),
  removeCharacter: (id) =>
    set((state) => ({ characters: state.characters.filter((c) => c.id !== id) })),
  clearCharacters: () => set({ characters: [] }),
}));
