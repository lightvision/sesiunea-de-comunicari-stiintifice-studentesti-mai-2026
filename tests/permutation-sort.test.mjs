import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";

const root = path.resolve(import.meta.dirname, "..");
const scriptPath = path.join(root, "site-prezentare", "assets", "permutation-sort.js");

function loadModule() {
  const source = fs.readFileSync(scriptPath, "utf8");
  const context = {
    console,
    document: {
      addEventListener() {},
      querySelectorAll() {
        return [];
      },
    },
    requestAnimationFrame() {},
    window: {
      addEventListener() {},
      requestAnimationFrame() {},
    },
  };
  context.globalThis = context.window;
  vm.createContext(context);
  vm.runInContext(source, context, { filename: scriptPath });
  return context.window.PermutationSortDemo;
}

test("permutation sort demo creates deterministic valid populations", () => {
  const demo = loadModule();
  const values = [5, 4, 3, 2, 1, 0];

  const state = demo.createInitialState({ seed: 2026, values, popSize: 8 });
  const sameSeed = demo.createInitialState({ seed: 2026, values, popSize: 8 });
  const differentSeed = demo.createInitialState({ seed: 2027, values, popSize: 8 });

  assert.equal(state.population.length, 8);
  assert.equal(state.generation, 0);
  assert.deepEqual(state.population, sameSeed.population);
  assert.notDeepEqual(state.population, differentSeed.population);
  for (const individual of state.population) {
    assert.deepEqual([...individual].sort((a, b) => a - b), [0, 1, 2, 3, 4, 5]);
  }
});

test("default demo parameters mirror the origin/main ga_permutation notebook", () => {
  const demo = loadModule();

  const runtime = demo.makeRuntimeState();

  assert.equal(runtime.options.seed, 46);
  assert.equal(runtime.options.popSize, 50);
  assert.deepEqual(Array.from(runtime.options.values), Array.from({ length: 21 }, (_, index) => index));
  assert.equal(runtime.options.maxGenerations, 200);
  assert.equal(runtime.options.tournamentK, 3);
  assert.equal(runtime.options.crossoverRate, 0.9);
  assert.equal(runtime.options.mutationRate, 0.1);
});

test("fitness uses the origin/main notebook inversion-count scoring", () => {
  const demo = loadModule();

  assert.equal(demo.calculateFitness([0, 1, 2, 3]), 6);
  assert.equal(demo.calculateFitness([3, 2, 1, 0]), 0);
  assert.equal(demo.calculateFitness([1, 0, 2, 3]), 5);
});

test("ordered crossover returns a valid child permutation", () => {
  const demo = loadModule();
  const rng = demo.makeRng(42);

  const child = demo.orderedCrossover([0, 1, 2, 3, 4, 5], [5, 4, 3, 2, 1, 0], rng);

  assert.equal(child.length, 6);
  assert.deepEqual([...child].sort((a, b) => a - b), [0, 1, 2, 3, 4, 5]);
});

test("tournament selection follows Python random.sample pool behavior", () => {
  const demo = loadModule();
  const evaluatedPopulation = [
    { individual: [1], fitness: 1 },
    { individual: [5], fitness: 5 },
    { individual: [3], fitness: 3 },
    { individual: [2], fitness: 2 },
  ];
  const alwaysFirstPoolSlot = () => 0;

  const parent = demo.selectParentByTournament(evaluatedPopulation, alwaysFirstPoolSlot, 3);

  assert.deepEqual(Array.from(parent), [3]);
});

test("autoplay advances the permutation demo through generations", () => {
  const demo = loadModule();
  let runtime = demo.makeRuntimeState({
    autoplay: true,
    seed: 2026,
    values: [5, 4, 3, 2, 1, 0],
    popSize: 8,
  });

  for (let index = 0; index < 50; index += 1) {
    runtime = demo.tickRuntimeState(runtime);
  }

  assert.equal(runtime.simulation.generation > 0, true);
  assert.equal(runtime.simulation.population.length, 8);
  assert.deepEqual([...runtime.simulation.bestIndividual].sort((a, b) => a - b), [0, 1, 2, 3, 4, 5]);
});

test("reference notebook seed reaches the sorted target at generation 194", () => {
  const demo = loadModule();
  let runtime = demo.makeRuntimeState();

  while (!runtime.completed && runtime.simulation.generation < runtime.options.maxGenerations) {
    runtime = {
      ...runtime,
      simulation: demo.evolveGeneration(runtime.simulation),
    };
    runtime = {
      ...runtime,
      completed: runtime.simulation.complete || runtime.simulation.generation >= runtime.options.maxGenerations,
    };
  }

  assert.equal(runtime.simulation.generation, 194);
  assert.equal(runtime.simulation.bestFitness, 210);
  assert.deepEqual(Array.from(runtime.simulation.bestIndividual), Array.from({ length: 21 }, (_, index) => index));
});

test("fast autoplay stops when the sorted target is reached", () => {
  const demo = loadModule();
  let runtime = demo.makeRuntimeState({
    autoplay: true,
    fastMode: true,
    seed: 2026,
    values: [5, 4, 3, 2, 1, 0],
    popSize: 10,
  });

  for (let index = 0; index < 260 && !runtime.completed; index += 1) {
    runtime = demo.tickRuntimeState(runtime);
  }

  assert.equal(runtime.completed, true);
  assert.equal(runtime.autoplay, false);
  assert.deepEqual(Array.from(runtime.simulation.bestIndividual), [0, 1, 2, 3, 4, 5]);
});

test("render layout leaves clear vertical space between title, permutation, and bars", () => {
  const demo = loadModule();
  const layout = demo.makeRenderLayout();

  assert.equal(layout.titleY + 34 < layout.statusY, true);
  assert.equal(layout.permutationY + 34 < layout.bars.panelY, true);
  assert.equal(layout.bars.panelY + layout.bars.panelHeight < layout.history.y, true);
});

test("render layout separates axis tick labels from the axis caption", () => {
  const demo = loadModule();
  const layout = demo.makeRenderLayout();
  const tickLabelY = layout.bars.y + layout.bars.height + 24;

  assert.equal(layout.axisLabelY - tickLabelY >= 22, true);
  assert.equal(layout.axisLabelY + 18 < layout.history.y, true);
});

test("reveal permutation demo is inactive until its slide is present", () => {
  const demo = loadModule();
  const revealRoot = { classList: { contains: (name) => name === "reveal" } };
  const hiddenSection = {
    classList: { contains: () => false },
    closest(selector) {
      return selector === ".reveal" ? revealRoot : null;
    },
  };
  const presentSection = {
    classList: { contains: (name) => name === "present" },
    closest(selector) {
      return selector === ".reveal" ? revealRoot : null;
    },
  };
  const hiddenContainer = {
    closest(selector) {
      return selector === "section" ? hiddenSection : null;
    },
  };
  const presentContainer = {
    closest(selector) {
      return selector === "section" ? presentSection : null;
    },
  };

  assert.equal(demo.isDemoActive(hiddenContainer), false);
  assert.equal(demo.isDemoActive(presentContainer), true);
});
