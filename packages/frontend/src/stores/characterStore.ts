import { create } from "zustand";
import type { Character } from "@/types";

interface CharacterState {
  characters: Character[];
  isLoading: boolean;
  selectedCharacterId: number | null;

  setCharacters: (characters: Character[]) => void;
  addCharacter: (character: Character) => void;
  /** Upsert: update if exists (by id), otherwise append */
  updateCharacter: (character: Character) => void;
  removeCharacter: (characterId: number) => void;
  clearCharacters: () => void;
  setSelectedCharacter: (id: number | null) => void;
}

export const useCharacterStore = create<CharacterState>((set) => ({
  characters: [],
  isLoading: false,
  selectedCharacterId: null,

  setCharacters: (characters) => set({ characters }),
  addCharacter: (character) =>
    set((state) => ({ characters: [...state.characters, character] })),
  updateCharacter: (character) =>
    set((state) => {
      const idx = state.characters.findIndex((c) => c.id === character.id);
      if (idx >= 0) {
        const updated = [...state.characters];
        updated[idx] = { ...updated[idx], ...character };
        return { characters: updated };
      }
      return { characters: [...state.characters, character] };
    }),
  removeCharacter: (characterId) =>
    set((state) => ({
      characters: state.characters.filter((c) => c.id !== characterId),
    })),
  clearCharacters: () => set({ characters: [] }),
  setSelectedCharacter: (id) => set({ selectedCharacterId: id }),
}));
