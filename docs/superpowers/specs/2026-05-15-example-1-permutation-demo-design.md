# Example 1 Permutation Demo Design

## Goal

Integrate a live animation into Example 1 of the presentation that shows a genetic algorithm evolving a permutation of numbers toward sorted order.

## Scope

The demo belongs in `site-prezentare/presentation.qmd` next to the existing Example 1 explanatory copy. It should work like the Example 3 moth animation: loaded as a browser asset, deterministic from a seed, animated only inside the slide, and testable without Quarto rendering.

## Approach

Add a self-contained JavaScript asset, `site-prezentare/assets/permutation-sort.js`, that ports the teaching behavior from `examples/ga_permutation.py`:

- generate a seeded population of valid number permutations;
- score each permutation with the same base-position fitness idea;
- select parents with tournament selection;
- produce children with ordered crossover;
- mutate by swapping two positions;
- expose runtime helpers for tests and browser initialization.

The slide will use a compact two-column layout. The left column keeps the explanation of problem, representation, fitness, and operators. The right column embeds the live demo with bars for the best permutation, generation and fitness labels, and operator status text.

## Interaction

The demo autoplays by default. Keyboard controls match the moth demo pattern:

- `a`: toggle autoplay;
- `x`: toggle fast mode;
- `r`: reset to the deterministic seed.

## Testing

Add `tests/permutation-sort.test.mjs` using Node's built-in test runner and `vm`, matching the existing moth demo tests. Tests should cover deterministic initialization, valid crossover output, generation advancement, and inactive reveal-slide behavior.

## Non-Goals

This does not run Python inside the browser and does not claim genetic algorithms are a good practical sorting method. The presenter notes should keep the existing didactic caveat.
