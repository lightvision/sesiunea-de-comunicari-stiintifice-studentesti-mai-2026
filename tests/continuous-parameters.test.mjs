import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";

const root = path.resolve(import.meta.dirname, "..");
const scriptPath = path.join(root, "site-prezentare", "assets", "continuous-parameters.js");

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
  return context.window.ContinuousParametersDemo;
}

test("continuous parameters defaults match the notebook hyperparameters", () => {
  const demo = loadModule();
  const runtime = demo.makeRuntimeState();

  assert.equal(runtime.options.generations, 20);
  assert.equal(runtime.options.populationSize, 100);
  assert.equal(runtime.options.mutationRate, 1);
  assert.equal(runtime.options.tournamentSize, 3);
  assert.equal(runtime.options.elitismCount, 1);
  assert.equal(runtime.options.seed, 42);
  assert.equal(runtime.options.geneLowerBound, -50);
  assert.equal(runtime.options.geneUpperBound, 50);
  assert.equal(runtime.options.xPlotMin, -50);
  assert.equal(runtime.options.xPlotMax, 50);
});

test("fitness follows the notebook curviness function", () => {
  const demo = loadModule();

  assert.equal(demo.fitnessFunction([-1, 0, 0]), Number.NEGATIVE_INFINITY);
  assert.equal(demo.fitnessFunction([0, 0, 0]), Number.NEGATIVE_INFINITY);
  assert.equal(demo.fitnessFunction([1, 0, 0]), -2);
  assert.equal(demo.fitnessFunction([0.5, 0, 0]), -1);
});

test("initial population is deterministic and bounded", () => {
  const demo = loadModule();

  const state = demo.createInitialState({ seed: 42, populationSize: 8 });
  const sameSeed = demo.createInitialState({ seed: 42, populationSize: 8 });
  const differentSeed = demo.createInitialState({ seed: 43, populationSize: 8 });

  assert.equal(state.population.length, 8);
  assert.equal(state.generation, 0);
  assert.deepEqual(state.population, sameSeed.population);
  assert.notDeepEqual(state.population, differentSeed.population);
  for (const individual of state.population) {
    assert.equal(individual.length, 3);
    assert.equal(individual.every((value) => value >= -50 && value <= 50), true);
  }
});

test("mutation rate one mutates every gene and clips to bounds", () => {
  const demo = loadModule();
  const rng = demo.makeRng(42);

  const mutated = demo.mutation([49.8, -49.8, 0], 1, -50, 50, rng);

  assert.equal(mutated.length, 3);
  assert.equal(mutated.every((value) => value >= -50 && value <= 50), true);
  assert.notDeepEqual(mutated, [49.8, -49.8, 0]);
});

test("evolving one generation preserves size, elite, and history", () => {
  const demo = loadModule();
  const state = demo.createInitialState({ seed: 42, populationSize: 12 });
  const elite = state.bestIndividual;

  const next = demo.evolveGeneration(state);

  assert.equal(next.population.length, 12);
  assert.equal(next.generation, 1);
  assert.deepEqual(next.population[0], elite);
  assert.equal(next.bestPerformers.length, 2);
  assert.equal(next.allPopulations.length, 2);
});

test("autoplay stops after the notebook generation count", () => {
  const demo = loadModule();
  let runtime = demo.makeRuntimeState({ autoplay: true, fastMode: true });

  for (let index = 0; index < 25; index += 1) {
    runtime = demo.tickRuntimeState(runtime);
  }

  assert.equal(runtime.simulation.generation, 20);
  assert.equal(runtime.completed, true);
  assert.equal(runtime.autoplay, false);
});

test("reveal continuous demo is inactive until its slide is present", () => {
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
