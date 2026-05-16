import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";

const root = path.resolve(import.meta.dirname, "..");
const scriptPath = path.join(root, "site-prezentare", "assets", "ml-hyperparameters.js");

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
  return context.window.MlHyperparametersDemo;
}

test("ml hyperparameter defaults match the notebook configuration", () => {
  const demo = loadModule();
  const runtime = demo.makeRuntimeState();

  assert.equal(runtime.options.generations, 50);
  assert.equal(runtime.options.populationSize, 50);
  assert.equal(runtime.options.crossoverRate, 0.8);
  assert.equal(runtime.options.mutationRate, 0.1);
  assert.equal(runtime.options.parentsPortion, 0.3);
  assert.equal(runtime.options.maxDepthMin, 1);
  assert.equal(runtime.options.maxDepthMax, 20);
  assert.equal(runtime.options.minLeafMin, 1);
  assert.equal(runtime.options.minLeafMax, 10);
  assert.equal(runtime.options.criterionMin, 0);
  assert.equal(runtime.options.criterionMax, 1);
  assert.equal(runtime.options.seed, 42);
});

test("synthetic fitness anchors the notebook's known accuracies", () => {
  const demo = loadModule();
  const target = demo.TARGET;
  const baseline = demo.BASELINE;

  assert.equal(demo.estimatedAccuracy(target.maxDepth, target.minSamplesLeaf, target.criterion), target.accuracy);
  assert.equal(demo.estimatedAccuracy(baseline.maxDepth, baseline.minSamplesLeaf, baseline.criterion), baseline.accuracy);
  assert.ok(demo.estimatedAccuracy(target.maxDepth, target.minSamplesLeaf, target.criterion) >= demo.estimatedAccuracy(20, 10, 1));
  assert.ok(demo.estimatedAccuracy(target.maxDepth, target.minSamplesLeaf, target.criterion) >= demo.estimatedAccuracy(1, 1, 0));
});

test("recall and false-negative interpolation match the notebook anchors", () => {
  const demo = loadModule();
  const baseline = demo.BASELINE;
  const target = demo.TARGET;

  assert.equal(demo.approximateRecall(baseline.accuracy), baseline.recall);
  assert.equal(demo.approximateRecall(target.accuracy), target.recall);
  assert.equal(demo.approximateFalseNegatives(baseline.accuracy), baseline.falseNegatives);
  assert.equal(demo.approximateFalseNegatives(target.accuracy), target.falseNegatives);
});

test("initial population is deterministic and bounded", () => {
  const demo = loadModule();
  const state = demo.createInitialState({ seed: 42, populationSize: 12 });
  const sameSeed = demo.createInitialState({ seed: 42, populationSize: 12 });
  const differentSeed = demo.createInitialState({ seed: 43, populationSize: 12 });

  assert.equal(state.population.length, 12);
  assert.equal(state.generation, 0);
  assert.deepEqual(state.population, sameSeed.population);
  assert.notDeepEqual(state.population, differentSeed.population);

  for (const individual of state.population) {
    assert.equal(individual.length, 3);
    const [maxDepth, minLeaf, criterion] = individual;
    assert.ok(maxDepth >= 1 && maxDepth <= 20);
    assert.ok(minLeaf >= 1 && minLeaf <= 10);
    assert.ok(criterion === 0 || criterion === 1);
  }
});

test("uniform crossover takes each gene from one of the two parents", () => {
  const demo = loadModule();
  const rng = demo.makeRng(7);
  const parentA = [4, 5, 0];
  const parentB = [12, 1, 1];

  for (let trial = 0; trial < 32; trial += 1) {
    const child = demo.uniformCrossover(parentA, parentB, rng);
    child.forEach((value, index) => {
      assert.ok(value === parentA[index] || value === parentB[index]);
    });
  }
});

test("evolving converges toward the optimum within the configured generations", () => {
  const demo = loadModule();
  let state = demo.createInitialState({ seed: 42 });
  for (let index = 0; index < state.options.generations; index += 1) {
    state = demo.evolveGeneration(state);
  }
  assert.equal(state.generation, state.options.generations);
  assert.ok(state.bestFitness >= demo.TARGET.accuracy - 0.001);
  assert.equal(state.bestPerformers.length, state.options.generations + 1);
});

test("autoplay halts after the simulation completes", () => {
  const demo = loadModule();
  let runtime = demo.makeRuntimeState({ autoplay: true, fastMode: true });

  for (let index = 0; index < runtime.options.generations + 5; index += 1) {
    runtime = demo.tickRuntimeState(runtime);
  }

  assert.equal(runtime.simulation.generation, runtime.options.generations);
  assert.equal(runtime.completed, true);
  assert.equal(runtime.autoplay, false);
});

test("ml demo is inactive until its slide is presented", () => {
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
