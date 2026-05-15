import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";

const root = path.resolve(import.meta.dirname, "..");
const scriptPath = path.join(root, "site-prezentare", "assets", "moth-camouflage.js");

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
  return context.window.MothCamouflage;
}

test("moth camouflage asset exposes deterministic simulation helpers", () => {
  const moth = loadModule();

  const state = moth.createInitialState(4, 1234);
  const sameSeed = moth.createInitialState(4, 1234);
  const differentSeed = moth.createInitialState(4, 4321);

  assert.equal(state.population.length, 16);
  assert.equal(state.generation, 1);
  assert.equal(state.targetColor, 128);
  assert.deepEqual(state.population, sameSeed.population);
  assert.notDeepEqual(state.population, differentSeed.population);
  assert.equal(state.distribution.reduce((total, count) => total + count, 0), 16);
});

test("target color follows the same wave as the py5 sketch", () => {
  const moth = loadModule();

  assert.equal(moth.targetColorForGeneration(1), 130);
  assert.equal(moth.targetColorForGeneration(64), 255);
  assert.equal(moth.targetColorForGeneration(128), 127);
});

test("autoplay advances the browser animation through generations", () => {
  const moth = loadModule();
  let runtime = moth.makeRuntimeState({ gridLen: 4, seed: 1234, autoplay: true });

  for (let index = 0; index < 45 + 75 + 36 + 36; index += 1) {
    runtime = moth.tickRuntimeState(runtime);
  }

  assert.equal(runtime.simulation.generation, 2);
  assert.equal(runtime.phase, "show");
  assert.equal(runtime.simulation.population.length, 16);
});

test("runtime defaults match the py5 sketch manual startup", () => {
  const moth = loadModule();
  const runtime = moth.makeRuntimeState({ gridLen: 4, seed: 1234 });

  assert.equal(runtime.autoplay, false);
  assert.equal(runtime.phase, "show");
});

test("reveal demo is inactive until its slide is present", () => {
  const moth = loadModule();
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

  assert.equal(moth.isDemoActive(hiddenContainer), false);
  assert.equal(moth.isDemoActive(presentContainer), true);
});
