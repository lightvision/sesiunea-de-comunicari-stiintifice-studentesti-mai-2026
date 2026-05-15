# Example 2 Continuous Parameters Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a notebook-faithful live canvas animation for Example 2, showing a GA optimizing quadratic parameters `(a, b, c)` in the Reveal presentation.

**Architecture:** Add one self-contained browser asset that ports the notebook algorithm to deterministic JavaScript and exposes pure helpers for tests. Wire the asset into `presentation.qmd`, replace the static Example 2 slide with a two-column demo layout, and extend `styles.css` with layout rules mirroring the existing canvas demos.

**Tech Stack:** Quarto Reveal, plain JavaScript canvas, Node `node:test`, Node `vm`, CSS.

---

## File Structure

- Create `site-prezentare/assets/continuous-parameters.js`: deterministic GA implementation, canvas renderer, Reveal activity handling, keyboard/click controls, and exported `window.ContinuousParametersDemo` helpers.
- Create `tests/continuous-parameters.test.mjs`: VM-load the asset and verify notebook-faithful behavior.
- Modify `site-prezentare/presentation.qmd`: load the new asset and replace the static Example 2 slide with the demo layout.
- Modify `site-prezentare/styles.css`: add `.continuous-demo-layout`, `.continuous-demo-copy`, `.continuous-demo`, and canvas sizing rules.

## Task 1: Asset Tests

**Files:**
- Create: `tests/continuous-parameters.test.mjs`

- [ ] **Step 1: Write the failing test file**

Create `tests/continuous-parameters.test.mjs` with:

```js
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
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `node --test tests/continuous-parameters.test.mjs`

Expected: FAIL with `ENOENT` because `site-prezentare/assets/continuous-parameters.js` does not exist yet.

## Task 2: Continuous Parameters Asset

**Files:**
- Create: `site-prezentare/assets/continuous-parameters.js`
- Test: `tests/continuous-parameters.test.mjs`

- [ ] **Step 1: Create the asset with notebook-faithful helpers**

Create `site-prezentare/assets/continuous-parameters.js` as an IIFE following the existing asset pattern. Implement these exact exported helpers on `window.ContinuousParametersDemo`:

```js
{
  DEFAULT_OPTIONS,
  Phase,
  makeRng,
  fitnessFunction,
  createInitialPopulation,
  selection,
  crossover,
  mutation,
  createInitialState,
  evolveGeneration,
  makeRuntimeState,
  tickRuntimeState,
  isDemoActive,
}
```

Core formulas and operators:

```js
const DEFAULT_OPTIONS = {
  generations: 20,
  populationSize: 100,
  mutationRate: 1,
  tournamentSize: 3,
  elitismCount: 1,
  seed: 42,
  geneLowerBound: -50,
  geneUpperBound: 50,
  xPlotMin: -50,
  xPlotMax: 50,
  autoplay: false,
  fastMode: false,
};

function fitnessFunction(params) {
  const [a, b, c] = params;
  if (a <= 0) {
    return Number.NEGATIVE_INFINITY;
  }
  const vertexX = -b / (2 * a);
  const vertexY = a * vertexX ** 2 + b * vertexX + c;
  const yLeft = a * (-1) ** 2 + b * -1 + c;
  const yRight = a * 1 ** 2 + b * 1 + c;
  const curviness = Math.abs(yLeft - vertexY) + Math.abs(yRight - vertexY);
  return -curviness;
}

function createInitialPopulation(size, lower, upper, rng) {
  return Array.from({ length: size }, () => [
    lower + rng() * (upper - lower),
    lower + rng() * (upper - lower),
    lower + rng() * (upper - lower),
  ]);
}

function crossover(parentA, parentB, rng) {
  const alpha = rng();
  return [
    parentA.map((value, index) => alpha * value + (1 - alpha) * parentB[index]),
    parentB.map((value, index) => alpha * value + (1 - alpha) * parentA[index]),
  ];
}

function mutation(individual, mutationRate, lower, upper, rng) {
  return individual.map((value) => {
    if (rng() >= mutationRate) {
      return value;
    }
    return Math.max(lower, Math.min(upper, value + (-1 + rng() * 2)));
  });
}
```

The state shape must include:

```js
{
  population,
  generation,
  bestIndividual,
  bestFitness,
  minFitness,
  maxFitness,
  bestPerformers,
  allPopulations,
  options,
  lastOperation,
}
```

- [ ] **Step 2: Add canvas rendering and browser initialization**

In the same file, add:

- constants `WINDOW_WIDTH = 780`, `WINDOW_HEIGHT = 560`, and phases `show`, `select`, `crossover`, `mutate`;
- `drawRuntime(ctx, runtime, width, height)` that draws title/status, a scaled quadratic curve, parameter values, fitness history band, and population spread;
- `createCanvas(container)` that appends a canvas and sets an accessible label;
- `initDemo(container)` that handles click, `a`, `x`, `r`, space, and arrow-right controls;
- `initAll()` that initializes `.continuous-demo` elements on `DOMContentLoaded` and `load`.

The renderer must use sampled `x` values across `[-50, 50]` for the curve and scale y-values into the chart viewport so large notebook-range values do not overflow the slide.

- [ ] **Step 3: Run the focused test**

Run: `node --test tests/continuous-parameters.test.mjs`

Expected: PASS for all tests in `continuous-parameters.test.mjs`.

## Task 3: Presentation Slide Wiring

**Files:**
- Modify: `site-prezentare/presentation.qmd`
- Test: `tests/presentation-layout.test.mjs`

- [ ] **Step 1: Add layout tests for Example 2**

Append these tests to `tests/presentation-layout.test.mjs`:

```js
test("presentation loads the continuous parameters demo asset", () => {
  const source = fs.readFileSync(presentationPath, "utf8");

  assert.match(source, /assets\/continuous-parameters\.js/);
});

