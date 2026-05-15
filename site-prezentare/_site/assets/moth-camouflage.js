(function () {
  "use strict";

  const GRID_LEN = 32;
  const POPULATION_SIZE = GRID_LEN * GRID_LEN;
  const MUTATION_RATE = 0.01;
  const WINDOW_WIDTH = 800;
  const WINDOW_HEIGHT = 600;
  const CHART_HISTORY_WINDOW = 512;
  const SELECTION_FRAMES = 75;
  const REPRODUCTION_FRAMES = 36;

  const COLORS = {
    background: [117, 127, 73],
    border: [102, 83, 41],
    highlight: [199, 203, 182],
    text: [42, 41, 30],
    textImp: [144, 107, 22],
  };

  const Phase = {
    SHOW: "show",
    SELECT: "select",
    REPRODUCE: "reproduce",
    FINALIZE: "finalize",
  };

  function color(values, alpha = 1) {
    return `rgba(${values[0]}, ${values[1]}, ${values[2]}, ${alpha})`;
  }

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

  function computeAverageColor(population) {
    if (population.length === 0) {
      return 0;
    }
    return population.reduce((total, value) => total + value, 0) / population.length;
  }

  function computeDistribution(population) {
    const distribution = new Array(256).fill(0);
    for (const value of population) {
      distribution[value] += 1;
    }
    return distribution;
  }

  function applySelection(population, targetColor) {
    return [...population].sort((left, right) => Math.abs(targetColor - left) - Math.abs(targetColor - right));
  }

  function computeSelectionOrder(population, targetColor) {
    return population
      .map((value, index) => ({ value, index }))
      .sort((left, right) => Math.abs(targetColor - left.value) - Math.abs(targetColor - right.value))
      .map((entry) => entry.index);
  }

  function mutateValue(value, mutationRate, rng) {
    let mutated = value;
    for (let bit = 0; bit < 8; bit += 1) {
      if (rng() < mutationRate) {
        mutated ^= 1 << bit;
      }
    }
    return mutated;
  }

  function cloneAndMutatePopulation(population, mutationRate = MUTATION_RATE, seed = null) {
    const rng = makeRng(seed);
    const half = Math.floor(population.length / 2);
    const nextPopulation = [...population];
    for (let index = 0; index < half; index += 1) {
      nextPopulation[index + half] = mutateValue(population[index], mutationRate, rng);
    }
    return nextPopulation;
  }

  function targetColorForGeneration(generation) {
    const wave = (Math.sin((Math.PI / 128.0) * generation) + 1.0) * 127.5;
    return Math.max(0, Math.min(255, Math.trunc(wave)));
  }

  function createInitialState(gridLen = GRID_LEN, seed = null) {
    const rng = makeRng(seed);
    const population = Array.from({ length: gridLen * gridLen }, () => Math.floor(rng() * 256));
    const targetColor = 128;
    return {
      population,
      generation: 1,
      targetColor,
      averageHistory: [computeAverageColor(population)],
      targetHistory: [targetColor],
      distribution: computeDistribution(population),
      seed,
    };
  }

  function finalizeGeneration(state) {
    const selected = applySelection(state.population, state.targetColor);
    const mutationSeed = state.seed == null ? null : state.seed + state.generation;
    const population = cloneAndMutatePopulation(selected, MUTATION_RATE, mutationSeed);
    const generation = state.generation + 1;
    const targetColor = targetColorForGeneration(generation);
    return {
      ...state,
      population,
      generation,
      targetColor,
      averageHistory: [...state.averageHistory, computeAverageColor(population)],
      targetHistory: [...state.targetHistory, targetColor],
      distribution: computeDistribution(population),
    };
  }

  function makeRuntimeState(options = {}) {
    const gridLen = options.gridLen ?? GRID_LEN;
    const simulation = createInitialState(gridLen, options.seed ?? null);
    return {
      simulation,
      phase: Phase.SHOW,
      autoplay: options.autoplay ?? false,
      fastMode: options.fastMode ?? false,
      frameIndex: 0,
      phaseFrame: 0,
      animationOrder: Array.from({ length: simulation.population.length }, (_, index) => index),
      gridLen,
    };
  }

  function beginSelectionPhase(state) {
    return {
      ...state,
      phase: Phase.SELECT,
      phaseFrame: 0,
      animationOrder: computeSelectionOrder(state.simulation.population, state.simulation.targetColor),
    };
  }

  function advancePhase(state) {
    if (state.phase === Phase.SHOW) {
      return beginSelectionPhase(state);
    }
    if (state.phase === Phase.SELECT) {
      return { ...state, phase: Phase.REPRODUCE, phaseFrame: 0 };
    }
    if (state.phase === Phase.REPRODUCE) {
      return { ...state, phase: Phase.FINALIZE, phaseFrame: 0 };
    }
    const simulation = finalizeGeneration(state.simulation);
    return {
      ...state,
      simulation,
      phase: Phase.SHOW,
      phaseFrame: 0,
      animationOrder: Array.from({ length: simulation.population.length }, (_, index) => index),
    };
  }

  function tickRuntimeState(state) {
    let next = {
      ...state,
      frameIndex: state.frameIndex + 1,
      phaseFrame: state.phaseFrame + 1,
    };
    if (!next.autoplay) {
      return next;
    }
    if (next.fastMode) {
      const simulation = finalizeGeneration(next.simulation);
      return {
        ...next,
        simulation,
        phase: Phase.SHOW,
        phaseFrame: 0,
        animationOrder: Array.from({ length: simulation.population.length }, (_, index) => index),
      };
    }
    if (next.phase === Phase.SHOW && next.phaseFrame >= 45) {
      return advancePhase(next);
    }
    if (next.phase === Phase.SELECT && next.phaseFrame >= SELECTION_FRAMES) {
      return advancePhase(next);
    }
    if (next.phase === Phase.REPRODUCE && next.phaseFrame >= REPRODUCTION_FRAMES) {
      return advancePhase(next);
    }
    if (next.phase === Phase.FINALIZE && next.phaseFrame >= REPRODUCTION_FRAMES) {
      return advancePhase(next);
    }
    return next;
  }

  function makeLayout(width = WINDOW_WIDTH, height = WINDOW_HEIGHT) {
    const scale = Math.max(1.0, Math.min(width / WINDOW_WIDTH, height / WINDOW_HEIGHT));
    const chartScale = Math.min(scale, 1.25);
    const margin = Math.trunc(32 * scale);
    const top = Math.trunc(150 * scale);
    const chart = [margin, top, Math.trunc(360 * chartScale), Math.trunc(175 * chartScale)];
    const histogram = [margin, Math.trunc(370 * scale), Math.trunc(360 * chartScale), Math.trunc(175 * chartScale)];
    const rightSpace = width - (chart[0] + chart[2]) - margin * 3;
    const bottomReservedSpace = Math.max(margin, Math.trunc(80 * Math.min(scale, 1.5)));
    const verticalSpace = height - top - bottomReservedSpace;
    const availablePopulationSize = Math.max(330, Math.min(rightSpace, verticalSpace));
    const gridGap = Math.max(2, Math.trunc(2 * scale));
    const gridCell = Math.max(8, Math.trunc((availablePopulationSize - gridGap * (GRID_LEN + 1) - 8) / GRID_LEN));
    const populationSize = gridCell * GRID_LEN + gridGap * (GRID_LEN + 1) + 8;
    const population = [width - margin - populationSize, top, populationSize, populationSize];
    return {
      population,
      chart,
      histogram,
      gridCell,
      gridGap,
      titleX: width / 2,
      titleY: 42,
    };
  }

  function drawText(ctx, text, x, y, size, fill = COLORS.text, weight = "600") {
    ctx.fillStyle = color(fill);
    ctx.font = `${weight} ${size}px Inter, Segoe UI, system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, x, y);
  }

  function drawLine(ctx, values, x, y, width, height, lineColor) {
    if (values.length < 2) {
      return;
    }
    ctx.save();
    ctx.strokeStyle = color(lineColor);
    ctx.lineWidth = 3;
    ctx.beginPath();
    values.forEach((value, index) => {
      const px = x + (width / (values.length - 1)) * index;
      const py = y + height - height * (value / 255.0);
      if (index === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    });
    ctx.stroke();
    ctx.restore();
  }

  function visibleValues(values) {
    return values.length <= CHART_HISTORY_WINDOW ? values : values.slice(-CHART_HISTORY_WINDOW);
  }

  function drawPopulationPanel(ctx, state, x, y, cell, gap) {
    const simulation = state.simulation;
    const gridLen = state.gridLen;
    const panelSize = cell * gridLen + gap * (gridLen + 1) + 8;
    ctx.save();
    ctx.strokeStyle = color(COLORS.border);
    ctx.lineWidth = 8;
    ctx.fillStyle = `rgb(${simulation.targetColor}, ${simulation.targetColor}, ${simulation.targetColor})`;
    ctx.strokeRect(x + 4, y + 4, panelSize, panelSize);
    ctx.fillRect(x + 4, y + 4, panelSize, panelSize);
    const offset = 8 + gap;
    const selectionProgress = state.phase === Phase.SELECT ? Math.min(state.phaseFrame / SELECTION_FRAMES, 1.0) : 0;

    for (let targetIndex = 0; targetIndex < simulation.population.length; targetIndex += 1) {
      const sourceIndex = state.phase === Phase.SELECT ? state.animationOrder[targetIndex] : targetIndex;
      const sourceCol = sourceIndex % gridLen;
      const sourceRow = Math.floor(sourceIndex / gridLen);
      const targetCol = targetIndex % gridLen;
      const targetRow = Math.floor(targetIndex / gridLen);
      const col = sourceCol + (targetCol - sourceCol) * selectionProgress;
      const row = sourceRow + (targetRow - sourceRow) * selectionProgress;
      const value = simulation.population[sourceIndex];
      ctx.fillStyle = `rgb(${value}, ${value}, ${value})`;
      ctx.fillRect(x + (cell + gap) * col + offset, y + (cell + gap) * row + offset, cell, cell);
    }

    if (state.phase === Phase.REPRODUCE || state.phase === Phase.FINALIZE) {
      let alpha = Math.min(state.phaseFrame / REPRODUCTION_FRAMES, 1.0);
      if (state.phase === Phase.FINALIZE) {
        alpha = 1.0 - alpha;
      }
      ctx.fillStyle = `rgba(${simulation.targetColor}, ${simulation.targetColor}, ${simulation.targetColor}, ${alpha})`;
      ctx.fillRect(x + 8, y + 8 + panelSize / 2, panelSize - 8, panelSize / 2 - 4);
    }
    ctx.restore();
  }

  function drawAverageChart(ctx, x, y, width, height, simulation) {
    ctx.save();
    ctx.strokeStyle = color(COLORS.border);
    ctx.lineWidth = 6;
    ctx.fillStyle = color(COLORS.highlight);
    ctx.fillRect(x, y, width, height);
    ctx.strokeRect(x, y, width, height);
    drawText(ctx, "Average Color", x + width / 2, y + 24, 24);
    drawText(ctx, "0", x + 30, y + height - 28, 13);
    drawText(ctx, "255", x + 34, y + 82, 13);
    drawText(ctx, `Target Color: ${simulation.targetColor}`, x + width / 2, y + 52, 13, COLORS.textImp);
    const plotX = x + 58;
    const plotY = y + 82;
    const plotW = width - 86;
    const plotH = height - 114;
    drawLine(ctx, visibleValues(simulation.targetHistory), plotX, plotY, plotW, plotH, COLORS.textImp);
    drawLine(ctx, visibleValues(simulation.averageHistory), plotX, plotY, plotW, plotH, COLORS.text);
    ctx.restore();
  }

  function drawDistributionHistogram(ctx, x, y, width, height, simulation) {
    ctx.save();
    ctx.strokeStyle = color(COLORS.border);
    ctx.lineWidth = 6;
    ctx.fillStyle = color(COLORS.highlight);
    ctx.fillRect(x, y, width, height);
    ctx.strokeRect(x, y, width, height);
    drawText(ctx, "Color Distribution", x + width / 2, y + 34, 28);
    const plotX = x + 28;
    const plotY = y + 82;
    const plotW = width - 56;
    const plotH = height - 120;
    const targetX = plotX + plotW * (simulation.targetColor / 255.0);
    ctx.fillStyle = color(COLORS.textImp);
    ctx.fillRect(targetX, plotY, Math.max(2, plotW / 256), plotH);
    drawText(ctx, "Target Color", Math.min(Math.max(targetX, x + 86), x + width - 86), y + 62, 16, COLORS.textImp);
    ctx.fillStyle = color(COLORS.text);
    const barW = plotW / 256;
    const maxHeight = Math.max(1.0, Math.sqrt(Math.max(...simulation.distribution)));
    simulation.distribution.forEach((count, index) => {
      const barH = plotH * (Math.sqrt(count) / maxHeight);
      ctx.fillRect(plotX + index * barW, plotY + plotH - barH, Math.max(1, barW), barH);
    });
    drawText(ctx, "0", x + 30, y + height - 24, 16);
    drawText(ctx, "255", x + width - 34, y + height - 24, 16);
    ctx.restore();
  }

  function operationLabel(phase, fastMode = false) {
    if (fastMode) {
      return "Fast evolution";
    }
    return {
      [Phase.SHOW]: "Showing generation",
      [Phase.SELECT]: "Selecting best adapted moths",
      [Phase.REPRODUCE]: "Replacing weak moths",
      [Phase.FINALIZE]: "Applying mutations",
    }[phase];
  }

  function drawRuntime(ctx, state, width, height) {
    const layout = makeLayout(width, height);
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = color(COLORS.background);
    ctx.fillRect(0, 0, width, height);
    drawText(ctx, `Generation ${state.simulation.generation}`, layout.titleX, layout.titleY, 34);
    drawText(
      ctx,
      `${state.autoplay ? "autoplay" : "manual"}  |  ${state.fastMode ? "fast on" : "fast off"}  |  ${state.phase}`,
      layout.titleX,
      layout.titleY + 36,
      14,
      COLORS.text,
      "500",
    );
    const [popX, popY, popWidth] = layout.population;
    drawText(ctx, operationLabel(state.phase, state.fastMode), popX + popWidth / 2, popY - 28, 20);
    drawPopulationPanel(ctx, state, popX, popY, layout.gridCell, layout.gridGap);
    drawAverageChart(ctx, ...layout.chart, state.simulation);
    drawDistributionHistogram(ctx, ...layout.histogram, state.simulation);
  }

  function createCanvas(container) {
    const canvas = document.createElement("canvas");
    canvas.width = WINDOW_WIDTH;
    canvas.height = WINDOW_HEIGHT;
    canvas.setAttribute("aria-label", "Animație interactivă pentru camuflarea moliilor");
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

  function initDemo(container) {
    if (container.dataset.mothReady === "true") {
      return;
    }
    container.dataset.mothReady = "true";
    const canvas = createCanvas(container);
    const ctx = canvas.getContext("2d");
    let runtime = makeRuntimeState({
      autoplay: container.dataset.autoplay !== "false",
      seed: Number.parseInt(container.dataset.seed || "2026", 10),
    });
    let lastTime = 0;
    let wasActive = false;

    canvas.addEventListener("click", () => {
      if (!isDemoActive(container)) {
        return;
      }
      runtime = advancePhase({ ...runtime, autoplay: false });
    });

    window.addEventListener("keydown", (event) => {
      if (!isDemoActive(container)) {
        return;
      }
      const key = event.key.toLowerCase();
      if (key === "a") {
        runtime = { ...runtime, autoplay: !runtime.autoplay };
      } else if (key === "x") {
        runtime = { ...runtime, fastMode: !runtime.fastMode, phase: Phase.SHOW, phaseFrame: 0 };
      } else if (key === "r") {
        runtime = makeRuntimeState({ autoplay: runtime.autoplay, seed: Number.parseInt(container.dataset.seed || "2026", 10) });
      } else if ((key === " " || key === "arrowright") && !runtime.autoplay) {
        runtime = advancePhase(runtime);
      }
    });

    function frame(timestamp) {
      const active = isDemoActive(container);
      if (active && !wasActive) {
        runtime = makeRuntimeState({
          autoplay: container.dataset.autoplay !== "false",
          seed: Number.parseInt(container.dataset.seed || "2026", 10),
        });
        drawRuntime(ctx, runtime, WINDOW_WIDTH, WINDOW_HEIGHT);
        lastTime = timestamp;
      } else if (!active) {
        wasActive = false;
        window.requestAnimationFrame(frame);
        return;
      }
      wasActive = active;
      if (timestamp - lastTime >= 1000 / 60) {
        drawRuntime(ctx, runtime, WINDOW_WIDTH, WINDOW_HEIGHT);
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
    document.querySelectorAll(".moth-demo").forEach(initDemo);
  }

  const api = {
    Phase,
    createInitialState,
    targetColorForGeneration,
    makeRuntimeState,
    tickRuntimeState,
    advancePhase,
    finalizeGeneration,
    isDemoActive,
  };

  if (typeof window !== "undefined") {
    window.MothCamouflage = api;
    window.addEventListener("DOMContentLoaded", initAll);
    window.addEventListener("load", initAll);
  }
})();
