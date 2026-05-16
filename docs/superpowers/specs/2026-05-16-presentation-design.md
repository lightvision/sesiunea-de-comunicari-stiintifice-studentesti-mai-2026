# Presentation Design

## Goal

Create a Quarto `revealjs` presentation derived from `manuscript.qmd` that supports a 15-30 minute delivery. The deck should be didactic leaning toward balanced: theory first, then examples and demo transitions, then synthesis and conclusions.

## Audience

The audience is assumed to have little or no prior exposure to genetic algorithms. The deck must therefore teach the core concepts before moving to the project examples.

## Delivery Model

- Visible slide content stays short and scannable.
- Detailed speaking material goes into speaker notes.
- Example sections include explicit demo-transition slides because the presentation will pause while the associated notebook or simulation is run live.

## Structure

The deck contains 22 slides:

1. Title
2. Presentation objective
3. Why genetic algorithms
4. What a genetic algorithm is
5. Logical flow of a genetic algorithm
6. Core components
7. Selection
8. Crossover
9. Mutation and diversity
10. Choosing operators by representation
11. Example 1: continuous parameter optimization
12. Demo 1
13. Observations 1
14. Example 2: permutation sorting
15. Demo 2
16. Observations 2
17. Example 3: hyperparameter optimization
18. Demo 3
19. Observations 3
20. Example 4: moth camouflage in a dynamic environment
21. Demo 4 and final observations
22. Conclusions and questions

## Content Rules

- Each slide should present one main idea.
- Visible bullet lists should remain short.
- Theory slides may use one supporting image when it materially helps understanding.
- Example slides should use representative figures already prepared for the manuscript.

## Notes Strategy

- Theory slides use more detailed notes, close to a mini-script.
- Demo slides use concise notes listing what to run and what to ask the audience to watch.
- Observation slides use a mix of short interpretation bullets and 2-3 spoken sentences.

## Visual Sources

- `images/genetic_algorithm_flow-Schema_Logic_a_Algoritmului_Genetic.png`
- `images/article-figures/*.png`
- `examples/output/frames/screenshot_20260516_042826.png`

## Quarto Requirements

- The presentation lives in `presentation.qmd`.
- Use `revealjs`.
- Use `::: notes` blocks for speaker notes.
- Keep the file easy to edit by using one slide per heading and placing notes immediately under the slide content.
