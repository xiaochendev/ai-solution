class AccessibleModal {
  constructor(dialog) {
    this.dialog = dialog;
    this.opener = null;

    this.dialog.addEventListener("keydown", (event) => this.trapFocus(event));
    this.dialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      this.close();
    });
    this.dialog.addEventListener("close", () => {
      if (this.opener?.isConnected) {
        this.opener.focus();
      }
      this.opener = null;
    });
    this.dialog.addEventListener("click", (event) => {
      if (event.target === this.dialog) {
        this.close();
      }
    });
    this.dialog.querySelector("[data-modal-close]")?.addEventListener("click", () => {
      this.close();
    });
  }

  open(opener) {
    if (this.dialog.open) {
      return;
    }

    this.opener = opener;
    this.dialog.showModal();
    this.dialog.querySelector("[autofocus]")?.focus();
  }

  close(returnFocus = this.opener) {
    if (this.dialog.open) {
      this.opener = returnFocus;
      this.dialog.close();
    }
  }

  trapFocus(event) {
    if (event.key === "Escape") {
      event.preventDefault();
      this.close();
      return;
    }

    if (event.key !== "Tab") {
      return;
    }

    const focusable = [...this.dialog.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    )].filter((element) => element.getClientRects().length > 0);

    if (focusable.length === 0) {
      event.preventDefault();
      this.dialog.focus();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const activeIndex = focusable.indexOf(document.activeElement);

    if (event.shiftKey && activeIndex <= 0) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (activeIndex === -1 || activeIndex === focusable.length - 1)) {
      event.preventDefault();
      first.focus();
    }
  }
}

const storageHelpers = window.FlashcardStorage;
if (!storageHelpers
  || typeof storageHelpers.loadState !== "function"
  || typeof storageHelpers.saveState !== "function") {
  throw new Error("Flashcards storage helpers are unavailable.");
}

const initialState = storageHelpers.loadState();
const decks = initialState.decks;
let activeDeckId = initialState.activeDeckId;
let activeCardIndex = 0;
let isCardFlipped = false;
let studyModeDeckId = null;
let searchQuery = "";
let searchTimer = null;
let editingDeckId = null;
let editingCardId = null;
let deletingItem = null;
let nextDeckNumber = 2;
let nextCardNumber = 2;

const deckList = document.getElementById("deck-list");
const deckEmptyState = document.getElementById("deck-empty-state");
const deckEmptyCreateButton = document.querySelector('#deck-empty-state [data-empty-action="new-deck"]');
const deckTitle = document.getElementById("deck-title");
const studyCard = document.getElementById("study-card");
const cardEmptyState = document.getElementById("card-empty-state");
const cardEmptyTitle = document.getElementById("card-empty-title");
const cardEmptyInstructions = document.getElementById("card-empty-instructions");
const emptyDeckIcon = document.getElementById("empty-deck-icon");
const emptyCardsIcon = document.getElementById("empty-cards-icon");
const emptySearchIcon = document.getElementById("empty-search-icon");
const emptyCreateCardButton = document.getElementById("empty-create-card");
const emptyClearSearchButton = document.getElementById("empty-clear-search");
const emptyCreateDeckButton = document.getElementById("empty-create-deck");
const cardFrontFace = document.getElementById("card-front-face");
const cardBackFace = document.getElementById("card-back-face");
const cardFrontContent = document.getElementById("card-front-content");
const cardBackContent = document.getElementById("card-back-content");
const cardCount = document.getElementById("card-count");
const studyModeButton = document.getElementById("study-mode-toggle");
const studyModeStatus = document.getElementById("study-mode-status");
const searchInput = document.getElementById("card-search");
const appStatus = document.getElementById("app-status");
const previousCardButton = document.querySelector('[data-card-action="previous"]');
const flipCardButton = document.querySelector('[data-card-action="flip"]');
const nextCardButton = document.querySelector('[data-card-action="next"]');
const editCardButton = document.querySelector('[data-card-action="edit"]');
const deleteCardButton = document.querySelector('[data-card-action="delete"]');
const newDeckButton = document.querySelector('[data-modal-trigger="new-deck-dialog"]');
const newCardButton = document.querySelector('[data-card-action="create"]');
const deckDialog = document.getElementById("new-deck-dialog");
const cardDialog = document.getElementById("new-card-dialog");
const deckForm = document.getElementById("deck-form");
const deckNameInput = document.getElementById("deck-name");
const deckDialogTitle = document.getElementById("new-deck-title");
const deckSubmitButton = document.getElementById("deck-submit");
const cardForm = document.getElementById("card-form");
const cardFrontInput = document.getElementById("card-front");
const cardBackInput = document.getElementById("card-back");
const cardDialogTitle = document.getElementById("new-card-title");
const cardSubmitButton = document.getElementById("card-submit");
const deleteDialog = document.getElementById("delete-item-dialog");
const deleteForm = document.getElementById("delete-item-form");
const deleteDialogTitle = document.getElementById("delete-item-title");
const deleteMessage = document.getElementById("delete-item-message");
const deleteSubmitButton = document.getElementById("delete-item-submit");
const main = document.querySelector("main");

