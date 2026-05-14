from __future__ import annotations

from dataclasses import dataclass, replace
from datetime import datetime
from enum import Enum
from math import pi, sin, sqrt
import os
from pathlib import Path
from random import Random


GRID_LEN = 32
POPULATION_SIZE = GRID_LEN * GRID_LEN
MUTATION_RATE = 0.01
WINDOW_WIDTH = 800
WINDOW_HEIGHT = 600
CHART_HISTORY_WINDOW = 512
SELECTION_FRAMES = 75
REPRODUCTION_FRAMES = 36
CAPTURE_DIR = Path(__file__).parent / "output" / "frames"

BACKGROUND = (117, 127, 73)
BORDER = (102, 83, 41)
HIGHLIGHT = (199, 203, 182)
TEXT_COLOR = (42, 41, 30)
TEXT_IMP = (144, 107, 22)


class Phase(Enum):
    SHOW = "show"
    SELECT = "select"
    REPRODUCE = "reproduce"
    FINALIZE = "finalize"


@dataclass(frozen=True)
class SimulationState:
    population: list[int]
    generation: int
    target_color: int
    average_history: list[float]
    target_history: list[int]
    distribution: list[int]
    rng_seed: int | None = None


@dataclass(frozen=True)
class RuntimeState:
    simulation: SimulationState
    phase: Phase
    autoplay: bool
    fast_mode: bool
    fullscreen: bool
    capture_enabled: bool
    frame_index: int
    phase_frame: int
    animation_order: list[int]
    capture_index: int
    status_message: str


@dataclass(frozen=True)
class SketchLayout:
    population: tuple[int, int, int, int]
    chart: tuple[int, int, int, int]
    histogram: tuple[int, int, int, int]
    grid_cell: int
    grid_gap: int
    title_x: int
    title_y: int


runtime: RuntimeState | None = None
applied_fullscreen: bool | None = None


def configure_py5_environment(
    environ: dict[str, str] | None = None,
    project_root: Path | None = None,
    java_search_roots: list[Path] | None = None,
) -> None:
    environ = os.environ if environ is None else environ
    project_root = Path(__file__).resolve().parents[2] if project_root is None else project_root

    environ.setdefault("PY5_HOME", str(project_root / ".py5-home"))
    if environ.get("JAVA_HOME"):
        return

    if java_search_roots is None:
        home = Path.home()
        java_search_roots = [
            home / "AppData" / "Local" / "Programs" / "Eclipse Adoptium",
            Path("C:/Program Files/Eclipse Adoptium"),
            Path("C:/Program Files/Java"),
        ]

    for root in java_search_roots:
        if not root.exists():
            continue
        candidates = sorted(root.glob("jdk-17*"), reverse=True)
        for candidate in candidates:
            if (candidate / "bin" / "server" / "jvm.dll").exists():
                environ["JAVA_HOME"] = str(candidate)
                return


configure_py5_environment()


def make_layout(width: int = WINDOW_WIDTH, height: int = WINDOW_HEIGHT) -> SketchLayout:
    scale = max(1.0, min(width / WINDOW_WIDTH, height / WINDOW_HEIGHT))
    chart_scale = min(scale, 1.25)
    margin = int(32 * scale)
    top = int(150 * scale)
    chart = (margin, top, int(360 * chart_scale), int(175 * chart_scale))
    histogram = (margin, int(370 * scale), int(360 * chart_scale), int(175 * chart_scale))
    right_space = width - (chart[0] + chart[2]) - margin * 3
    bottom_reserved_space = max(margin, int(80 * min(scale, 1.5)))
    vertical_space = height - top - bottom_reserved_space
    available_population_size = max(330, min(right_space, vertical_space))
    grid_gap = max(2, int(2 * scale))
    grid_cell = max(8, int((available_population_size - grid_gap * (GRID_LEN + 1) - 8) / GRID_LEN))
    population_size = grid_cell * GRID_LEN + grid_gap * (GRID_LEN + 1) + 8
    population = (width - margin - population_size, top, population_size, population_size)
    return SketchLayout(
        population=population,
        chart=chart,
        histogram=histogram,
        grid_cell=grid_cell,
        grid_gap=grid_gap,
        title_x=width // 2,
        title_y=42,
    )


