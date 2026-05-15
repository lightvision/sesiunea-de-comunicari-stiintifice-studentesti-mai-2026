# Example 1 Permutation Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a live browser animation for Example 1 that shows a permutation GA improving a number ordering over generations.

**Architecture:** Add a standalone JavaScript asset exposing deterministic simulation helpers and DOM initialization. Wire it into the Quarto reveal deck with CSS scoped to the Example 1 demo layout. Test the simulation helpers with Node's built-in test runner before adding the implementation.

**Tech Stack:** Quarto revealjs, vanilla JavaScript canvas/DOM, CSS, Node `node:test`, Node `vm`.

---

### File Structure

- Create: `tests/permutation-sort.test.mjs`, focused on deterministic simulation behavior.
- Create: `site-prezentare/assets/permutation-sort.js`, focused on GA state, runtime state, rendering, and reveal-aware initialization.
- Modify: `site-prezentare/presentation.qmd`, to load the asset and embed the Example 1 demo.
- Modify: `site-prezentare/styles.css`, to style the Example 1 demo without affecting the moth demo.

### Task 1: Write Failing Tests

**Files:**
- Create: `tests/permutation-sort.test.mjs`

- [ ] **Step 1: Add tests for deterministic state, crossover validity, autoplay, and reveal activity**

```js
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
  const state = demo.createInitialState({ seed: 2026, values: [5, 4, 3, 2, 1, 0], popSize: 8 });
  const sameSeed = demo.createInitialState({ seed: 2026, values: [5, 4, 3, 2, 1, 0], popSize: 8 });
  const differentSeed = demo.createInitialState({ seed: 2027, values: [5, 4, 3, 2, 1, 0], popSize: 8 });

  assert.equal(state.population.length, 8);
  assert.equal(state.generation, 0);
  assert.deepEqual(state.population, sameSeed.population);
  assert.notDeepEqual(state.population, differentSeed.population);
  for (const individual of state.population) {
    assert.deepEqual([...individual].sort((a, b) => a - b), [0, 1, 2, 3, 4, 5]);
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/permutation-sort.test.mjs`
Expected: FAIL because `site-prezentare/assets/permutation-sort.js` does not exist.

### Task 2: Implement Simulation Helpers

**Files:**
- Create: `site-prezentare/assets/permutation-sort.js`
- Test: `tests/permutation-sort.test.mjs`

- [ ] **Step 1: Add deterministic RNG, fitness, initial state, ordered crossover, mutation, and generation tick**
- [ ] **Step 2: Run `node --test tests/permutation-sort.test.mjs` and confirm the simulation tests pass**

### Task 3: Add Runtime and Slide Integration

**Files:**
- Modify: `tests/permutation-sort.test.mjs`
- Modify: `site-prezentare/assets/permutation-sort.js`
- Modify: `site-prezentare/presentation.qmd`
- Modify: `site-prezentare/styles.css`

- [ ] **Step 1: Add failing tests for `makeRuntimeState`, `tickRuntimeState`, and `isDemoActive`**
- [ ] **Step 2: Implement runtime helpers and DOM initialization**
- [ ] **Step 3: Load `assets/permutation-sort.js` in `presentation.qmd`**
- [ ] **Step 4: Replace Example 1 content with an explanatory column plus `.permutation-demo` container**
- [ ] **Step 5: Add responsive CSS for `.permutation-demo-layout`, bars, labels, and status**
- [ ] **Step 6: Run the focused tests and the existing test suite**

### Self-Review

The plan covers the approved design: deterministic JS demo, tests, slide integration, CSS, and keyboard controls. It avoids Python bridging and keeps Example 1's didactic caveat.