if (!(deckList instanceof HTMLUListElement)
  || !(deckEmptyState instanceof HTMLElement)
  || !(deckEmptyCreateButton instanceof HTMLButtonElement)
  || !(deckTitle instanceof HTMLElement)
  || !(studyCard instanceof HTMLElement)
  || !(cardEmptyState instanceof HTMLElement)
  || !(cardEmptyTitle instanceof HTMLElement)
  || !(cardEmptyInstructions instanceof HTMLElement)
  || !(emptyDeckIcon instanceof SVGElement)
  || !(emptyCardsIcon instanceof SVGElement)
  || !(emptySearchIcon instanceof SVGElement)
  || !(emptyCreateCardButton instanceof HTMLButtonElement)
  || !(emptyClearSearchButton instanceof HTMLButtonElement)
  || !(emptyCreateDeckButton instanceof HTMLButtonElement)
  || !(cardFrontFace instanceof HTMLElement)
  || !(cardBackFace instanceof HTMLElement)
  || !(cardFrontContent instanceof HTMLElement)
  || !(cardBackContent instanceof HTMLElement)
  || !(cardCount instanceof HTMLElement)
  || !(studyModeButton instanceof HTMLButtonElement)
  || !(studyModeStatus instanceof HTMLElement)
  || !(searchInput instanceof HTMLInputElement)
  || !(appStatus instanceof HTMLElement)
  || !(previousCardButton instanceof HTMLButtonElement)
  || !(flipCardButton instanceof HTMLButtonElement)
  || !(nextCardButton instanceof HTMLButtonElement)
  || !(editCardButton instanceof HTMLButtonElement)
  || !(deleteCardButton instanceof HTMLButtonElement)
  || !(newDeckButton instanceof HTMLButtonElement)
  || !(newCardButton instanceof HTMLButtonElement)
  || !(deckDialog instanceof HTMLDialogElement)
  || !(cardDialog instanceof HTMLDialogElement)
  || !(main instanceof HTMLElement)
  || !(deckForm instanceof HTMLFormElement)
  || !(deckNameInput instanceof HTMLInputElement)
  || !(deckDialogTitle instanceof HTMLElement)
  || !(deckSubmitButton instanceof HTMLButtonElement)
  || !(cardForm instanceof HTMLFormElement)
  || !(cardFrontInput instanceof HTMLTextAreaElement)
  || !(cardBackInput instanceof HTMLTextAreaElement)
  || !(cardDialogTitle instanceof HTMLElement)
  || !(cardSubmitButton instanceof HTMLButtonElement)
  || !(deleteDialog instanceof HTMLDialogElement)
  || !(deleteForm instanceof HTMLFormElement)
  || !(deleteDialogTitle instanceof HTMLElement)
  || !(deleteMessage instanceof HTMLElement)
  || !(deleteSubmitButton instanceof HTMLButtonElement)) {
  throw new Error("Flashcards UI is missing required elements.");
}

const deckModal = new AccessibleModal(deckDialog);
const cardModal = new AccessibleModal(cardDialog);
const deleteModal = new AccessibleModal(deleteDialog);

function getActiveDeck() {
  return decks.find((deck) => deck.id === activeDeckId) ?? null;
}

function getVisibleCards() {
  const cards = getActiveDeck()?.cards ?? [];
  if (!searchQuery) {
    return cards;
  }

  return cards.filter((card) =>
    `${card.front}\n${card.back}`.toLocaleLowerCase().includes(searchQuery));
}