def make_chart_text_layout(x: int, y: int, width: int) -> dict[str, float]:
    return {
        "title_x": x + width / 2,
        "title_y": y + 24,
        "target_x": x + width / 2,
        "target_y": y + 52,
    }


def chart_visible_values(values: list[float] | list[int], window_size: int = CHART_HISTORY_WINDOW) -> list[float] | list[int]:
    if len(values) <= window_size:
        return values
    return values[-window_size:]


def operation_label(phase: Phase, fast_mode: bool = False) -> str:
    if fast_mode:
        return "Fast evolution"
    return {
        Phase.SHOW: "Showing generation",
        Phase.SELECT: "Selecting best adapted moths",
        Phase.REPRODUCE: "Replacing weak moths",
        Phase.FINALIZE: "Applying mutations",
    }[phase]


def operation_label_position(layout: SketchLayout) -> tuple[float, float]:
    x, y, width, _ = layout.population
    return x + width / 2, y - 28


def compute_average_color(population: list[int]) -> float:
    if not population:
        return 0.0
    return sum(population) / len(population)


def compute_distribution(population: list[int]) -> list[int]:
    distribution = [0] * 256
    for value in population:
        distribution[value] += 1
    return distribution


def apply_selection(population: list[int], target_color: int) -> list[int]:
    return sorted(population, key=lambda value: abs(target_color - value))


def compute_selection_order(population: list[int], target_color: int) -> list[int]:
    return sorted(range(len(population)), key=lambda index: abs(target_color - population[index]))


def mutate_value(value: int, mutation_rate: float, rng: Random) -> int:
    mutated = value
    for bit in range(8):
        if rng.random() < mutation_rate:
            mutated ^= 1 << bit
    return mutated


def clone_and_mutate_population(
    population: list[int],
    mutation_rate: float = MUTATION_RATE,
    rng_seed: int | None = None,
) -> list[int]:
    rng = Random(rng_seed)
    half = len(population) // 2
    next_population = list(population)
    for index in range(half):
        next_population[index + half] = mutate_value(population[index], mutation_rate, rng)
    return next_population


def target_color_for_generation(generation: int) -> int:
    wave = (sin((pi / 128.0) * generation) + 1.0) * 127.5
    return max(0, min(255, int(wave)))


def create_initial_state(grid_len: int = GRID_LEN, rng_seed: int | None = None) -> SimulationState:
    rng = Random(rng_seed)
    population = [rng.randrange(256) for _ in range(grid_len * grid_len)]
    target_color = 128
    return SimulationState(
        population=population,
        generation=1,
        target_color=target_color,
        average_history=[compute_average_color(population)],
        target_history=[target_color],
        distribution=compute_distribution(population),
        rng_seed=rng_seed,
    )


def finalize_generation(state: SimulationState) -> SimulationState:
    selected = apply_selection(state.population, state.target_color)
    mutation_seed = None if state.rng_seed is None else state.rng_seed + state.generation
    population = clone_and_mutate_population(selected, MUTATION_RATE, mutation_seed)
    next_generation = state.generation + 1
    next_target = target_color_for_generation(next_generation)
    return replace(
        state,
        population=population,
        generation=next_generation,
        target_color=next_target,
        average_history=[*state.average_history, compute_average_color(population)],
        target_history=[*state.target_history, next_target],
        distribution=compute_distribution(population),
    )


def make_runtime_state(
    rng_seed: int | None = None,
    autoplay: bool = False,
    fast_mode: bool = False,
    capture_enabled: bool = False,
) -> RuntimeState:
    simulation = create_initial_state(rng_seed=rng_seed)
    return RuntimeState(
        simulation=simulation,
        phase=Phase.SHOW,
        autoplay=autoplay,
        fast_mode=fast_mode,
        fullscreen=False,
        capture_enabled=capture_enabled,
        frame_index=0,
        phase_frame=0,
        animation_order=list(range(len(simulation.population))),
        capture_index=0,
        status_message="",
    )


