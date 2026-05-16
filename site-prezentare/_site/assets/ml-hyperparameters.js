(function () {
  "use strict";

  const WINDOW_WIDTH = 780;
  const WINDOW_HEIGHT = 560;
  const GENERATION_FRAMES = 36;

  const BASELINE = {
    maxDepth: 3,
    minSamplesLeaf: 1,
    criterion: 0,
    accuracy: 0.6883,
    recall: 0.26,
    falseNegatives: 40,
  };

  const TARGET = {
    maxDepth: 4,
    minSamplesLeaf: 5,
    criterion: 0,
    accuracy: 0.7987,
    recall: 0.72,
    falseNegatives: 15,
  };

  const DEFAULT_OPTIONS = {
    generations: 50,
    populationSize: 50,
    crossoverRate: 0.8,
    mutationRate: 0.1,
    elitismCount: 1,
    parentsPortion: 0.3,
    seed: 42,
    maxDepthMin: 1,
    maxDepthMax: 20,
    minLeafMin: 1,
    minLeafMax: 10,
    criterionMin: 0,
    criterionMax: 1,
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
    gini: "#4e7656",
    entropy: "#405f8f",
    baseline: "#a7a08f",
    target: "#7f3b1e",
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

  function randomInt(lo, hi, rng) {
    return lo + Math.floor(rng() * (hi - lo + 1));
  }

  function clamp(value, lo, hi) {
    return Math.max(lo, Math.min(hi, value));
  }

  function mergeOptions(options = {}) {
    return { ...DEFAULT_OPTIONS, ...options };
  }

  function formatNumber(value, digits = 4) {
    if (!Number.isFinite(value)) {
      return "-";
    }
    return value.toFixed(digits);
  }

  function criterionLabel(value) {
    return value === 0 ? "gini" : "entropy";
  }

  // Synthetic accuracy landscape that mirrors the notebook's reported anchors
  // and falls off smoothly around the optimum (max_depth=4, min_samples_leaf=5, gini).
  function estimatedAccuracy(maxDepth, minSamplesLeaf, criterion) {
    if (
      maxDepth === TARGET.maxDepth &&
      minSamplesLeaf === TARGET.minSamplesLeaf &&
      criterion === TARGET.criterion
    ) {
      return TARGET.accuracy;
    }
    if (
      maxDepth === BASELINE.maxDepth &&
      minSamplesLeaf === BASELINE.minSamplesLeaf &&
      criterion === BASELINE.criterion
    ) {
      return BASELINE.accuracy;
    }

    const depthGap = maxDepth - TARGET.maxDepth;
    const leafGap = minSamplesLeaf - TARGET.minSamplesLeaf;
    const distance = Math.sqrt(0.06 * depthGap * depthGap + 0.045 * leafGap * leafGap);
    const criterionPenalty = criterion === TARGET.criterion ? 0 : 0.018;

    let acc = TARGET.accuracy - 0.16 * (1 - Math.exp(-distance * 0.85)) - criterionPenalty;
    if (maxDepth < 2) {
      acc -= 0.06;
    }
    if (maxDepth > 12) {
      acc -= 0.018 + 0.006 * (maxDepth - 12);
    }

    const hash = (((maxDepth * 31) ^ (minSamplesLeaf * 97) ^ (criterion * 41)) + 1024) % 23;
    acc += (hash - 11) * 0.0011;
    return Math.max(0.55, Math.min(TARGET.accuracy, acc));
  }

  function fitnessFunction(individual) {
    return estimatedAccuracy(individual[0], individual[1], individual[2]);
  }

  function approximateRecall(accuracy) {
    if (accuracy <= BASELINE.accuracy) {
      return Math.max(0, BASELINE.recall - (BASELINE.accuracy - accuracy) * 0.6);
    }
    if (accuracy >= TARGET.accuracy) {
      return TARGET.recall;
    }
    const ratio = (accuracy - BASELINE.accuracy) / (TARGET.accuracy - BASELINE.accuracy);
    return BASELINE.recall + (TARGET.recall - BASELINE.recall) * ratio;
  }

  function approximateFalseNegatives(accuracy) {
    if (accuracy <= BASELINE.accuracy) {
      return Math.min(54, Math.round(BASELINE.falseNegatives + (BASELINE.accuracy - accuracy) * 60));
    }
    if (accuracy >= TARGET.accuracy) {
      return TARGET.falseNegatives;
    }
    const ratio = (accuracy - BASELINE.accuracy) / (TARGET.accuracy - BASELINE.accuracy);
    return Math.round(BASELINE.falseNegatives + (TARGET.falseNegatives - BASELINE.falseNegatives) * ratio);
  }

  function createIndividual(rng, opts) {
    return [
      randomInt(opts.maxDepthMin, opts.maxDepthMax, rng),
      randomInt(opts.minLeafMin, opts.minLeafMax, rng),
      randomInt(opts.criterionMin, opts.criterionMax, rng),
    ];
  }

  function createInitialPopulation(rng, opts) {
    return Array.from({ length: opts.populationSize }, () => createIndividual(rng, opts));
  }

  function evaluatePopulation(population) {
    return population
      .map((individual) => ({
        individual: [...individual],
        fitness: fitnessFunction(individual),
      }))
      .sort((left, right) => right.fitness - left.fitness);
  }

  function summarizePopulation(population) {
    const evaluated = evaluatePopulation(population);
    const best = evaluated[0];
    const fitnesses = evaluated.map((entry) => entry.fitness);
    const mean = fitnesses.reduce((sum, value) => sum + value, 0) / fitnesses.length;
    return {
      population: evaluated.map((entry) => [...entry.individual]),
      bestIndividual: [...best.individual],
      bestFitness: best.fitness,
      meanFitness: mean,
      worstFitness: fitnesses[fitnesses.length - 1],
    };
  }

  function uniformCrossover(parentA, parentB, rng) {
    return parentA.map((value, index) => (rng() < 0.5 ? value : parentB[index]));
  }

  function mutate(individual, rate, opts, rng) {
    return individual.map((value, index) => {
      if (rng() >= rate) {
        return value;
      }
      if (index === 0) {
        return randomInt(opts.maxDepthMin, opts.maxDepthMax, rng);
      }
      if (index === 1) {
        return randomInt(opts.minLeafMin, opts.minLeafMax, rng);
      }
      return randomInt(opts.criterionMin, opts.criterionMax, rng);
    });
  }

  function createInitialState(options = {}) {
    const merged = mergeOptions(options);
    const rng = makeRng(merged.seed);
    const population = createInitialPopulation(rng, merged);
    const summary = summarizePopulation(population);
    return {
      ...summary,
      generation: 0,
      bestPerformers: [
        { individual: [...summary.bestIndividual], fitness: summary.bestFitness },
      ],
      meanHistory: [summary.meanFitness],
      options: merged,
      lastOperation: "Initial population",
    };
  }

  function evolveGeneration(state) {
    if (state.generation >= state.options.generations) {
      return state;
    }
    const opts = state.options;
    const rng = makeRng((opts.seed ?? 0) + state.generation + 1);
    const evaluated = evaluatePopulation(state.population);
    const eliteCount = Math.max(1, Math.round(opts.populationSize * 0.01));
    const parentsCount = Math.max(2, Math.round(opts.populationSize * opts.parentsPortion));
    const elite = evaluated.slice(0, eliteCount).map((entry) => [...entry.individual]);
    const parents = evaluated.slice(0, parentsCount).map((entry) => [...entry.individual]);

    const nextPopulation = [...elite];
    while (nextPopulation.length < opts.populationSize) {
      const a = parents[Math.floor(rng() * parents.length)];
      const b = parents[Math.floor(rng() * parents.length)];
      let child = rng() < opts.crossoverRate ? uniformCrossover(a, b, rng) : [...a];
      child = mutate(child, opts.mutationRate, opts, rng);
      nextPopulation.push(child);
    }

    const summary = summarizePopulation(nextPopulation);
    const generation = state.generation + 1;
    return {
      ...state,
      ...summary,
      generation,
      bestPerformers: [
        ...state.bestPerformers,
        { individual: [...summary.bestIndividual], fitness: summary.bestFitness },
      ],
      meanHistory: [...state.meanHistory, summary.meanFitness],
      lastOperation: "Elitism + uniform crossover + mutation",
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
      return { ...state, autoplay: false, phase: Phase.SHOW };
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

  function drawPanel(ctx, rect) {
    ctx.fillStyle = COLORS.panel;
    drawRoundedRect(ctx, rect.x, rect.y, rect.width, rect.height, 8);
    ctx.fill();
    ctx.strokeStyle = COLORS.line;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  function makeLayout(width = WINDOW_WIDTH, height = WINDOW_HEIGHT) {
    return {
      titleY: 30,
      statusY: 60,
      scatter: { x: 28, y: 84, width: 412, height: 282 },
      best: { x: 460, y: 84, width: 292, height: 132 },
      history: { x: 460, y: 230, width: 292, height: 136 },
      comparison: { x: 28, y: 380, width: 724, height: 152 },
      footerY: height - 16,
    };
  }

  function drawScatterMarker(ctx, x, y, criterion, options = {}) {
    const radius = options.radius ?? 4.2;
    const alpha = options.alpha ?? 1;
    const fill = criterion === 0 ? COLORS.gini : COLORS.entropy;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = fill;
    ctx.beginPath();
    if (criterion === 0) {
      ctx.arc(x, y, radius, 0, Math.PI * 2);
    } else {
      ctx.moveTo(x - radius, y - radius);
      ctx.lineTo(x + radius, y - radius);
      ctx.lineTo(x + radius, y + radius);
      ctx.lineTo(x - radius, y + radius);
      ctx.closePath();
    }
    ctx.fill();
    ctx.restore();
  }

  function drawScatter(ctx, simulation, rect) {
    drawPanel(ctx, rect);
    drawText(ctx, "Search space", rect.x + 16, rect.y + 22, 14, COLORS.text, "700", "left");
    drawText(
      ctx,
      "max_depth →   min_samples_leaf ↑",
      rect.x + rect.width - 16,
      rect.y + 22,
      11,
      COLORS.muted,
      "500",
      "right",
    );

    const opts = simulation.options;
    const plot = {
      x: rect.x + 46,
      y: rect.y + 44,
      width: rect.width - 64,
      height: rect.height - 88,
    };

    function depthToX(d) {
      return plot.x + ((d - opts.maxDepthMin) / (opts.maxDepthMax - opts.maxDepthMin)) * plot.width;
    }
    function leafToY(l) {
      return plot.y + plot.height - ((l - opts.minLeafMin) / (opts.minLeafMax - opts.minLeafMin)) * plot.height;
    }

    ctx.strokeStyle = COLORS.line;
    ctx.lineWidth = 1;
    ctx.strokeRect(plot.x, plot.y, plot.width, plot.height);

    ctx.strokeStyle = COLORS.line;
    ctx.lineWidth = 0.4;
    [1, 5, 10, 15, 20].forEach((d) => {
      const px = depthToX(d);
      ctx.beginPath();
      ctx.moveTo(px, plot.y);
      ctx.lineTo(px, plot.y + plot.height);
      ctx.stroke();
      drawText(ctx, String(d), px, plot.y + plot.height + 14, 10, COLORS.muted, "500");
    });
    [1, 4, 7, 10].forEach((l) => {
      const py = leafToY(l);
      ctx.beginPath();
      ctx.moveTo(plot.x, py);
      ctx.lineTo(plot.x + plot.width, py);
      ctx.stroke();
      drawText(ctx, String(l), plot.x - 10, py, 10, COLORS.muted, "500", "right");
    });

    const targetX = depthToX(TARGET.maxDepth);
    const targetY = leafToY(TARGET.minSamplesLeaf);
    ctx.save();
    ctx.strokeStyle = COLORS.target;
    ctx.lineWidth = 1.4;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.arc(targetX, targetY, 12, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    drawText(ctx, "target", targetX, targetY - 18, 10, COLORS.target, "700");

    const counts = new Map();
    simulation.population.forEach((individual, index) => {
      const key = `${individual[0]}-${individual[1]}-${individual[2]}`;
      const count = counts.get(key) ?? 0;
      counts.set(key, count + 1);
      const px = depthToX(individual[0]);
      const py = leafToY(individual[1]);
      const angle = (index * 2.39996) % (Math.PI * 2);
      const radius = count === 0 ? 0 : Math.min(7, 1.6 + Math.log2(1 + count) * 1.2);
      const ox = Math.cos(angle) * radius;
      const oy = Math.sin(angle) * radius;
      drawScatterMarker(ctx, px + ox, py + oy, individual[2], { alpha: 0.55 });
    });

    const best = simulation.bestIndividual;
    const bx = depthToX(best[0]);
    const by = leafToY(best[1]);
    ctx.strokeStyle = COLORS.accentStrong;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(bx, by, 9, 0, Math.PI * 2);
    ctx.stroke();
    drawScatterMarker(ctx, bx, by, best[2], { radius: 5.4, alpha: 1 });

    const legendY = rect.y + rect.height - 16;
    let cursorX = rect.x + 18;
    drawScatterMarker(ctx, cursorX + 4, legendY, 0, { radius: 4 });
    drawText(ctx, "gini", cursorX + 14, legendY, 11, COLORS.muted, "500", "left");
    cursorX += 60;
    drawScatterMarker(ctx, cursorX + 4, legendY, 1, { radius: 4 });
    drawText(ctx, "entropy", cursorX + 14, legendY, 11, COLORS.muted, "500", "left");
    cursorX += 90;
    ctx.strokeStyle = COLORS.accentStrong;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cursorX + 4, legendY, 6, 0, Math.PI * 2);
    ctx.stroke();
    drawText(ctx, "best", cursorX + 14, legendY, 11, COLORS.muted, "500", "left");
    cursorX += 70;
    ctx.save();
    ctx.strokeStyle = COLORS.target;
    ctx.lineWidth = 1.4;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.arc(cursorX + 4, legendY, 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    drawText(ctx, "target", cursorX + 14, legendY, 11, COLORS.muted, "500", "left");
  }

  function drawBestPanel(ctx, simulation, rect) {
    drawPanel(ctx, rect);
    drawText(ctx, "Best individual", rect.x + 16, rect.y + 22, 14, COLORS.text, "700", "left");

    const best = simulation.bestIndividual;
    const labels = ["max_depth", "min_samples_leaf", "criterion"];
    const values = [String(best[0]), String(best[1]), criterionLabel(best[2])];
    const colors = [COLORS.gini, COLORS.entropy, COLORS.accent];

    labels.forEach((label, index) => {
      const y = rect.y + 48 + index * 22;
      drawText(ctx, label, rect.x + 18, y, 12, colors[index], "650", "left");
      drawText(ctx, values[index], rect.x + rect.width - 18, y, 13, COLORS.text, "700", "right");
    });

    const accY = rect.y + rect.height - 22;
    drawText(
      ctx,
      `accuracy ${formatNumber(simulation.bestFitness, 4)}`,
      rect.x + 16,
      accY,
      13,
      COLORS.muted,
      "600",
      "left",
    );
  }

  function drawHistoryPanel(ctx, simulation, rect) {
    drawPanel(ctx, rect);
    drawText(ctx, "Fitness history", rect.x + 16, rect.y + 22, 14, COLORS.text, "700", "left");

    const plot = {
      x: rect.x + 32,
      y: rect.y + 42,
      width: rect.width - 50,
      height: rect.height - 76,
    };
    ctx.strokeStyle = COLORS.line;
    ctx.lineWidth = 1;
    ctx.strokeRect(plot.x, plot.y, plot.width, plot.height);

    const minY = 0.55;
    const maxY = TARGET.accuracy + 0.005;

    const baselineY = plot.y + plot.height - ((BASELINE.accuracy - minY) / (maxY - minY)) * plot.height;
    ctx.save();
    ctx.strokeStyle = COLORS.baseline;
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(plot.x, baselineY);
    ctx.lineTo(plot.x + plot.width, baselineY);
    ctx.stroke();
    ctx.restore();
    drawText(ctx, "baseline 0.69", plot.x + plot.width - 4, baselineY - 8, 10, COLORS.baseline, "650", "right");

    const targetY = plot.y + plot.height - ((TARGET.accuracy - minY) / (maxY - minY)) * plot.height;
    ctx.save();
    ctx.strokeStyle = COLORS.target;
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 4]);
    ctx.beginPath();
    ctx.moveTo(plot.x, targetY);
    ctx.lineTo(plot.x + plot.width, targetY);
    ctx.stroke();
    ctx.restore();
    drawText(ctx, "target 0.80", plot.x + 4, targetY - 8, 10, COLORS.target, "650", "left");

    const performers = simulation.bestPerformers;
    const totalGen = simulation.options.generations;
    if (performers.length > 1) {
      ctx.strokeStyle = COLORS.accentStrong;
      ctx.lineWidth = 2;
      ctx.beginPath();
      performers.forEach((entry, index) => {
        const px = plot.x + (plot.width * index) / totalGen;
        const py = plot.y + plot.height - ((entry.fitness - minY) / (maxY - minY)) * plot.height;
        if (index === 0) {
          ctx.moveTo(px, py);
        } else {
          ctx.lineTo(px, py);
        }
      });
      ctx.stroke();
    }

    drawText(ctx, "0", plot.x, rect.y + rect.height - 14, 10, COLORS.muted, "500");
    drawText(ctx, String(totalGen), plot.x + plot.width, rect.y + rect.height - 14, 10, COLORS.muted, "500");
    drawText(ctx, "generations", plot.x + plot.width / 2, rect.y + rect.height - 14, 11, COLORS.muted, "500");
  }

  function drawMetricColumn(ctx, options) {
    const { x, y, width, label, baselineValue, bestValue, scaleMax = 1.0 } = options;
    drawText(ctx, label, x, y, 12, COLORS.muted, "650", "left");

    const labelW = 76;
    const valueW = 56;
    const barAreaX = x + labelW;
    const barAreaWidth = width - labelW - valueW;

    const baselineY = y + 18;
    ctx.fillStyle = COLORS.panelAlt;
    drawRoundedRect(ctx, barAreaX, baselineY, barAreaWidth, 14, 3);
    ctx.fill();
    ctx.fillStyle = COLORS.baseline;
    drawRoundedRect(ctx, barAreaX, baselineY, barAreaWidth * (baselineValue / scaleMax), 14, 3);
    ctx.fill();
    drawText(ctx, "baseline", barAreaX - 8, baselineY + 7, 10, COLORS.muted, "600", "right");
    drawText(
      ctx,
      formatNumber(baselineValue, 2),
      barAreaX + barAreaWidth + 8,
      baselineY + 7,
      11,
      COLORS.muted,
      "650",
      "left",
    );

    const bestY = baselineY + 22;
    ctx.fillStyle = COLORS.panelAlt;
    drawRoundedRect(ctx, barAreaX, bestY, barAreaWidth, 14, 3);
    ctx.fill();
    ctx.fillStyle = COLORS.accentStrong;
    drawRoundedRect(ctx, barAreaX, bestY, barAreaWidth * (bestValue / scaleMax), 14, 3);
    ctx.fill();
    drawText(ctx, "GA best", barAreaX - 8, bestY + 7, 10, COLORS.accentStrong, "650", "right");
    drawText(
      ctx,
      formatNumber(bestValue, 2),
      barAreaX + barAreaWidth + 8,
      bestY + 7,
      11,
      COLORS.text,
      "650",
      "left",
    );
  }

  function drawComparisonPanel(ctx, simulation, rect) {
    drawPanel(ctx, rect);
    drawText(ctx, "Baseline vs current best", rect.x + 18, rect.y + 22, 14, COLORS.text, "700", "left");

    const bestAcc = simulation.bestFitness;
    const bestRecall = approximateRecall(bestAcc);
    const bestFN = approximateFalseNegatives(bestAcc);

    const colWidth = 332;
    const colGap = 24;
    const colX1 = rect.x + 22;
    const colX2 = colX1 + colWidth + colGap;
    const colY = rect.y + 50;

    drawMetricColumn(ctx, {
      x: colX1,
      y: colY,
      width: colWidth,
      label: "accuracy",
      baselineValue: BASELINE.accuracy,
      bestValue: bestAcc,
    });
    drawMetricColumn(ctx, {
      x: colX2,
      y: colY,
      width: colWidth,
      label: "recall (clasa diabet)",
      baselineValue: BASELINE.recall,
      bestValue: bestRecall,
    });

    const fnY = rect.y + rect.height - 22;
    drawText(
      ctx,
      `false negatives:  baseline ${BASELINE.falseNegatives}  →  current ${bestFN}`,
      rect.x + 22,
      fnY,
      12,
      COLORS.muted,
      "600",
      "left",
    );
    drawText(
      ctx,
      `best cfg: depth=${simulation.bestIndividual[0]}, leaf=${simulation.bestIndividual[1]}, ${criterionLabel(simulation.bestIndividual[2])}`,
      rect.x + rect.width - 22,
      fnY,
      12,
      COLORS.text,
      "650",
      "right",
    );
  }

  function operationLabel(state) {
    if (state.completed) {
      return `${state.simulation.options.generations} generations complete`;
    }
    if (state.fastMode) {
      return "fast evolution";
    }
    return {
      [Phase.SHOW]: "best configuration",
      [Phase.SELECT]: "elite + parent selection",
      [Phase.CROSSOVER]: "uniform crossover",
      [Phase.MUTATE]: "mutation rate 0.1",
    }[state.phase];
  }

  function drawRuntime(ctx, state, width = WINDOW_WIDTH, height = WINDOW_HEIGHT) {
    const simulation = state.simulation;
    const layout = makeLayout(width, height);
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, width, height);

    drawText(
      ctx,
      `Generation ${simulation.generation} / ${simulation.options.generations}`,
      width / 2,
      layout.titleY,
      26,
    );
    drawText(
      ctx,
      `${operationLabel(state)}  |  ${state.autoplay ? "autoplay" : "manual"}  |  pop ${simulation.options.populationSize}`,
      width / 2,
      layout.statusY,
      13,
      COLORS.muted,
      "500",
    );

    drawScatter(ctx, simulation, layout.scatter);
    drawBestPanel(ctx, simulation, layout.best);
    drawHistoryPanel(ctx, simulation, layout.history);
    drawComparisonPanel(ctx, simulation, layout.comparison);

    drawText(
      ctx,
      "seed 42, crossover 0.8, mutation 0.1, elitism 1, parents 30%",
      width / 2,
      layout.footerY,
      11,
      COLORS.muted,
      "500",
    );
  }

  function createCanvas(container) {
    const canvas = document.createElement("canvas");
    canvas.width = WINDOW_WIDTH;
    canvas.height = WINDOW_HEIGHT;
    canvas.setAttribute(
      "aria-label",
      "Animație interactivă pentru optimizarea hiperparametrilor unui clasificator cu algoritm genetic",
    );
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
    if (container.dataset.mlReady === "true") {
      return;
    }
    container.dataset.mlReady = "true";
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
    document.querySelectorAll(".ml-demo").forEach(initDemo);
  }

  const api = {
    DEFAULT_OPTIONS,
    BASELINE,
    TARGET,
    Phase,
    makeRng,
    fitnessFunction,
    estimatedAccuracy,
    approximateRecall,
    approximateFalseNegatives,
    createInitialPopulation,
    uniformCrossover,
    mutate,
    createInitialState,
    evolveGeneration,
    makeRuntimeState,
    tickRuntimeState,
    isDemoActive,
    makeLayout,
  };

  if (typeof window !== "undefined") {
    window.MlHyperparametersDemo = api;
    window.addEventListener("DOMContentLoaded", initAll);
    window.addEventListener("load", initAll);
  }
})();
