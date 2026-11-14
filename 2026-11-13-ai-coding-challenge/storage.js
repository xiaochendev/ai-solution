(() => {
  const STORAGE_KEY = "flashcards-app-state";
  const STATE_VERSION = 1;

  function createDefaultState() {
    return {
      decks: [
        {
          id: "deck-1",
          name: "Sample deck",
          cards: [{ id: "card-1", front: "Card front", back: "Card back" }],
        },
      ],
      activeDeckId: "deck-1",
    };
  }

  function normalizeState(state) {
    if (!state || !Array.isArray(state.decks)) {
      return null;
    }

    const deckIds = new Set();
    const decks = [];

    for (const deck of state.decks) {
      if (!deck
        || typeof deck.id !== "string"
        || deck.id.length === 0
        || deckIds.has(deck.id)
        || typeof deck.name !== "string"
        || deck.name.trim().length === 0
        || !Array.isArray(deck.cards)) {
        return null;
      }

      deckIds.add(deck.id);
      const cardIds = new Set();
      const cards = [];

      for (const card of deck.cards) {
        if (!card
          || typeof card.id !== "string"
          || card.id.length === 0
          || cardIds.has(card.id)
          || typeof card.front !== "string"
          || card.front.trim().length === 0
          || typeof card.back !== "string"
          || card.back.trim().length === 0) {
          return null;
        }

        cardIds.add(card.id);
        cards.push({ id: card.id, front: card.front, back: card.back });
      }

      decks.push({ id: deck.id, name: deck.name, cards });
    }

    if (state.activeDeckId !== null
      && (typeof state.activeDeckId !== "string" || !deckIds.has(state.activeDeckId))) {
      return null;
    }

    return { decks, activeDeckId: state.activeDeckId };
  }

  function loadState() {
    let serialized;
    try {
      serialized = window.localStorage.getItem(STORAGE_KEY);
    } catch (error) {
      console.error("Could not read saved flashcards state; using the default state.", error);
      return createDefaultState();
    }

    if (serialized === null) {
      return createDefaultState();
    }

    let saved;
    try {
      saved = JSON.parse(serialized);
    } catch (error) {
      console.warn("Saved flashcards state is not valid JSON; using the default state.", error);
      return createDefaultState();
    }

    if (!saved || saved.version !== STATE_VERSION) {
      console.warn("Saved flashcards state has an unsupported version; using the default state.");
      return createDefaultState();
    }

    const state = normalizeState(saved.state);
    if (!state) {
      console.warn("Saved flashcards state has an invalid shape; using the default state.");
      return createDefaultState();
    }

    return state;
  }

  function saveState(state) {
    const normalizedState = normalizeState(state);
    if (!normalizedState) {
      throw new TypeError("Cannot save invalid flashcards state.");
    }

    const serialized = JSON.stringify({ version: STATE_VERSION, state: normalizedState });
    try {
      window.localStorage.setItem(STORAGE_KEY, serialized);
    } catch (error) {
      console.error("Could not save flashcards state.", error);
      throw new Error("Could not save flashcards state to this browser.", { cause: error });
    }
  }

  window.FlashcardStorage = { loadState, saveState };
})();