def begin_selection_phase(state: RuntimeState) -> RuntimeState:
    order = compute_selection_order(state.simulation.population, state.simulation.target_color)
    return replace(state, phase=Phase.SELECT, phase_frame=0, animation_order=order)


def advance_phase(state: RuntimeState) -> RuntimeState:
    if state.phase is Phase.SHOW:
        return begin_selection_phase(state)
    if state.phase is Phase.SELECT:
        return replace(state, phase=Phase.REPRODUCE, phase_frame=0)
    if state.phase is Phase.REPRODUCE:
        return replace(state, phase=Phase.FINALIZE, phase_frame=0)
    simulation = finalize_generation(state.simulation)
    return replace(
        state,
        simulation=simulation,
        phase=Phase.SHOW,
        phase_frame=0,
        animation_order=list(range(len(simulation.population))),
    )


def reset_runtime_state(state: RuntimeState | None = None, rng_seed: int | None = None) -> RuntimeState:
    autoplay = True if state is None else state.autoplay
    fast_mode = False if state is None else state.fast_mode
    return make_runtime_state(rng_seed=rng_seed, autoplay=autoplay, fast_mode=fast_mode)


def toggle_fast_mode(state: RuntimeState) -> RuntimeState:
    return replace(state, fast_mode=not state.fast_mode, phase=Phase.SHOW, phase_frame=0)


def toggle_fullscreen_mode(state: RuntimeState) -> RuntimeState:
    return replace(state, fullscreen=not state.fullscreen)


def tick_runtime_state(state: RuntimeState) -> RuntimeState:
    state = replace(state, frame_index=state.frame_index + 1, phase_frame=state.phase_frame + 1)
    if not state.autoplay:
        return state
    if state.fast_mode:
        simulation = finalize_generation(state.simulation)
        return replace(
            state,
            simulation=simulation,
            phase=Phase.SHOW,
            phase_frame=0,
            animation_order=list(range(len(simulation.population))),
        )
    if state.phase is Phase.SHOW and state.phase_frame >= 45:
        return advance_phase(state)
    if state.phase is Phase.SELECT and state.phase_frame >= SELECTION_FRAMES:
        return advance_phase(state)
    if state.phase is Phase.REPRODUCE and state.phase_frame >= REPRODUCTION_FRAMES:
        return advance_phase(state)
    if state.phase is Phase.FINALIZE and state.phase_frame >= REPRODUCTION_FRAMES:
        return advance_phase(state)
    return state


def draw_population_panel(py5, state: RuntimeState, x: int, y: int, cell: int, gap: int) -> None:
    simulation = state.simulation
    panel_size = cell * GRID_LEN + gap * (GRID_LEN + 1) + 8
    py5.stroke(*BORDER)
    py5.stroke_weight(8)
    py5.fill(simulation.target_color)
    py5.rect(x + 4, y + 4, panel_size, panel_size)
    py5.no_stroke()
    offset = 8 + gap

    selection_progress = 0.0
    if state.phase is Phase.SELECT:
        selection_progress = min(state.phase_frame / SELECTION_FRAMES, 1.0)

    for target_index in range(len(simulation.population)):
        source_index = state.animation_order[target_index] if state.phase is Phase.SELECT else target_index
        source_col = source_index % GRID_LEN
        source_row = source_index // GRID_LEN
        target_col = target_index % GRID_LEN
        target_row = target_index // GRID_LEN
        col = source_col + (target_col - source_col) * selection_progress
        row = source_row + (target_row - source_row) * selection_progress
        value = simulation.population[source_index]
        py5.fill(value)
        py5.rect(x + (cell + gap) * col + offset, y + (cell + gap) * row + offset, cell, cell)

    if state.phase in {Phase.REPRODUCE, Phase.FINALIZE}:
        alpha = min(state.phase_frame / REPRODUCTION_FRAMES, 1.0)
        if state.phase is Phase.FINALIZE:
            alpha = 1.0 - alpha
        py5.fill(simulation.target_color, alpha * 255)
        py5.no_stroke()
        py5.rect(x + 8, y + 8 + panel_size / 2, panel_size - 8, panel_size / 2 - 4)


