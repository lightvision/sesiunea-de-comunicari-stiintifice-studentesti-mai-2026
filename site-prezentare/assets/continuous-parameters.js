(function () {
  "use strict";

  const WINDOW_WIDTH = 780;
  const WINDOW_HEIGHT = 560;
  const GENERATION_FRAMES = 36;
  const CURVE_SAMPLES = 120;

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

  const Phase = {
    SHOW: "show",
    SELECT: "select",
    CROSSOVER: "crossover",
    MUTATE: "mutate",
  };

  const COLORS = {
    background: "#f7f4ea",
    panel: "#f1efe6",
    panelAlt: "#ebe4d3",
    line: "#837b68",
    text: "#27241f",
    muted: "#625b4c",
    accent: "#b4693c",
    accentStrong: "#7f3b1e",
    blue: "#405f8f",
    green: "#4e7656",
    gray: "#a7a08f",
  };

  function makeRng(seed) {
    let value = seed == null ? Date.now() >>> 0 : seed >>> 0;
    return function next() {
      value += 0x6d2b79f5;
      let mixed = value;
      mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
      mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
      return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
    };
  }

  function randomIndex(length, rng) {
    return Math.floor(rng() * length);
  }

  function clamp(value, lower, upper) {
    return Math.max(lower, Math.min(upper, value));
  }

  function mergeOptions(options = {}) {
    return {
      ...DEFAULT_OPTIONS,
      ...options,
    };
  }

  function formatNumber(value, digits = 2) {
    if (!Number.isFinite(value)) {
      return "-inf";
    }
    return value.toFixed(digits);
  }

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

  function sampleWithoutReplacement(values, count, rng) {
    const pool = [...values];
    const result = [];
    while (result.length < count && pool.length > 0) {
      const index = randomIndex(pool.length, rng);
      result.push(pool[index]);
      pool.splice(index, 1);
    }
    return result;
  }

  function selection(population, fitnesses, rng, tournamentSize = DEFAULT_OPTIONS.tournamentSize) {
    return population.map(() => {
      const zipped = population.map((individual, index) => ({
        individual,
        fitness: fitnesses[index],
      }));
      const tournament = sampleWithoutReplacement(zipped, tournamentSize, rng);
      const winner = tournament.reduce((best, candidate) => (
        candidate.fitness > best.fitness ? candidate : best
      ));
      return [...winner.individual];
    });
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
      return clamp(value + (-1 + rng() * 2), lower, upper);
    });
  }

  function evaluatePopulation(population) {
    const evaluated = population.map((individual) => ({
      individual: [...individual],
      fitness: fitnessFunction(individual),
    }));
    evaluated.sort((left, right) => right.fitness - left.fitness);
    return evaluated;
  }

  function finiteFitnessValues(population) {
    return population.map(fitnessFunction).filter(Number.isFinite);
  }

  function summarizePopulation(population) {
    const evaluated = evaluatePopulation(population);
    const best = evaluated[0];
    const finite = finiteFitnessValues(population);
    const minFitness = finite.length > 0 ? Math.min(...finite) : Number.NEGATIVE_INFINITY;
    const maxFitness = finite.length > 0 ? Math.max(...finite) : Number.NEGATIVE_INFINITY;
    return {
      population: evaluated.map((entry) => [...entry.individual]),
      bestIndividual: [...best.individual],
      bestFitness: best.fitness,
      minFitness,
      maxFitness,
    };
  }

  function createInitialState(options = {}) {
    const merged = mergeOptions(options);
    const rng = makeRng(merged.seed);
    const population = createInitialPopulation(
      merged.populationSize,
      merged.geneLowerBound,
      merged.geneUpperBound,
      rng,
    );
    const summary = summarizePopulation(population);
    return {
      ...summary,
      generation: 0,
      bestPerformers: [{
        individual: [...summary.bestIndividual],
        fitness: summary.bestFitness,
      }],
      allPopulations: [summary.population.map((individual) => [...individual])],
      options: merged,
      lastOperation: "Initial population",
    };
  }

  function evolveGeneration(state) {
    if (state.generation >= state.options.generations) {
      return state;
    }
    const rng = makeRng((state.options.seed ?? 0) + state.generation + 1);
    const fitnesses = state.population.map(fitnessFunction);
    const eliteCount = clamp(state.options.elitismCount, 0, state.options.populationSize);
    const elites = evaluatePopulation(state.population)
      .slice(0, eliteCount)
      .map((entry) => [...entry.individual]);
    const selected = selection(state.population, fitnesses, rng, state.options.tournamentSize);
    const nextPopulation = [...elites];
    let parentIndex = 0;

    while (nextPopulation.length < state.options.populationSize) {
      const parentA = selected[parentIndex % selected.length];
      const parentB = selected[(parentIndex + 1) % selected.length];
      parentIndex += 2;
      const [childA, childB] = crossover(parentA, parentB, rng);
      nextPopulation.push(mutation(
        childA,
        state.options.mutationRate,
        state.options.geneLowerBound,
        state.options.geneUpperBound,
        rng,
      ));
      if (nextPopulation.length < state.options.populationSize) {
        nextPopulation.push(mutation(
          childB,
          state.options.mutationRate,
          state.options.geneLowerBound,
          state.options.geneUpperBound,
          rng,
        ));
      }
    }

    const summary = summarizePopulation(nextPopulation);
    const generation = state.generation + 1;
    return {
      ...state,
      ...summary,
      generation,
      bestPerformers: [
        ...state.bestPerformers,
        {
          individual: [...summary.bestIndividual],
          fitness: summary.bestFitness,
        },
      ],
      allPopulations: [
        ...state.allPopulations,
        summary.population.map((individual) => [...individual]),
      ],
      lastOperation: "Tournament selection + arithmetic crossover + mutation",
    };
  }

  function phaseForFrame(frameIndex) {
    const segment = frameIndex % GENERATION_FRAMES;
    if (segment < 9) {
      return Phase.SHOW;
    }
    if (segment < 18) {
      return Phase.SELECT;
    }
    if (segment < 27) {
      return Phase.CROSSOVER;
    }
    return Phase.MUTATE;
  }

  function makeRuntimeState(options = {}) {
    const merged = mergeOptions(options);
    const simulation = createInitialState(merged);
    return {
      simulation,
      autoplay: merged.autoplay,
      fastMode: merged.fastMode,
      completed: false,
      frameIndex: 0,
      phase: Phase.SHOW,
      options: merged,
    };
  }

  function tickRuntimeState(state) {
    if (state.completed) {
      return {
        ...state,
        autoplay: false,
        phase: Phase.SHOW,
      };
    }
    let simulation = state.simulation;
    const frameIndex = state.frameIndex + 1;
    if (state.autoplay && (state.fastMode || frameIndex % GENERATION_FRAMES === 0)) {
      simulation = evolveGeneration(simulation);
    }
    const completed = simulation.generation >= simulation.options.generations;
    return {
      ...state,
      simulation,
      autoplay: completed ? false : state.autoplay,
      completed,
      frameIndex,
      phase: state.fastMode ? Phase.SHOW : phaseForFrame(frameIndex),
    };
  }

  function drawText(ctx, text, x, y, size, fill = COLORS.text, weight = "600", align = "center") {
    ctx.fillStyle = fill;
    ctx.font = `${weight} ${size}px Inter, Segoe UI, system-ui, sans-serif`;
    ctx.textAlign = align;
    ctx.textBaseline = "middle";
    ctx.fillText(text, x, y);
  }

  function drawRoundedRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + width, y, x + width, y + height, radius);
    ctx.arcTo(x + width, y + height, x, y + height, radius);
    ctx.arcTo(x, y + height, x, y, radius);
    ctx.arcTo(x, y, x + width, y, radius);
    ctx.closePath();
  }

  function makeLayout(width = WINDOW_WIDTH, height = WINDOW_HEIGHT) {
    return {
      titleY: 34,
      statusY: 68,
      curve: {
        x: 38,
        y: 96,
        width: width - 76,
        height: 232,
      },
      params: {
        x: 48,
        y: 352,
        width: 222,
        height: 142,
      },
      fitness: {
        x: 292,
        y: 352,
        width: 218,
        height: 142,
      },
      spread: {
        x: 532,
        y: 352,
        width: 200,
        height: 142,
      },
      footerY: height - 26,
    };
  }

  function yForQuadratic(params, x) {
    const [a, b, c] = params;
    return a * x ** 2 + b * x + c;
  }

  function sampleCurve(params, minX, maxX) {
    return Array.from({ length: CURVE_SAMPLES }, (_, index) => {
      const x = minX + ((maxX - minX) * index) / (CURVE_SAMPLES - 1);
      return { x, y: yForQuadratic(params, x) };
    });
  }

  function finiteRange(values, fallback = [-1, 1]) {
    const finite = values.filter(Number.isFinite);
    if (finite.length === 0) {
      return fallback;
    }
    let min = Math.min(...finite);
    let max = Math.max(...finite);
    if (min === max) {
      min -= 1;
      max += 1;
    }
    const padding = (max - min) * 0.08;
    return [min - padding, max + padding];
  }

  function drawPanel(ctx, rect) {
    ctx.fillStyle = COLORS.panel;
    drawRoundedRect(ctx, rect.x, rect.y, rect.width, rect.height, 8);
    ctx.fill();
    ctx.strokeStyle = COLORS.line;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  function drawCurve(ctx, simulation, layout) {
    const rect = layout.curve;
    const samples = sampleCurve(
      simulation.bestIndividual,
      simulation.options.xPlotMin,
      simulation.options.xPlotMax,
    );
    const [minY, maxY] = finiteRange(samples.map((sample) => sample.y));

    ctx.save();
    drawPanel(ctx, rect);
    drawText(ctx, "Best quadratic function", rect.x + 18, rect.y + 22, 16, COLORS.text, "700", "left");
    drawText(ctx, `x range ${simulation.options.xPlotMin} to ${simulation.options.xPlotMax}`, rect.x + rect.width - 18, rect.y + 22, 12, COLORS.muted, "500", "right");
    const plot = {
      x: rect.x + 38,
      y: rect.y + 48,
      width: rect.width - 76,
      height: rect.height - 82,
    };
    ctx.strokeStyle = COLORS.line;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(plot.x, plot.y + plot.height / 2);
    ctx.lineTo(plot.x + plot.width, plot.y + plot.height / 2);
    ctx.moveTo(plot.x + plot.width / 2, plot.y);
    ctx.lineTo(plot.x + plot.width / 2, plot.y + plot.height);
    ctx.stroke();

    ctx.beginPath();
    samples.forEach((sample, index) => {
      const px = plot.x + (plot.width * index) / (samples.length - 1);
      const py = plot.y + plot.height - ((sample.y - minY) / (maxY - minY)) * plot.height;
      if (index === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    });
    ctx.strokeStyle = COLORS.accentStrong;
    ctx.lineWidth = 3;
    ctx.stroke();
    drawText(ctx, "scaled y viewport", rect.x + rect.width / 2, rect.y + rect.height - 18, 12, COLORS.muted, "500");
    ctx.restore();
  }

  function drawParameterPanel(ctx, simulation, rect) {
    const labels = ["a", "b", "c"];
    const colors = [COLORS.blue, COLORS.green, COLORS.accent];
    drawPanel(ctx, rect);
    drawText(ctx, "Best parameters", rect.x + 18, rect.y + 22, 16, COLORS.text, "700", "left");
    simulation.bestIndividual.forEach((value, index) => {
      const y = rect.y + 52 + index * 28;
      drawText(ctx, labels[index], rect.x + 28, y, 16, colors[index], "800");
      drawText(ctx, formatNumber(value, 3), rect.x + 62, y, 16, COLORS.text, "650", "left");
    });
    drawText(ctx, `fitness ${formatNumber(simulation.bestFitness, 4)}`, rect.x + 18, rect.y + rect.height - 18, 13, COLORS.muted, "500", "left");
  }

  function drawFitnessPanel(ctx, simulation, rect) {
    drawPanel(ctx, rect);
    drawText(ctx, "Fitness history", rect.x + 18, rect.y + 22, 16, COLORS.text, "700", "left");
    const values = simulation.bestPerformers.map((entry) => entry.fitness).filter(Number.isFinite);
    const minValues = simulation.allPopulations.map((population) => Math.min(...finiteFitnessValues(population)));
    const maxValues = simulation.allPopulations.map((population) => Math.max(...finiteFitnessValues(population)));
    const [minFitness, maxFitness] = finiteRange([...values, ...minValues, ...maxValues], [-10, 0]);
    const plot = {
      x: rect.x + 28,
      y: rect.y + 46,
      width: rect.width - 48,
      height: rect.height - 74,
    };
    ctx.strokeStyle = COLORS.line;
    ctx.strokeRect(plot.x, plot.y, plot.width, plot.height);
    if (simulation.bestPerformers.length > 1) {
      ctx.beginPath();
      simulation.bestPerformers.forEach((entry, index) => {
        const px = plot.x + (plot.width * index) / (simulation.bestPerformers.length - 1);
        const value = Number.isFinite(entry.fitness) ? entry.fitness : minFitness;
        const py = plot.y + plot.height - ((value - minFitness) / (maxFitness - minFitness)) * plot.height;
        if (index === 0) {
          ctx.moveTo(px, py);
        } else {
          ctx.lineTo(px, py);
        }
      });
      ctx.strokeStyle = COLORS.accentStrong;
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }
    drawText(ctx, "best score", rect.x + rect.width / 2, rect.y + rect.height - 16, 12, COLORS.muted, "500");
  }

  function drawSpreadPanel(ctx, simulation, rect) {
    drawPanel(ctx, rect);
    drawText(ctx, "Population spread", rect.x + 18, rect.y + 22, 16, COLORS.text, "700", "left");
    const labels = ["a", "b", "c"];
    const colors = [COLORS.blue, COLORS.green, COLORS.accent];
    const plot = {
      x: rect.x + 28,
      y: rect.y + 48,
      width: rect.width - 52,
      height: rect.height - 78,
    };
    labels.forEach((label, paramIndex) => {
      const y = plot.y + (plot.height * paramIndex) / 2;
      drawText(ctx, label, rect.x + 18, y, 12, colors[paramIndex], "800");
      ctx.strokeStyle = COLORS.line;
      ctx.beginPath();
      ctx.moveTo(plot.x, y);
      ctx.lineTo(plot.x + plot.width, y);
      ctx.stroke();
      simulation.population.forEach((individual, index) => {
        const value = individual[paramIndex];
        const px = plot.x + ((value - simulation.options.geneLowerBound) /
          (simulation.options.geneUpperBound - simulation.options.geneLowerBound)) * plot.width;
        const jitter = ((index % 7) - 3) * 1.2;
        ctx.fillStyle = colors[paramIndex];
        ctx.globalAlpha = 0.42;
        ctx.beginPath();
        ctx.arc(px, y + jitter, 2, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
    });
    drawText(ctx, "-50", plot.x, rect.y + rect.height - 16, 11, COLORS.muted, "500");
    drawText(ctx, "50", plot.x + plot.width, rect.y + rect.height - 16, 11, COLORS.muted, "500");
  }

  function operationLabel(state) {
    if (state.completed) {
      return "20 generations complete";
    }
    if (state.fastMode) {
      return "fast evolution";
    }
    return {
      [Phase.SHOW]: "best parabola",
      [Phase.SELECT]: "tournament selection",
      [Phase.CROSSOVER]: "arithmetic crossover",
      [Phase.MUTATE]: "mutation rate 1",
    }[state.phase];
  }

  function drawRuntime(ctx, state, width = WINDOW_WIDTH, height = WINDOW_HEIGHT) {
    const simulation = state.simulation;
    const layout = makeLayout(width, height);
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, width, height);
    drawText(ctx, `Generation ${simulation.generation} / ${simulation.options.generations}`, width / 2, layout.titleY, 28);
    drawText(
      ctx,
      `${operationLabel(state)}  |  ${state.autoplay ? "autoplay" : "manual"}  |  mutation_rate = 1`,
      width / 2,
      layout.statusY,
      14,
      COLORS.muted,
      "500",
    );
    drawCurve(ctx, simulation, layout);
    drawParameterPanel(ctx, simulation, layout.params);
    drawFitnessPanel(ctx, simulation, layout.fitness);
    drawSpreadPanel(ctx, simulation, layout.spread);
    drawText(ctx, "seed 42, population 100, bounds [-50, 50]", width / 2, layout.footerY, 12, COLORS.muted, "500");
  }

  function createCanvas(container) {
    const canvas = document.createElement("canvas");
    canvas.width = WINDOW_WIDTH;
    canvas.height = WINDOW_HEIGHT;
    canvas.setAttribute("aria-label", "Animatie interactiva pentru optimizarea parametrilor continui cu algoritm genetic");
    container.append(canvas);
    return canvas;
  }

  function isDemoActive(container) {
    if (!container || typeof container.closest !== "function") {
      return true;
    }
    const section = container.closest("section");
    if (!section || typeof section.closest !== "function") {
      return true;
    }
    if (!section.closest(".reveal")) {
      return true;
    }
    return section.classList.contains("present");
  }

  function optionsFromContainer(container, previous = {}) {
    return mergeOptions({
      autoplay: container.dataset.autoplay !== "false",
      fastMode: previous.fastMode ?? false,
      seed: Number.parseInt(container.dataset.seed || String(DEFAULT_OPTIONS.seed), 10),
    });
  }

  function initDemo(container) {
    if (container.dataset.continuousReady === "true") {
      return;
    }
    container.dataset.continuousReady = "true";
    const canvas = createCanvas(container);
    const ctx = canvas.getContext("2d");
    let options = optionsFromContainer(container);
    let runtime = makeRuntimeState(options);
    let lastTime = 0;
    let wasActive = false;

    function advanceManual() {
      const simulation = evolveGeneration(runtime.simulation);
      runtime = {
        ...runtime,
        simulation,
        autoplay: false,
        completed: simulation.generation >= simulation.options.generations,
      };
      drawRuntime(ctx, runtime);
    }

    canvas.addEventListener("click", () => {
      if (isDemoActive(container) && !runtime.autoplay) {
        advanceManual();
      }
    });

    window.addEventListener("keydown", (event) => {
      if (!isDemoActive(container)) {
        return;
      }
      const key = event.key.toLowerCase();
      if (key === "a") {
        runtime = { ...runtime, autoplay: !runtime.autoplay };
      } else if (key === "x") {
        runtime = { ...runtime, fastMode: !runtime.fastMode, phase: Phase.SHOW };
      } else if (key === "r") {
        options = optionsFromContainer(container, runtime);
        runtime = makeRuntimeState(options);
      } else if ((key === " " || key === "arrowright") && !runtime.autoplay) {
        advanceManual();
      }
    });

    function frame(timestamp) {
      const active = isDemoActive(container);
      if (active && !wasActive) {
        options = optionsFromContainer(container, runtime);
        runtime = makeRuntimeState(options);
        drawRuntime(ctx, runtime);
        lastTime = timestamp;
      } else if (!active) {
        wasActive = false;
        window.requestAnimationFrame(frame);
        return;
      }
      wasActive = active;
      if (timestamp - lastTime >= 1000 / 60) {
        drawRuntime(ctx, runtime);
        runtime = tickRuntimeState(runtime);
        lastTime = timestamp;
      }
      window.requestAnimationFrame(frame);
    }

    window.requestAnimationFrame(frame);
  }

  function initAll() {
    if (typeof document === "undefined") {
      return;
    }
    document.querySelectorAll(".continuous-demo").forEach(initDemo);
  }

  const api = {
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
    makeLayout,
  };

  if (typeof window !== "undefined") {
    window.ContinuousParametersDemo = api;
    window.addEventListener("DOMContentLoaded", initAll);
    window.addEventListener("load", initAll);
  }
})();
