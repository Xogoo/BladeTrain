import { beforeEach, describe, expect, it, vi } from "vitest";

// The composables persist to localStorage, which does not exist in the
// node test environment.
const store = new Map();
vi.stubGlobal("localStorage", {
  getItem: (key) => (store.has(key) ? store.get(key) : null),
  setItem: (key, value) => store.set(key, String(value)),
  removeItem: (key) => store.delete(key),
});

const { useGame, LETTERS, REROLLS_PER_TURN } = await import("../useGame.js");
const { useCollection } = await import("../useCollection.js");

const ALL_TRICKS_ON = {
  fakie: true,
  switch: true,
  topside: true,
  negative: true,
  rough: true,
  tough: true,
  channel: true,
  christ: true,
  grabs: true,
  rocket: true,
  crossgrab: true,
  spins360: true,
  spins540: true,
  spins720: true,
  spins900: true,
};

function settings(mode, extra = {}) {
  return {
    mode,
    players: ["Ana", "Ben"],
    tricks: { ...ALL_TRICKS_ON },
    ...extra,
  };
}

describe("useGame modes", () => {
  const game = useGame();
  const collection = useCollection();

  beforeEach(() => {
    game.goToStart();
  });

  it("group mode has no round limit while everyone keeps landing", () => {
    const s = settings("group");
    game.startGame(s, "group");
    expect(game.state.players.map((p) => p.name)).toEqual(["Ana", "Ben"]);
    for (let round = 0; round < 20; round++) {
      expect(game.state.round).toBe(round + 1);
      game.attempt(true, s); // first player lands
      game.attempt(true, s); // second player lands
    }
    expect(game.state.screen).toBe("game");
    expect(game.state.players.every((p) => p.letters === 0)).toBe(true);
  });

  it("group mode gives a letter per bail and ends when a player has all letters", () => {
    const s = settings("group");
    game.startGame(s, "group");
    for (let round = 0; round < LETTERS.length; round++) {
      const [first, second] = game.state.turnOrder;
      game.attempt(game.state.players[first].name === "Ana", s);
      if (game.state.screen === "game") {
        game.attempt(game.state.players[second]?.name === "Ana", s);
      }
    }
    // Ben bailed every round: 5 letters, out, game over early.
    const ben = game.state.players.find((p) => p.name === "Ben");
    expect(ben.letters).toBe(LETTERS.length);
    expect(game.state.screen).toBe("gameover");
  });

  it("ends immediately when a bail eliminates a player mid-round", () => {
    const s = settings("group");
    game.startGame(s, "group");
    // Ben bails only in rounds he starts, so his knockout bail always
    // happens with Ana's attempt still pending in the turn order.
    while (game.state.screen === "game") {
      const current =
        game.state.players[game.state.turnOrder[game.state.turnPos]];
      const benStarts =
        game.state.players[game.state.turnOrder[0]].name === "Ben";
      game.attempt(!(current.name === "Ben" && benStarts), s);
    }
    const ben = game.state.players.find((p) => p.name === "Ben");
    expect(ben.letters).toBe(LETTERS.length);
    // The game ended on Ben's attempt; Ana never played the round out.
    expect(game.state.turnPos).toBe(0);
    expect(game.state.screen).toBe("gameover");
  });

  it("group mode rotates the starting player each round", () => {
    const s = settings("group");
    game.startGame(s, "group");
    const firstRoundStarter = game.state.turnOrder[0];
    game.attempt(true, s);
    game.attempt(true, s);
    expect(game.state.round).toBe(2);
    expect(game.state.turnOrder[0]).not.toBe(firstRoundStarter);
  });

  it("the starting player can swap the trick up to 3 times per turn", () => {
    const s = settings("group");
    game.startGame(s, "group");
    expect(game.state.rerollsLeft).toBe(REROLLS_PER_TURN);

    let spinId = game.state.spinId;
    for (let i = 1; i <= REROLLS_PER_TURN; i++) {
      game.rerollTrick(s);
      expect(game.state.spinId).toBe(spinId + i);
      expect(game.state.round).toBe(1); // same turn, new trick
    }
    expect(game.state.rerollsLeft).toBe(0);

    // A fourth swap is refused.
    spinId = game.state.spinId;
    game.rerollTrick(s);
    expect(game.state.spinId).toBe(spinId);
  });

  it("only the starting player can swap, and rerolls reset next turn", () => {
    const s = settings("group");
    game.startGame(s, "group");
    game.rerollTrick(s);
    expect(game.state.rerollsLeft).toBe(REROLLS_PER_TURN - 1);

    game.attempt(true, s); // starter locks the trick in
    const spinId = game.state.spinId;
    game.rerollTrick(s); // second player must play the same trick
    expect(game.state.spinId).toBe(spinId);

    game.attempt(true, s); // round ends
    expect(game.state.round).toBe(2);
    expect(game.state.rerollsLeft).toBe(REROLLS_PER_TURN);
  });

  it("solo mode never ends and records the collection", () => {
    const landedBefore = collection.collection.landedTotal;
    game.startGame(settings("solo"), "solo");
    expect(game.state.spinsTotal).toBe(Infinity);
    for (let i = 0; i < 25; i++) {
      game.landTrick(settings("solo"));
    }
    expect(game.state.screen).toBe("game");
    expect(collection.collection.landedTotal).toBe(landedBefore + 25);
    expect(collection.landedGrindCount.value).toBeGreaterThan(0);
  });

  it("the collection tracks exact trick names", () => {
    game.startGame(settings("solo"), "solo");
    const name = game.state.spin.name;
    const landedBefore = collection.collection.tricks[name]?.landed || 0;
    const uniqueBefore = collection.uniqueTrickCount.value;
    game.landTrick(settings("solo"));
    expect(collection.collection.tricks[name].landed).toBe(landedBefore + 1);
    expect(collection.uniqueTrickCount.value).toBe(
      landedBefore === 0 ? uniqueBefore + 1 : uniqueBefore
    );
  });

  it("solo landing earns the First Blood badge", () => {
    expect(collection.hasBadge("first-trick")).toBe(true);
  });

  it("solo skips are recorded for the trainer bias", () => {
    game.startGame(settings("solo"), "solo");
    const grind = game.state.spin.reels.find((r) => r.name === "Grind").winner
      .name;
    game.skipTrick(settings("solo"));
    expect(collection.collection.grinds[grind].skipped).toBeGreaterThan(0);
  });

  it("solo give up returns to the start screen without a game over", () => {
    game.startGame(settings("solo"), "solo");
    game.giveUp();
    expect(game.state.screen).toBe("start");
  });

  it("trainer bias favors never-landed grinds", () => {
    const bias = collection.grindBias();
    const neverLanded = Object.keys(bias).filter((name) => bias[name] === 2.5);
    for (const name of neverLanded) {
      expect(collection.collection.grinds[name]?.landed || 0).toBe(0);
    }
  });
});