function getActiveCard() {
  return getVisibleCards()[activeCardIndex] ?? null;
}

function persistState() {
  try {
    storageHelpers.saveState({ decks, activeDeckId });
    appStatus.hidden = true;
    appStatus.textContent = "";
  } catch (error) {
    console.error("Flashcards changes could not be saved.", error);
    appStatus.textContent = `${error.message} Changes will be lost when this page closes.`;
    appStatus.hidden = false;
  }
}

function clearSearch() {
  if (searchTimer !== null) {
    window.clearTimeout(searchTimer);
    searchTimer = null;
  }
  searchQuery = "";
  searchInput.value = "";
}

function createDeckId() {
  let id;
  do {
    id = `deck-${nextDeckNumber++}`;
  } while (decks.some((deck) => deck.id === id));
  return id;
}

function createCardId(deck) {
  let id;
  do {
    id = `card-${nextCardNumber++}`;
  } while (deck.cards.some((card) => card.id === id));
  return id;
}

function getActiveDeckButton() {
  return [...deckList.querySelectorAll("[data-select-deck]")]
    .find((button) => button.dataset.selectDeck === activeDeckId) ?? newDeckButton;
}

function getCardFocusTarget() {
  return editCardButton.disabled ? newCardButton : editCardButton;
}

function createDeckButton(deck, action, label) {
  const button = document.createElement("button");
  button.type = "button";
  button.dataset[action] = deck.id;
  button.setAttribute("aria-label", action === "selectDeck" ? deck.name : `${label} ${deck.name}`);
  button.textContent = label;
  return button;
}

function renderDecks() {
  const previousFocus = document.activeElement;
  const focusAction = ["selectDeck", "renameDeck", "deleteDeck"]
    .find((action) => previousFocus instanceof HTMLElement && previousFocus.dataset[action]);
  const focusDeckId = focusAction && previousFocus instanceof HTMLElement
    ? previousFocus.dataset[focusAction]
    : null;

  deckList.replaceChildren();

  for (const deck of decks) {
    const item = document.createElement("li");
    item.className = "deck-item";

    const selectButton = createDeckButton(deck, "selectDeck", deck.name);
    if (deck.id === activeDeckId) {
      selectButton.setAttribute("aria-current", "true");
    }

    const actions = document.createElement("div");
    actions.className = "deck-actions";
    actions.append(
      createDeckButton(deck, "renameDeck", "Rename"),
      createDeckButton(deck, "deleteDeck", "Delete"),
    );
    item.append(selectButton, actions);
    deckList.append(item);
  }

  deckEmptyState.hidden = decks.length > 0;
  const activeDeck = getActiveDeck();
  deckTitle.textContent = activeDeck?.name ?? "No deck selected";
  newCardButton.disabled = activeDeck === null;
  renderActiveCard();

  if (focusAction && focusDeckId) {
    const replacement = [...deckList.querySelectorAll("button")]
      .find((button) => button.dataset[focusAction] === focusDeckId);
    replacement?.focus();
  }
}