def draw_average_chart(py5, x: int, y: int, width: int, height: int, state: SimulationState) -> None:
    text_layout = make_chart_text_layout(x, y, width)
    py5.stroke(*BORDER)
    py5.stroke_weight(6)
    py5.fill(*HIGHLIGHT)
    py5.rect(x, y, width, height)
    py5.fill(*TEXT_COLOR)
    py5.text_size(24)
    py5.text("Average Color", text_layout["title_x"], text_layout["title_y"])
    py5.text_size(13)
    py5.text("0", x + 30, y + height - 28)
    py5.text("255", x + 34, y + 82)
    py5.fill(*TEXT_IMP)
    py5.text(f"Target Color: {state.target_color}", text_layout["target_x"], text_layout["target_y"])

    plot_x = x + 58
    plot_y = y + 82
    plot_w = width - 86
    plot_h = height - 114
    draw_line(py5, chart_visible_values(state.target_history), plot_x, plot_y, plot_w, plot_h, TEXT_IMP)
    draw_line(py5, chart_visible_values(state.average_history), plot_x, plot_y, plot_w, plot_h, TEXT_COLOR)


def draw_line(py5, values: list[float], x: float, y: float, width: float, height: float, color: tuple[int, int, int]) -> None:
    if len(values) < 2:
        return
    py5.no_fill()
    py5.stroke(*color)
    py5.stroke_weight(3)
    py5.begin_shape()
    for index, value in enumerate(values):
        px = x + (width / (len(values) - 1)) * index
        py = y + height - height * (value / 255.0)
        py5.vertex(px, py)
    py5.end_shape()


def draw_distribution_histogram(py5, x: int, y: int, width: int, height: int, state: SimulationState) -> None:
    py5.stroke(*BORDER)
    py5.stroke_weight(6)
    py5.fill(*HIGHLIGHT)
    py5.rect(x, y, width, height)
    py5.fill(*TEXT_COLOR)
    py5.text_size(28)
    py5.text("Color Distribution", x + width / 2, y + 34)

    plot_x = x + 28
    plot_y = y + 82
    plot_w = width - 56
    plot_h = height - 120
    target_x = plot_x + plot_w * (state.target_color / 255.0)
    py5.no_stroke()
    py5.fill(*TEXT_IMP)
    py5.rect(target_x, plot_y, max(2, plot_w / 256), plot_h)
    py5.text_size(16)
    py5.text("Target Color", min(max(target_x, x + 86), x + width - 86), y + 62)
    py5.fill(*TEXT_COLOR)
    bar_w = plot_w / 256
    max_height = max(1.0, sqrt(max(state.distribution)))
    for index, count in enumerate(state.distribution):
        bar_h = plot_h * (sqrt(count) / max_height)
        py5.rect(plot_x + index * bar_w, plot_y + plot_h - bar_h, max(1, bar_w), bar_h)
    py5.text("0", x + 30, y + height - 24)
    py5.text("255", x + width - 34, y + height - 24)


def draw_status_text(py5, state: RuntimeState, layout: SketchLayout) -> None:
    py5.fill(*TEXT_COLOR)
    py5.text_size(34)
    py5.text(f"Generation {state.simulation.generation}", layout.title_x, layout.title_y)
    py5.text_size(14)
    mode = "autoplay" if state.autoplay else "manual"
    speed = "fast on" if state.fast_mode else "fast off"
    capture = "capture on" if state.capture_enabled else "capture off"
    py5.text(f"{mode}  |  {speed}  |  {state.phase.value}  |  {capture}", layout.title_x, layout.title_y + 36)
    if state.status_message:
        py5.fill(*TEXT_IMP)
        py5.text(state.status_message, layout.title_x, layout.title_y + 58)


