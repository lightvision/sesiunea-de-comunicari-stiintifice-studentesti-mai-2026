# Example 2 Continuous Parameters Demo Design

## Goal

Integrate a live animation into Example 2 of the presentation that shows the genetic algorithm from `examples/continuous_parameters_mapping.ipynb` optimizing continuous parameters for a quadratic function.

The demo should make the notebook's second example visible in the deck: a chromosome is a vector `(a, b, c)`, fitness rewards a flatter upward-facing parabola, and evolution proceeds through tournament selection, arithmetic crossover, mutation, and elitism.

## Source Behavior

The animation must use the notebook's algorithm and hyperparameters:

- `generations = 20`
- `population_size = 100`
- `mutation_rate = 1`
- `tournament_size = 3`
- `elitism_count = 1`
- `random_seed = 42`
- `gene_lower_bound = -50`
- `gene_upper_bound = 50`
- `x_plot_min = -50`
- `x_plot_max = 50`

The fitness function follows the notebook exactly:

- reject `a <= 0` with negative infinity;
- compute the vertex `x = -b / (2a)`;
- compute `y` at the vertex, `x = -1`, and `x = 1`;
- define curviness as the sum of the absolute differences from the vertex;
- return negative curviness because the GA maximizes fitness.

Operators also follow the notebook:

- initial individuals are random triples within `[-50, 50]`;
- selection is tournament selection;
- crossover is arithmetic crossover with a random `alpha`;
- mutation checks every gene, and with `mutation_rate = 1`, every gene receives a random offset in `[-1, 1]`, clipped to the bounds;
- one elite individual is copied directly into the next generation.

## Presentation Integration

Add a browser asset named `site-prezentare/assets/continuous-parameters.js`, loaded from the `include-in-header` block in `site-prezentare/presentation.qmd`.

Replace the current static Example 2 slide with a two-column layout consistent with the existing Example 1 and Example 3 slides:

- left column: compact explanation cards for genes, fitness, selection/crossover, mutation, and result;
- right column: `<canvas>` demo initialized by a `.continuous-demo` container.

The slide notes should say that the animation reproduces the notebook's settings, including the intentionally aggressive mutation rate.

## Visual Design

The canvas should be self-contained and use the deck's existing restrained visual language. It should show:

- generation number and current operation;
- the best quadratic curve for the current generation;
- the best `(a, b, c)` values and fitness score;
- a compact fitness history with best fitness and population min/max band;
- a population spread view for `a`, `b`, and `c` in the current generation.

Because `x_plot_min = -50` and `x_plot_max = 50` can produce very large `y` ranges, the renderer may map the curve into a stable viewport by sampling the notebook range and scaling visible values to the panel. The underlying GA calculations must still use the exact notebook formula and bounds.

## Interaction

Controls should match the existing demos:

- `a`: toggle autoplay;
- `x`: toggle fast mode;
- `r`: reset to seed `42`;
- click, space, or right arrow: advance manually when autoplay is off.

The animation should reset when its Reveal slide becomes active and pause work when the slide is inactive, following the existing demo pattern.

## Testing

Add focused Node tests for the new browser asset. Tests should cover:

- deterministic initial population from seed `42`;
- notebook-faithful fitness behavior, including the `a <= 0` penalty;
- mutation with rate `1` changes genes within the configured bounds;
- one generation preserves the elite and advances the population size correctly;
- inactive Reveal slide detection matches the existing demos.

Run the existing test suite after implementation. If Quarto is available, render or preview the presentation and verify the slide visually.

## Non-Goals

This does not execute the Python notebook in the browser and does not change the notebook. It does not redesign other slides or alter the already implemented Example 1 and Example 3 demos.