function renderActiveCard() {
  const activeDeck = getActiveDeck();
  const visibleCards = getVisibleCards();
  const card = visibleCards[activeCardIndex] ?? null;
  const hasCard = card !== null;
  const noSearchResults = Boolean(
    activeDeck && activeDeck.cards.length > 0 && searchQuery && visibleCards.length === 0,
  );

  cardFrontContent.textContent = card?.front
    ?? (activeDeck
      ? searchQuery ? "No cards match your search." : "No cards in this deck yet."
      : "Create a deck to get started.");
  cardBackContent.textContent = card?.back ?? "";
  studyCard.hidden = !hasCard;
  cardEmptyState.hidden = hasCard;
  if (!hasCard) {
    if (!activeDeck) {
      cardEmptyTitle.textContent = decks.length === 0 ? "No decks yet" : "Choose a deck";
      cardEmptyInstructions.textContent = decks.length === 0
        ? "Create a deck to keep your flashcards organized."
        : "Select a deck from the sidebar to see its cards.";
    } else if (noSearchResults) {
      cardEmptyTitle.textContent = "No matching cards";
      cardEmptyInstructions.textContent = `No cards contain "${searchInput.value.trim()}". Try another keyword or clear the search.`;
    } else {
      cardEmptyTitle.textContent = "This deck is empty";
      cardEmptyInstructions.textContent = "Create a flashcard to begin studying this deck.";
    }

    emptyDeckIcon.toggleAttribute("hidden", activeDeck !== null);
    emptyCardsIcon.toggleAttribute("hidden", !activeDeck || activeDeck.cards.length > 0);
    emptySearchIcon.toggleAttribute("hidden", !noSearchResults);
    emptyCreateDeckButton.hidden = decks.length > 0;
    emptyCreateCardButton.hidden = !activeDeck || activeDeck.cards.length > 0 || noSearchResults;
    emptyClearSearchButton.hidden = !noSearchResults;
  }

  studyCard.classList.toggle("is-flipped", hasCard && isCardFlipped);
  cardFrontFace.setAttribute("aria-hidden", String(hasCard && isCardFlipped));
  cardBackFace.setAttribute("aria-hidden", String(!hasCard || !isCardFlipped));
  cardCount.textContent = searchQuery
    ? `${visibleCards.length} match${visibleCards.length === 1 ? "" : "es"}${hasCard ? ` · ${activeCardIndex + 1} of ${visibleCards.length}` : ""}`
    : `${hasCard ? activeCardIndex + 1 : 0} of ${activeDeck?.cards.length ?? 0}`;
  flipCardButton.setAttribute("aria-pressed", String(hasCard && isCardFlipped));
  searchInput.disabled = activeDeck === null;
  previousCardButton.disabled = !hasCard || activeCardIndex === 0;
  flipCardButton.disabled = !hasCard;
  nextCardButton.disabled = !hasCard || activeCardIndex >= visibleCards.length - 1;
  editCardButton.disabled = !hasCard;
  deleteCardButton.disabled = !hasCard;
  const isStudying = studyModeDeckId !== null;
  studyModeButton.textContent = isStudying ? "Exit study" : "Study";
  studyModeButton.setAttribute("aria-pressed", String(isStudying));
  studyModeButton.disabled = !isStudying && visibleCards.length === 0;
  studyModeStatus.hidden = !isStudying;
}

searchInput.addEventListener("input", () => {
  if (searchTimer !== null) {
    window.clearTimeout(searchTimer);
  }

  searchTimer = window.setTimeout(() => {
    searchQuery = searchInput.value.trim().toLocaleLowerCase();
    activeCardIndex = 0;
    isCardFlipped = false;
    if (studyModeDeckId !== null) {
      exitStudyMode();
    }
    renderActiveCard();
    searchTimer = null;
  }, 300);
});

function handleStudyKeydown(event) {
  if (studyModeDeckId === null || event.altKey || event.ctrlKey || event.metaKey) {
    return;
  }

  if (event.key === "Escape") {
    event.preventDefault();
    exitStudyMode();
    studyModeButton.focus();
    return;
  }

  if (event.target instanceof Element
    && event.target.closest("input, textarea, select, button, a, [contenteditable='true'], dialog")) {
    return;
  }

  const deck = getActiveDeck();
  if (!deck || deck.id !== studyModeDeckId) {
    return;
  }
  const visibleCards = getVisibleCards();

  if (event.code === "Space") {
    event.preventDefault();
    if (getActiveCard()) {
      isCardFlipped = !isCardFlipped;
      renderActiveCard();
    }
  } else if (event.key === "ArrowLeft") {
    event.preventDefault();
    if (activeCardIndex > 0) {
      activeCardIndex -= 1;
      isCardFlipped = false;
      renderActiveCard();
    }
  } else if (event.key === "ArrowRight") {
    event.preventDefault();
    if (activeCardIndex < visibleCards.length - 1) {
      activeCardIndex += 1;
      isCardFlipped = false;
      renderActiveCard();
    }
  }
}