def draw_operation_label(py5, state: RuntimeState, layout: SketchLayout) -> None:
    label = operation_label(state.phase, state.fast_mode)
    if not label:
        return
    x, y = operation_label_position(layout)
    py5.fill(*TEXT_COLOR)
    py5.text_size(max(16, int(20 * min(py5.width / WINDOW_WIDTH, py5.height / WINDOW_HEIGHT))))
    py5.text(label, x, y)


def save_capture_frame(py5, state: RuntimeState, single: bool = False) -> RuntimeState:
    CAPTURE_DIR.mkdir(parents=True, exist_ok=True)
    if single:
        filename = f"screenshot_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png"
        py5.save_frame(str(CAPTURE_DIR / filename))
        return replace(state, status_message=f"Saved {filename}")
    filename = f"frame_{state.capture_index + 1:06d}.png"
    py5.save_frame(str(CAPTURE_DIR / filename))
    return replace(state, capture_index=state.capture_index + 1)


def apply_window_mode(py5, state: RuntimeState) -> None:
    if state.fullscreen:
        py5.window_move(0, 0)
        py5.window_resize(py5.display_width, py5.display_height)
        return

    window_x = max(0, (py5.display_width - WINDOW_WIDTH) // 2)
    window_y = max(0, (py5.display_height - WINDOW_HEIGHT) // 2)
    py5.window_resize(WINDOW_WIDTH, WINDOW_HEIGHT)
    py5.window_move(window_x, window_y)


def configure_window_policy(py5) -> None:
    py5.window_resizable(False)


def settings() -> None:
    import py5

    py5.size(WINDOW_WIDTH, WINDOW_HEIGHT)


def setup() -> None:
    global applied_fullscreen, runtime
    import py5

    py5.frame_rate(60)
    py5.text_align(py5.CENTER, py5.CENTER)
    configure_window_policy(py5)
    runtime = make_runtime_state()
    applied_fullscreen = runtime.fullscreen


def draw() -> None:
    global applied_fullscreen, runtime
    import py5

    if runtime is None:
        runtime = make_runtime_state()
    if applied_fullscreen != runtime.fullscreen:
        apply_window_mode(py5, runtime)
        applied_fullscreen = runtime.fullscreen
    layout = make_layout(py5.width, py5.height)
    py5.background(*BACKGROUND)
    draw_status_text(py5, runtime, layout)
    draw_operation_label(py5, runtime, layout)
    pop_x, pop_y, _, _ = layout.population
    draw_population_panel(py5, runtime, pop_x, pop_y, layout.grid_cell, layout.grid_gap)
    chart_x, chart_y, chart_w, chart_h = layout.chart
    draw_average_chart(py5, chart_x, chart_y, chart_w, chart_h, runtime.simulation)
    hist_x, hist_y, hist_w, hist_h = layout.histogram
    draw_distribution_histogram(py5, hist_x, hist_y, hist_w, hist_h, runtime.simulation)
    if runtime.capture_enabled:
        runtime = save_capture_frame(py5, runtime)
    runtime = tick_runtime_state(runtime)


def mouse_clicked() -> None:
    global runtime
    if runtime is not None and not runtime.autoplay:
        runtime = advance_phase(runtime)


def key_pressed() -> None:
    global runtime
    import py5

    if runtime is None:
        runtime = make_runtime_state()
    key = str(py5.key).lower()
    if key == "a":
        runtime = replace(runtime, autoplay=not runtime.autoplay, status_message="")
    elif key == "r":
        runtime = reset_runtime_state(runtime)
    elif key == "c":
        CAPTURE_DIR.mkdir(parents=True, exist_ok=True)
        runtime = replace(runtime, capture_enabled=not runtime.capture_enabled, status_message="")
    elif key == "s":
        runtime = save_capture_frame(py5, runtime, single=True)
    elif key == "x":
        runtime = toggle_fast_mode(runtime)
    elif key == "f":
        runtime = toggle_fullscreen_mode(runtime)
    elif key == " " and not runtime.autoplay:
        runtime = advance_phase(runtime)


if __name__ == "__main__":
    import py5

    py5.run_sketch()
