(function () {
  "use strict";

  const DEFAULT_VALUES = Array.from({ length: 21 }, (_, index) => index);
  const DEFAULT_SEED = 46;
  const DEFAULT_POP_SIZE = 50;
  const DEFAULT_GENERATIONS = 200;
  const TOURNAMENT_K = 3;
  const CROSSOVER_RATE = 0.9;
  const MUTATION_RATE = 0.1;
  const WINDOW_WIDTH = 760;
  const WINDOW_HEIGHT = 560;
  const GENERATION_FRAMES = 24;

  const Phase = {
    SHOW: "show",
    SELECT: "select",
    CROSSOVER: "crossover",
    MUTATE: "mutate",
  };

  const COLORS = {
    background: "#f7f4ea",
    panel: "#ebe4d3",
    panelAlt: "#f1efe6",
    line: "#837b68",
    text: "#27241f",
    muted: "#625b4c",
    accent: "#5f7d68",
    accentStrong: "#315f4c",
    warm: "#b4693c",
  };

  function makeRng(seed) {
    const mt = new Array(624).fill(0);
    let index = 624;
    const seedValue = seed == null ? Date.now() >>> 0 : Math.abs(Number(seed)) >>> 0;

    function initGenrand(value) {
      mt[0] = value >>> 0;
      for (let i = 1; i < 624; i += 1) {
        const previous = mt[i - 1] ^ (mt[i - 1] >>> 30);
        mt[i] = (Math.imul(1812433253, previous) + i) >>> 0;
      }
      index = 624;
    }

    function initByArray(keys) {
      initGenrand(19650218);
      let i = 1;
      let j = 0;
      for (let k = Math.max(624, keys.length); k > 0; k -= 1) {
        const previous = mt[i - 1] ^ (mt[i - 1] >>> 30);
        mt[i] = ((mt[i] ^ Math.imul(previous, 1664525)) + keys[j] + j) >>> 0;
        i += 1;
        j += 1;
        if (i >= 624) {
          mt[0] = mt[623];
          i = 1;
        }
        if (j >= keys.length) {
          j = 0;
        }
      }
      for (let k = 623; k > 0; k -= 1) {
        const previous = mt[i - 1] ^ (mt[i - 1] >>> 30);
        mt[i] = ((mt[i] ^ Math.imul(previous, 1566083941)) - i) >>> 0;
        i += 1;
        if (i >= 624) {
          mt[0] = mt[623];
          i = 1;
        }
      }
      mt[0] = 0x80000000;
    }

    function nextUint32() {
      if (index >= 624) {
        for (let kk = 0; kk < 624; kk += 1) {
          const nextIndex = kk + 1 >= 624 ? 0 : kk + 1;
          const mix = (mt[kk] & 0x80000000) | (mt[nextIndex] & 0x7fffffff);
          let value = mt[(kk + 397) % 624] ^ (mix >>> 1);
          if (mix % 2 !== 0) {
            value ^= 0x9908b0df;
          }
          mt[kk] = value >>> 0;
        }
        index = 0;
      }
      let value = mt[index];
      index += 1;
      value ^= value >>> 11;
      value ^= (value << 7) & 0x9d2c5680;
      value ^= (value << 15) & 0xefc60000;
      value ^= value >>> 18;
      return value >>> 0;
    }

    function next() {
      const high = nextUint32() >>> 5;
      const low = nextUint32() >>> 6;
      next.state = { mt: [...mt], index };
      return (high * 67108864 + low) / 9007199254740992;
    }

    next.getrandbits = function getrandbits(bits) {
      if (bits <= 0) {
        return 0;
      }
      if (bits <= 32) {
        const value = nextUint32() >>> (32 - bits);
        next.state = { mt: [...mt], index };
        return value;
      }
      let value = 0;
      let remaining = bits;
      let shift = 0;
      while (remaining > 0) {
        const take = Math.min(remaining, 32);
        value += (nextUint32() >>> (32 - take)) * 2 ** shift;
        shift += take;
        remaining -= take;
      }
      next.state = { mt: [...mt], index };
      return value;
    };

    next.randbelow = function randbelow(limit) {
      if (limit <= 0) {
        throw new Error("limit must be positive.");
      }
      const bits = Math.ceil(Math.log2(limit));
      let value = next.getrandbits(bits);
      while (value >= limit) {
        value = next.getrandbits(bits);
      }
      return value;
    };

    if (seed && typeof seed === "object" && Array.isArray(seed.mt)) {
      seed.mt.forEach((value, mtIndex) => {
        mt[mtIndex] = value >>> 0;
      });
      index = seed.index;
    } else {
      initByArray([seedValue]);
    }
    next.state = { mt: [...mt], index };
    return next;
  }

  function randomIndex(length, rng) {
    if (typeof rng.randbelow === "function") {
      return rng.randbelow(length);
    }
    return Math.floor(rng() * length);
  }

  function sample(values, count, rng) {
    if (count > values.length) {
      throw new Error("sample count cannot be greater than population size.");
    }
    let setSize = 21;
    if (count > 5) {
      setSize += 4 ** Math.ceil(Math.log(count * 3) / Math.log(4));
    }
    const result = new Array(count);
    if (values.length <= setSize) {
      const pool = [...values];
      for (let index = 0; index < count; index += 1) {
        const selected = randomIndex(values.length - index, rng);
        result[index] = pool[selected];
        pool[selected] = pool[values.length - index - 1];
      }
    } else {
      const selected = new Set();
      for (let index = 0; index < count; index += 1) {
        let selectedIndex = randomIndex(values.length, rng);
        while (selected.has(selectedIndex)) {
          selectedIndex = randomIndex(values.length, rng);
        }
        selected.add(selectedIndex);
        result[index] = values[selectedIndex];
      }
    }
    return result;
  }

  function choice(values, rng) {
    return values[randomIndex(values.length, rng)];
  }

  function normalizeValues(values) {
    const result = values == null ? DEFAULT_VALUES : [...values];
    return result.map((value) => Number(value)).filter((value) => Number.isFinite(value));
  }

  function calculateFitness(individual) {
    let inversions = 0;
    for (let left = 0; left < individual.length; left += 1) {
      for (let right = left + 1; right < individual.length; right += 1) {
        if (individual[left] > individual[right]) {
          inversions += 1;
        }
      }
    }
    return maxFitnessForLength(individual.length) - inversions;
  }

  function evaluatePopulation(population) {
    return population
      .map((individual) => ({
        individual: [...individual],
        fitness: calculateFitness(individual),
      }))
      .sort((left, right) => right.fitness - left.fitness);
  }

  function targetFitnessForValues(values) {
    return maxFitnessForLength(values.length);
  }

  function maxFitnessForLength(length) {
    return (length * (length - 1)) / 2;
  }

  function targetPermutationForValues(values) {
    return [...values].sort((left, right) => left - right);
  }

  function isTargetPermutation(individual, values) {
    const target = targetPermutationForValues(values);
    return individual.length === target.length && individual.every((value, index) => value === target[index]);
  }

  function countSortedPositions(individual, values) {
    const target = targetPermutationForValues(values);
    return individual.reduce((total, value, index) => total + (value === target[index] ? 1 : 0), 0);
  }

  function selectParentByTournament(evaluatedPopulation, rng, tournamentK = TOURNAMENT_K) {
    if (tournamentK < 1) {
      throw new Error("tournamentK must be at least 1.");
    }
    if (tournamentK > evaluatedPopulation.length) {
      throw new Error("tournamentK cannot be greater than population size.");
    }
    const candidates = sample(evaluatedPopulation, tournamentK, rng);
    let selected = null;
    for (const candidate of candidates) {
      if (selected == null || candidate.fitness > selected.fitness) {
        selected = candidate;
      }
    }
    return [...selected.individual];
  }

  function orderedCrossover(parentA, parentB, rng = Math.random) {
    return orderedCrossoverPair(parentA, parentB, rng)[0];
  }

  function orderedCrossoverPair(parentA, parentB, rng = Math.random) {
    const size = parentA.length;
    const [start, end] = sample(Array.from({ length: size }, (_, index) => index), 2, rng).sort((left, right) => left - right);
    const childA = new Array(size).fill(null);
    const childB = new Array(size).fill(null);

    for (let index = start; index < end; index += 1) {
      childA[index] = parentA[index];
      childB[index] = parentB[index];
    }

    function fillChild(child, donor) {
      const used = new Set(child.filter((value) => value != null));
      let parentIndex = end;
      let childIndex = end;
      while (parentIndex < size) {
        if (!used.has(donor[parentIndex])) {
          child[childIndex % size] = donor[parentIndex];
          used.add(donor[parentIndex]);
          childIndex += 1;
        }
        parentIndex += 1;
      }
      parentIndex = 0;
      while (parentIndex < end) {
        if (!used.has(donor[parentIndex])) {
          child[childIndex % size] = donor[parentIndex];
          used.add(donor[parentIndex]);
          childIndex += 1;
        }
        parentIndex += 1;
      }
    }

    fillChild(childA, parentB);
    fillChild(childB, parentA);
    return [childA, childB];
  }

  function mutateSwap(individual, rng = Math.random) {
    const result = [...individual];
    if (result.length < 2) {
      return result;
    }
    const first = randomIndex(result.length, rng);
    let second = randomIndex(result.length, rng);
    while (second === first) {
      second = randomIndex(result.length, rng);
    }
    [result[first], result[second]] = [result[second], result[first]];
    return result;
  }

  function createInitialState(options = {}) {
    const values = normalizeValues(options.values);
    const seed = options.seed ?? DEFAULT_SEED;
    const rng = makeRng(seed);
    const popSize = options.popSize ?? DEFAULT_POP_SIZE;
    const population = Array.from({ length: popSize }, () => sample(values, values.length, rng));
    const evaluated = evaluatePopulation(population);
    const best = evaluated[0];
    const worst = evaluated[evaluated.length - 1];
    return {
      values,
      population: evaluated.map((entry) => [...entry.individual]),
      generation: 0,
      bestFitness: best.fitness,
      bestIndividual: [...best.individual],
      worstFitness: worst.fitness,
      worstIndividual: [...worst.individual],
      targetFitness: targetFitnessForValues(values),
      sortedPositions: countSortedPositions(best.individual, values),
      complete: isTargetPermutation(best.individual, values),
      history: [best.fitness],
      seed,
      rngState: rng.state,
      lastOperation: "Initial population",
    };
  }

  function evolveGeneration(state) {
    const rng = makeRng(state.rngState ?? state.seed ?? DEFAULT_SEED);
    const evaluated = evaluatePopulation(state.population);
    const nextPopulation = [[...evaluated[0].individual]];

    while (nextPopulation.length < state.population.length) {
      const selectedParents = Array.from({ length: state.population.length }, () =>
        selectParentByTournament(evaluated, rng),
      );
      const parentA = choice(selectedParents, rng);
      const parentB = choice(selectedParents, rng);
      let childA;
      let childB;
      if (rng() < CROSSOVER_RATE) {
        [childA, childB] = orderedCrossoverPair(parentA, parentB, rng);
      } else {
        childA = [...parentA];
        childB = [...parentB];
      }
      if (rng() < MUTATION_RATE) {
        childA = mutateSwap(childA, rng);
      }
      if (rng() < MUTATION_RATE) {
        childB = mutateSwap(childB, rng);
      }
      nextPopulation.push(childA);
      if (nextPopulation.length < state.population.length) {
        nextPopulation.push(childB);
      }
    }

    const nextEvaluated = evaluatePopulation(nextPopulation);
    const best = nextEvaluated[0];
    const worst = nextEvaluated[nextEvaluated.length - 1];
    return {
      ...state,
      population: nextEvaluated.map((entry) => [...entry.individual]),
      generation: state.generation + 1,
      bestFitness: best.fitness,
      bestIndividual: [...best.individual],
      worstFitness: worst.fitness,
      worstIndividual: [...worst.individual],
      sortedPositions: countSortedPositions(best.individual, state.values),
      complete: isTargetPermutation(best.individual, state.values),
      history: [...state.history, best.fitness],
      rngState: rng.state,
      lastOperation: "Selection + OX crossover + swap mutation",
    };
  }

  function phaseForFrame(frameIndex) {
    const segment = frameIndex % GENERATION_FRAMES;
    if (segment < 6) {
      return Phase.SHOW;
    }
    if (segment < 12) {
      return Phase.SELECT;
    }
    if (segment < 18) {
      return Phase.CROSSOVER;
    }
    return Phase.MUTATE;
  }

  function makeRuntimeState(options = {}) {
    const simulation = createInitialState(options);
    return {
      simulation,
      autoplay: options.autoplay ?? false,
      fastMode: options.fastMode ?? false,
      completed: simulation.complete,
      frameIndex: 0,
      phase: Phase.SHOW,
      options: {
        seed: simulation.seed,
        values: [...simulation.values],
        popSize: simulation.population.length,
        maxGenerations: DEFAULT_GENERATIONS,
        tournamentK: TOURNAMENT_K,
        crossoverRate: CROSSOVER_RATE,
        mutationRate: MUTATION_RATE,
      },
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
    const frameIndex = state.frameIndex + 1;
    let simulation = state.simulation;
    if (state.autoplay && (state.fastMode || frameIndex % GENERATION_FRAMES === 0)) {
      simulation = evolveGeneration(simulation);
    }
    const completed = simulation.complete || simulation.generation >= DEFAULT_GENERATIONS;
    return {
      ...state,
      simulation,
      autoplay: completed ? false : state.autoplay,
      completed,
      frameIndex,
      phase: state.fastMode ? Phase.SHOW : phaseForFrame(frameIndex),
    };
  }

  function fitnessPercent(simulation) {
    if (simulation.targetFitness <= 0) {
      return 0;
    }
    return Math.max(0, Math.min(100, (simulation.bestFitness / simulation.targetFitness) * 100));
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

  function makeRenderLayout(width = WINDOW_WIDTH, height = WINDOW_HEIGHT) {
    return {
      titleY: 42,
      statusY: 82,
      permutationY: 122,
      bars: {
        x: 58,
        y: 184,
        width: width - 116,
        height: 188,
        panelX: 42,
        panelY: 166,
        panelWidth: width - 84,
        panelHeight: 288,
      },
      axisLabelY: 424,
      history: {
        x: 102,
        y: height - 76,
        width: width - 148,
        height: 42,
      },
    };
  }

  function drawBars(ctx, simulation, layout) {
    const { x, y, width, height, panelX, panelY, panelWidth, panelHeight } = layout.bars;
    const maxValue = Math.max(...simulation.values);
    const barGap = 8;
    const barWidth = (width - barGap * (simulation.bestIndividual.length - 1)) / simulation.bestIndividual.length;

    ctx.save();
    ctx.fillStyle = COLORS.panelAlt;
    drawRoundedRect(ctx, panelX, panelY, panelWidth, panelHeight, 8);
    ctx.fill();
    ctx.strokeStyle = COLORS.line;
    ctx.lineWidth = 2;
    ctx.stroke();

    simulation.bestIndividual.forEach((value, index) => {
      const normalized = maxValue === 0 ? 0 : value / maxValue;
      const barHeight = 34 + normalized * (height - 46);
      const bx = x + index * (barWidth + barGap);
      const by = y + height - barHeight;
      const isSortedPosition = value === index;
      ctx.fillStyle = isSortedPosition ? COLORS.accentStrong : COLORS.accent;
      drawRoundedRect(ctx, bx, by, barWidth, barHeight, 6);
      ctx.fill();
      drawText(ctx, String(value), bx + barWidth / 2, by - 16, 18, COLORS.text);
      drawText(ctx, String(index), bx + barWidth / 2, y + height + 24, 13, COLORS.muted, "500");
    });
    drawText(ctx, "poziția în cromozom", x + width / 2, layout.axisLabelY, 13, COLORS.muted, "500");
    ctx.restore();
  }

  function drawHistory(ctx, simulation, layout) {
    const { x, y, width, height } = layout.history;
    const values = simulation.history.slice(-80);
    ctx.save();
    ctx.fillStyle = COLORS.panelAlt;
    drawRoundedRect(ctx, x, y, width, height, 3);
    ctx.fill();
    ctx.strokeStyle = COLORS.line;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x, y, width, height);
    if (values.length > 1) {
      ctx.beginPath();
      values.forEach((value, index) => {
        const px = x + (width / (values.length - 1)) * index;
        const py = y + height - height * Math.max(0, Math.min(1, value / simulation.targetFitness));
        if (index === 0) {
          ctx.moveTo(px, py);
        } else {
          ctx.lineTo(px, py);
        }
      });
      ctx.strokeStyle = COLORS.warm;
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    drawText(ctx, "fitness", x - 12, y + height / 2, 12, COLORS.muted, "500", "right");
    ctx.restore();
  }

  function operationLabel(state) {
    if (state.completed || state.simulation.complete) {
      return "target reached";
    }
    if (state.fastMode) {
      return "fast evolution";
    }
    return {
      [Phase.SHOW]: "best permutation",
      [Phase.SELECT]: "tournament selection",
      [Phase.CROSSOVER]: "ordered crossover",
      [Phase.MUTATE]: "swap mutation",
    }[state.phase];
  }

  function drawRuntime(ctx, state, width = WINDOW_WIDTH, height = WINDOW_HEIGHT) {
    const simulation = state.simulation;
    const layout = makeRenderLayout(width, height);
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, width, height);

    drawText(ctx, `Generation ${simulation.generation}`, width / 2, layout.titleY, 30);
    drawText(
      ctx,
      `${operationLabel(state)}  |  ${simulation.sortedPositions}/${simulation.values.length} poziții corecte  |  ${state.autoplay ? "autoplay" : "manual"}`,
      width / 2,
      layout.statusY,
      15,
      COLORS.muted,
      "500",
    );
    drawText(ctx, simulation.bestIndividual.join("  "), width / 2, layout.permutationY, 22, COLORS.text, "700");
    drawBars(ctx, simulation, layout);
    drawHistory(ctx, simulation, layout);
    drawText(ctx, `fitness ${Math.round(fitnessPercent(simulation))}%`, width / 2, layout.history.y - 18, 13, COLORS.muted, "500");
  }

  function createCanvas(container) {
    const canvas = document.createElement("canvas");
    canvas.width = WINDOW_WIDTH;
    canvas.height = WINDOW_HEIGHT;
    canvas.setAttribute("aria-label", "Animație interactivă pentru sortarea unei permutări cu algoritm genetic");
    container.append(canvas);
    return canvas;
  }

  function parseValues(value) {
    if (!value) {
      return DEFAULT_VALUES;
    }
    return value
      .split(",")
      .map((entry) => Number.parseInt(entry.trim(), 10))
      .filter((entry) => Number.isFinite(entry));
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
    if (container.dataset.permutationReady === "true") {
      return;
    }
    container.dataset.permutationReady = "true";
    const canvas = createCanvas(container);
    const ctx = canvas.getContext("2d");
    const options = {
      autoplay: container.dataset.autoplay !== "false",
      seed: Number.parseInt(container.dataset.seed || String(DEFAULT_SEED), 10),
      values: parseValues(container.dataset.values),
      popSize: Number.parseInt(container.dataset.popSize || String(DEFAULT_POP_SIZE), 10),
    };
    let runtime = makeRuntimeState(options);
    let lastTime = 0;
    let wasActive = false;

    canvas.addEventListener("click", () => {
      if (!isDemoActive(container)) {
        return;
      }
      const simulation = evolveGeneration(runtime.simulation);
      runtime = { ...runtime, simulation, autoplay: false, completed: simulation.complete };
      drawRuntime(ctx, runtime);
    });

    window.addEventListener("keydown", (event) => {
      if (!isDemoActive(container)) {
        return;
      }
      const key = event.key.toLowerCase();
      if (key === "a") {
        runtime = { ...runtime, autoplay: !runtime.autoplay };
      } else if (key === "x") {
        runtime = { ...runtime, fastMode: !runtime.fastMode };
      } else if (key === "r") {
        runtime = makeRuntimeState({ ...options, autoplay: runtime.autoplay, fastMode: runtime.fastMode });
      } else if ((key === " " || key === "arrowright") && !runtime.autoplay) {
        const simulation = evolveGeneration(runtime.simulation);
        runtime = { ...runtime, simulation, completed: simulation.complete };
      }
    });

    function frame(timestamp) {
      const active = isDemoActive(container);
      if (active && !wasActive) {
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
    document.querySelectorAll(".permutation-demo").forEach(initDemo);
  }

  const api = {
    Phase,
    makeRng,
    calculateFitness,
    orderedCrossover,
    mutateSwap,
    selectParentByTournament,
    countSortedPositions,
    createInitialState,
    evolveGeneration,
    makeRenderLayout,
    makeRuntimeState,
    tickRuntimeState,
    isDemoActive,
  };

  if (typeof window !== "undefined") {
    window.PermutationSortDemo = api;
    window.addEventListener("DOMContentLoaded", initAll);
    window.addEventListener("load", initAll);
  }
})();