function enterStudyMode(deckId) {
  const deck = decks.find((item) => item.id === deckId);
  if (!deck) {
    throw new Error(`Deck not found: ${deckId}`);
  }
  if (deck.cards.length === 0) {
    throw new Error(`Cannot enter study mode for an empty deck: ${deckId}`);
  }

  document.removeEventListener("keydown", handleStudyKeydown);
  clearSearch();
  const activeDeckChanged = activeDeckId !== deck.id;
  activeDeckId = deck.id;
  activeCardIndex = 0;
  isCardFlipped = false;
  studyModeDeckId = deck.id;
  renderDecks();
  if (activeDeckChanged) {
    persistState();
  }
  studyCard.focus();
  document.addEventListener("keydown", handleStudyKeydown);
}

function exitStudyMode() {
  if (studyModeDeckId === null) {
    return;
  }

  document.removeEventListener("keydown", handleStudyKeydown);
  studyModeDeckId = null;
  isCardFlipped = false;
  renderActiveCard();
}

function openDeckForm(deck, opener) {
  exitStudyMode();
  editingDeckId = deck?.id ?? null;
  const editing = deck !== null;
  deckDialogTitle.textContent = editing ? "Rename deck" : "New deck";
  deckSubmitButton.textContent = editing ? "Save changes" : "Create deck";
  deckNameInput.value = deck?.name ?? "";
  deckNameInput.setCustomValidity("");
  deckModal.open(opener);
}

function openCardForm(card, opener) {
  exitStudyMode();
  editingCardId = card?.id ?? null;
  const editing = card !== null;
  cardDialogTitle.textContent = editing ? "Edit card" : "New card";
  cardSubmitButton.textContent = editing ? "Save changes" : "Create card";
  cardFrontInput.value = card?.front ?? "";
  cardBackInput.value = card?.back ?? "";
  cardFrontInput.setCustomValidity("");
  cardBackInput.setCustomValidity("");
  cardModal.open(opener);
}

newDeckButton.addEventListener("click", () => openDeckForm(null, newDeckButton));
deckEmptyCreateButton.addEventListener("click", () => openDeckForm(null, deckEmptyCreateButton));
studyModeButton.addEventListener("click", () => {
  if (studyModeDeckId !== null) {
    exitStudyMode();
    return;
  }

  const deck = getActiveDeck();
  if (!deck) {
    throw new Error("Cannot enter study mode without an active deck.");
  }
  enterStudyMode(deck.id);
});

deckList.addEventListener("click", (event) => {
  if (!(event.target instanceof Element)) {
    return;
  }

  const button = event.target.closest("button");
  if (!(button instanceof HTMLButtonElement)) {
    return;
  }

  const deckId = button.dataset.selectDeck
    ?? button.dataset.renameDeck
    ?? button.dataset.deleteDeck;
  const deck = decks.find((item) => item.id === deckId);
  if (!deck) {
    throw new Error(`Deck not found: ${deckId}`);
  }

  if (button.dataset.selectDeck) {
    exitStudyMode();
    clearSearch();
    activeDeckId = deck.id;
    activeCardIndex = 0;
    isCardFlipped = false;
    renderDecks();
    persistState();
  } else if (button.dataset.renameDeck) {
    openDeckForm(deck, button);
  } else {
    exitStudyMode();
    deletingItem = { type: "deck", id: deck.id };
    deleteDialogTitle.textContent = "Delete deck?";
    deleteSubmitButton.textContent = "Delete deck";
    deleteMessage.textContent = `Delete "${deck.name}"? This cannot be undone.`;
    deleteModal.open(button);
  }
});

main.addEventListener("click", (event) => {
  if (!(event.target instanceof Element)) {
    return;
  }

  const emptyActionButton = event.target.closest("[data-empty-action]");
  if (emptyActionButton instanceof HTMLButtonElement) {
    if (emptyActionButton.dataset.emptyAction === "new-deck") {
      openDeckForm(null, emptyActionButton);
    } else if (emptyActionButton.dataset.emptyAction === "clear-search") {
      clearSearch();
      activeCardIndex = 0;
      isCardFlipped = false;
      renderActiveCard();
      searchInput.focus();
    }
    return;
  }

  const button = event.target.closest("[data-card-action]");
  if (!(button instanceof HTMLButtonElement)) {
    return;
  }

  const action = button.dataset.cardAction;
  const deck = getActiveDeck();
  const card = getActiveCard();

  if (action === "create") {
    openCardForm(null, button);
  } else if (action === "edit" && card) {
    openCardForm(card, button);
  } else if (action === "delete" && deck && card) {
    exitStudyMode();
    deletingItem = { type: "card", id: card.id };
    deleteDialogTitle.textContent = "Delete card?";
    deleteSubmitButton.textContent = "Delete card";
    deleteMessage.textContent = "This card will be removed from the current deck.";
    deleteModal.open(button);
  } else if (action === "flip" && card) {
    isCardFlipped = !isCardFlipped;
    renderActiveCard();
  } else if (action === "previous" && deck && activeCardIndex > 0) {
    activeCardIndex -= 1;
    isCardFlipped = false;
    renderActiveCard();
  } else if (action === "next" && deck && activeCardIndex < getVisibleCards().length - 1) {
    activeCardIndex += 1;
    isCardFlipped = false;
    renderActiveCard();
  }
});

deckForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = deckNameInput.value.trim();
  deckNameInput.setCustomValidity(name ? "" : "Enter a deck name.");
  if (!deckForm.reportValidity()) {
    return;
  }

  if (editingDeckId) {
    const deck = decks.find((item) => item.id === editingDeckId);
    if (!deck) {
      throw new Error(`Deck not found: ${editingDeckId}`);
    }
    deck.name = name;
  } else {
    clearSearch();
    const id = createDeckId();
    decks.push({ id, name, cards: [] });
    activeDeckId = id;
    activeCardIndex = 0;
    isCardFlipped = false;
  }

  renderDecks();
  persistState();
  deckModal.close(getActiveDeckButton());
  editingDeckId = null;
});

cardForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const front = cardFrontInput.value.trim();
  const back = cardBackInput.value.trim();
  cardFrontInput.setCustomValidity(front ? "" : "Enter the card front.");
  cardBackInput.setCustomValidity(back ? "" : "Enter the card back.");
  if (!cardForm.reportValidity()) {
    return;
  }

  const deck = getActiveDeck();
  if (!deck) {
    throw new Error("Cannot save a card without an active deck.");
  }

  let savedCardId;
  if (editingCardId) {
    const card = deck.cards.find((item) => item.id === editingCardId);
    if (!card) {
      throw new Error(`Card not found: ${editingCardId}`);
    }
    card.front = front;
    card.back = back;
    savedCardId = card.id;
  } else {
    const id = createCardId(deck);
    deck.cards.push({ id, front, back });
    savedCardId = id;
  }

  clearSearch();
  activeCardIndex = deck.cards.findIndex((card) => card.id === savedCardId);
  if (activeCardIndex < 0) {
    throw new Error(`Card not found: ${savedCardId}`);
  }
  editingCardId = null;
  isCardFlipped = false;
  renderActiveCard();
  persistState();
  const opener = cardModal.opener;
  const returnFocus = opener?.isConnected && opener.getClientRects().length > 0
    ? opener
    : getCardFocusTarget();
  cardModal.close(returnFocus);
});

deleteForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!deletingItem) {
    throw new Error("No deck or card is selected for deletion.");
  }

  const deletedType = deletingItem.type;
  if (deletedType === "deck") {
    const deletedIndex = decks.findIndex((deck) => deck.id === deletingItem.id);
    if (deletedIndex < 0) {
      throw new Error(`Deck not found: ${deletingItem.id}`);
    }

    decks.splice(deletedIndex, 1);
    if (activeDeckId === deletingItem.id) {
      activeDeckId = decks[0]?.id ?? null;
      activeCardIndex = 0;
      isCardFlipped = false;
      clearSearch();
    }
  } else {
    const deck = getActiveDeck();
    const deletedIndex = deck?.cards.findIndex((card) => card.id === deletingItem.id) ?? -1;
    if (!deck || deletedIndex < 0) {
      throw new Error(`Card not found: ${deletingItem.id}`);
    }

    deck.cards.splice(deletedIndex, 1);
    activeCardIndex = Math.min(activeCardIndex, Math.max(0, getVisibleCards().length - 1));
    isCardFlipped = false;
    if (deck.cards.length === 0 && studyModeDeckId === deck.id) {
      exitStudyMode();
    }
  }

  deletingItem = null;
  renderDecks();
  persistState();
  deleteModal.close(deletedType === "deck" ? getActiveDeckButton() : getCardFocusTarget());
});

renderDecks();