test("example 2 embeds a continuous parameters demo container", () => {
  const source = fs.readFileSync(presentationPath, "utf8");

  assert.match(source, /Exemplul 2: parametri continui/);
  assert.match(source, /\.continuous-demo-layout/);
  assert.match(source, /\.continuous-demo\b/);
});

test("continuous parameters demo layout has a two-column desktop layout", () => {
  const rule = readRule(".continuous-demo-layout");

  assert.match(rule, /display:\s*grid;/);
  assert.match(rule, /grid-template-columns:/);
});
```

- [ ] **Step 2: Run layout tests to verify they fail**

Run: `node --test tests/presentation-layout.test.mjs`

Expected: FAIL because the asset, container, and CSS rule are not wired yet.

- [ ] **Step 3: Modify `presentation.qmd`**

Add the asset include after `permutation-sort.js`:

```html
<script src="assets/continuous-parameters.js" defer></script>
```

Replace the static Example 2 slide body with:

```markdown
::: {.continuous-demo-layout}
::: {.continuous-demo-copy}
::: {.col-block}
**Gene**

Valorile parametrilor `a`, `b`, `c` ai functiei patratice.
:::

::: {.col-block}
**Fitness**

Scorul este negativul curburii: parabolele mai plate, cu `a > 0`, sunt favorizate.
:::

::: {.col-block}
**Operatori**

Selectie prin turneu, crossover aritmetic si elitism pentru cel mai bun individ.
:::

::: {.col-block}
**Mutatie**

In notebook, `mutation_rate = 1`, deci fiecare gena primeste o modificare mica in fiecare copil.
:::
:::

::: {.continuous-demo data-autoplay="true"}
:::
:::
```

Update the notes for Example 2 to mention seed `42`, `20` generations, `100` individuals, and mutation rate `1`.

## Task 4: CSS Layout

**Files:**
- Modify: `site-prezentare/styles.css`
- Test: `tests/presentation-layout.test.mjs`

- [ ] **Step 1: Add CSS matching the existing demo pattern**

Add this block near the existing `.permutation-demo` and `.moth-demo` rules:

```css
.reveal .slides section:not(.utm-cover) > .continuous-demo-layout {
  width: min(76rem, 100%);
}

.continuous-demo-layout {
  align-items: start;
  display: grid;
  gap: 1rem;
  grid-template-columns: minmax(18rem, 0.56fr) minmax(32rem, 1fr);
  margin: 0.65rem auto 0;
  max-width: 76rem;
}

.continuous-demo-copy {
  display: grid;
  gap: 0.72rem;
}

.continuous-demo {
  align-self: start;
  background: oklch(96% 0.014 86);
  border: 1px solid color-mix(in oklch, var(--line) 84%, var(--accent));
  border-radius: 8px;
  box-shadow: var(--shadow);
  overflow: hidden;
}

.continuous-demo canvas {
  aspect-ratio: 39 / 28;
  display: block;
  height: auto;
  width: 100%;
}
```

Add `.continuous-demo-layout` to the mobile media query selector list so it becomes one column below `900px`.

- [ ] **Step 2: Run layout tests**

Run: `node --test tests/presentation-layout.test.mjs`

Expected: PASS for the new and existing layout tests.

## Task 5: Full Verification

**Files:**
- Verify: `site-prezentare/assets/continuous-parameters.js`
- Verify: `site-prezentare/presentation.qmd`
- Verify: `site-prezentare/styles.css`
- Verify: `tests/continuous-parameters.test.mjs`
- Verify: `tests/presentation-layout.test.mjs`

- [ ] **Step 1: Run all Node tests**

Run: `node --test tests/*.test.mjs`

Expected: PASS for `continuous-parameters`, `moth-camouflage`, `permutation-sort`, and `presentation-layout`.

- [ ] **Step 2: Render the presentation if Quarto is available**

Run: `uv run quarto render site-prezentare/presentation.qmd`

Expected: command exits `0` and updates `site-prezentare/_site/presentation.html` plus copied assets.

If `uv run quarto render` fails because Quarto or JavaScript dependencies are unavailable in the environment, run:

```powershell
Get-Command quarto
```

and report the exact failure instead of claiming render verification passed.

- [ ] **Step 3: Inspect git status**

Run: `git status --short`

Expected: only intentional files are changed or added:

```text
A/M docs/superpowers/plans/2026-05-15-example-2-continuous-parameters-demo.md
A tests/continuous-parameters.test.mjs
A site-prezentare/assets/continuous-parameters.js
M site-prezentare/presentation.qmd
M site-prezentare/styles.css
M site-prezentare/_site/presentation.html
A site-prezentare/_site/assets/continuous-parameters.js
```

Existing unrelated modifications in permutation demo files may remain present and must not be reverted.

## Self-Review

- Spec coverage: the plan covers source hyperparameters, notebook formulas, operators, slide integration, visual elements, controls, inactive slide behavior, and tests.
- Placeholder scan: no task uses `TBD`, `TODO`, or unspecified implementation steps.
- Type consistency: exported helper names in tests match the asset API listed in Task 2.
