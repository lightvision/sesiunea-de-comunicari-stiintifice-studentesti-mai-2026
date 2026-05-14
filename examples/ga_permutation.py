"""
Genetic Algorithm (GA) Implementation for Permutation-Based Problems.

This module provides a flexible framework for running a Genetic Algorithm
using custom-defined fitness and generator functions. It is specifically
optimized for problems where individuals are represented as permutations
(e.g., TSP, Scheduling), utilizing Ordered Crossover (OX1) and Swap Mutation
to maintain valid genetic structures.

Key Components:
    - Genetic Engine: The `run_ga` function manages the evolutionary loop.
    - Custom Types: `FitnessFunc` and `GeneratorFunc` allow for easy
      adaptation to different problem domains via dependency injection.
    - Operators: Includes standard permutation operators such as
      Ordered Crossover and Swap Mutation.

Example:
    To run the algorithm, define both a 'generator_func' to initialize
    individuals and a 'fitness_func' to evaluate them, then call `run_ga()`.
    The algorithm supports both maximization and minimization via the
    `reverse` parameter.


Author :  Marius-Florinel Ionel <marius.ionel@s.utm.ro>
Author: Cristina-Mirela Done <cristina.done@s.utm.ro>

Date   : 2026-01-11
"""

import random
import math
from typing import Callable

import matplotlib.pyplot as plt
from matplotlib.ticker import MaxNLocator

type FitnessFunc = Callable[[list | str], float]
"""
A pluggable function to evaluate a single individual (chromosome).

Args:
    individual (list | str): The genetic representation of an individual, 
        provided either as a sequence of integers or a raw string.

Returns:
    float: A numerical score representing the individual's performance. 
        Note: This function is optimization-agnostic; it only computes a 
        raw value and does not define whether higher or lower scores 
        are preferable.
"""

type GeneratorFunc = Callable[[], list | str]
"""
A factory function to create a new individual for the initial population.

Returns:
    list | str: A new individual, represented as a permutation list 
        or a string, depending on the problem domain.
"""


def calculate_fitness(individual: list[int] | str) -> float:
    """
        Calculates a numerical score for an individual based on a positional base system.

        This function treats the individual as a sequence of digits in a specific
        number system, where each position has a weight defined by the power of BASE.
        This is an artificial fitness function for demonstration purposes, where
        the goal is to sort the numbers in ascending order to maximize fitness.

        Args:
            individual (list[int] | str): The chromosome to evaluate, represented
                as a sequence of values or characters.

        Returns:
            float: The calculated fitness score.
    """
    # Ensure _BASE is accessible; it's set in main()
    global _BASE
    return sum(float(val) * (_BASE ** i) for i, val in enumerate(individual))


def generate_population() -> list[int]:
    """
        Generates a new individual by randomly shuffling the global VALUES list.

        This is the default implementation of a GeneratorFunc, creating a
        random permutation of all elements available in the problem domain.

        Returns:
            list[int]: A new individual as a shuffled list of integers.
    """
    return random.sample(_VALUES, len(_VALUES))


def ordered_crossover(p1: list, p2: list) -> list:
    """
    Produce a valid permutation child using Ordered Crossover (OX1).

    Args:
        p1: First parent permutation.
        p2: Second parent permutation.

    Returns:
        A child permutation built from both parents.
    """
    size = len(p1)
    start, end = sorted(random.sample(range(size), 2))

    child = [-1] * size
    child[start:end + 1] = p1[start:end + 1]

    remaining_genes = [item for item in p2 if item not in child]
    remaining_index = 0
    for i in range(size):
        if child[i] == -1:
            child[i] = remaining_genes[remaining_index]
            remaining_index += 1
    return child


def mutate_swap(individual: list):
    """
    Performs a mutation by swapping two random genes (Swap Mutation).

    This method is tailored for permutation-based representations. It randomly
    selects two unique positions in the individual and swaps their values,
    ensuring the permutation property remains valid without introducing duplicates.

    Process:
    1. Selects two unique indices using a uniform distribution.
    2. Swaps the elements at these indices in-place.

    Args:
        individual (list): The chromosome to be mutated, represented as a list.

    Returns:
        None: The list is modified in-place.
    """
    idx1, idx2 = random.sample(range(len(individual)), 2)
    individual[idx1], individual[idx2] = individual[idx2], individual[idx1]


def select_parent_by_tournament(
        evaluated_population: list[tuple[float, list | str]],
        tournament_k: int = 3,
        reverse: bool = True) -> list | str:
    """
    Select a parent from the current population using tournament selection.

    Args:
        evaluated_population: Population paired with fitness values.
        tournament_k: Number of sampled candidates in one tournament.
        reverse: If True, select the candidate with the highest fitness.

    Returns:
        The selected individual.
    """
    tournament_candidates = random.sample(evaluated_population, tournament_k)
    selected = max(tournament_candidates, key=lambda candidate: candidate[0]) if reverse else min(
        tournament_candidates, key=lambda candidate: candidate[0]
    )
    return selected[1]


def plot_fitness_history(
        fitness_history: list[tuple[float, list[int] | str, float, list[int] | str]],
        target_fitness: float,
        is_maximization: bool = True) -> None:
    """
    Plot the best fitness score found in each generation.

    Args:
        fitness_history: Sequence containing best and worst fitness values
            returned by ``run_ga``.
        target_fitness: Known optimal fitness used as a reference line.
        is_maximization: True if the problem is maximization, False for minimization.
    """
    generations = list(range(len(fitness_history)))
    best_fitness_scores = [best_fitness for best_fitness, _, _, _ in fitness_history]
    worst_fitness_scores = [worst_fitness for _, _, worst_fitness, _ in fitness_history]

    plt.figure(figsize=(10, 5))
    plt.plot(generations, best_fitness_scores, label="Best fitness")
    plt.plot(generations, worst_fitness_scores, label="Worst fitness")
    overview_axis = plt.gca()
    overview_axis.xaxis.set_major_locator(MaxNLocator(integer=True))
    overview_axis.set_yscale("log")

    target_generation = None
    if target_fitness is not None:
        for gen, best_fitness in enumerate(best_fitness_scores):
            if (is_maximization and best_fitness >= target_fitness) or \
               (not is_maximization and best_fitness <= target_fitness):
                target_generation = gen
                break

    if target_generation is not None:
        overview_axis.axhline(
            target_fitness,
            linestyle="--",
            label=f"Target fitness (reached at generation {target_generation})",
        )
        overview_axis.axvline(
            target_generation,
            linestyle=":",
            color="gray",
            label=f"Target generation: {target_generation}",
        )
    else:
        overview_axis.axhline(
            target_fitness,
            linestyle="--",
            label="Target fitness (not reached)",
        )

    overview_axis.set_title("Fitness evolution across generations")
    overview_axis.set_xlabel("Generation")
    overview_axis.set_ylabel("Fitness")
    overview_axis.grid(True)
    overview_axis.legend()
    plt.tight_layout()
    plt.show()


def run_ga(
        pop_size: int = 100, # Default to 100 for better diversity
        generations: int = 500, # Default to 500 for longer evolution
        elitism: int = 1,
        tournament_k: int = 3,
        crossover_rate: float = 0.9,
        mutation_rate: float = 0.1,
        min_max_fitness: float = 0.0, # Target fitness for early stopping
        verbose: bool = True,
        reverse: bool = True, # True for maximization, False for minimization
        generator_func: GeneratorFunc = generate_population,
        fitness_func: FitnessFunc = calculate_fitness) -> list[tuple[float, list | str, float, list | str]]:
    """
    Executes the Genetic Algorithm (GA) to find an optimal solution.

    This function orchestrates the evolution process, including initial population
    generation, selection, crossover, mutation, and elitism across multiple generations.

    Args:
        pop_size (int): The number of individuals in the population. Defaults to 100.
        generations (int): The maximum number of evolutionary cycles. Defaults to 500.
        elitism (int): The number of top individuals to carry over to the next
            generation without changes. Defaults to 1.
        tournament_k (int): Number of candidates participating in each tournament.
            Defaults to 3.
        crossover_rate (float): Probability of applying crossover to two selected
            parents. Defaults to 0.9.
        mutation_rate (float): Probability of mutating the produced child.
            Defaults to 0.1.
        min_max_fitness (float): A target fitness threshold for early stopping.
            Defaults to 0.0.
        verbose (bool): If True, prints progress and best fitness for each generation.
            Defaults to True.
        reverse (bool): If True, sorts the population in descending order (maximization).
            If False, sorts in ascending order (minimizare). Defaults to True.
        generator_func (GeneratorFunc): The function used to initialize individuals.
            Defaults to generate_population.
        fitness_func (FitnessFunc): The function used to score individuals.
            Defaults to calculate_fitness.

    Returns:
        list[tuple[float, list | str, float, list | str]]: A history containing
            the best and worst fitness scores together with their corresponding
            individuals for each generation.

    Raises:
        ValueError: If tournament_k is invalid for the current population size.
    """

    if tournament_k < 1:
        raise ValueError("tournament_k must be at least 1.")
    if tournament_k > pop_size:
        raise ValueError("tournament_k cannot be greater than pop_size.")
    if not 0.0 <= crossover_rate <= 1.0:
        raise ValueError("crossover_rate must be between 0.0 and 1.0.")
    if not 0.0 <= mutation_rate <= 1.0:
        raise ValueError("mutation_rate must be between 0.0 and 1.0.")

    fitness_hist = []

    # Initialize the population using the provided generator function
    population = [generator_func() for _ in range(pop_size)]

    # Initial evaluation and sorting of the starting population
    evaluated_population = [(fitness_func(ind), ind) for ind in population]
    evaluated_population.sort(key=lambda x: x[0], reverse=reverse)

    # Reconstruct population list ordered by fitness performance
    population = [ind for score, ind in evaluated_population]

    for generation in range(generations):
        new_population = population[:elitism] # Elitism: carry over top individuals

        while len(new_population) < pop_size:
            parent1 = select_parent_by_tournament(
                evaluated_population,
                tournament_k=tournament_k,
                reverse=reverse,
            )
            parent2 = select_parent_by_tournament(
                evaluated_population,
                tournament_k=tournament_k,
                reverse=reverse,
            )

            child = []
            if random.random() < crossover_rate:
                child = ordered_crossover(list(parent1), list(parent2))
            else:
                # If no crossover, one parent (parent1) is chosen as the child
                child = list(parent1)

            if random.random() < mutation_rate:
                mutate_swap(child)

            new_population.append(child)

        # Replace the old population with the newly evolved one
        population = new_population

        # EVALUATION: Score the new individuals
        evaluated_population: list[tuple[float, list | str]] = [
            (fitness_func(ind), ind) for ind in population
        ]

        # SORTING: Order the population based on the optimization direction (reverse)
        evaluated_population.sort(key=lambda x: x[0], reverse=reverse)

        # Identify the best and worst performers of the current generation
        current_best_fitness, current_best_individual = evaluated_population[0]
        current_worst_fitness, current_worst_individual = evaluated_population[-1]

        if verbose:
            print(
                f"Gen {generation}: Best individual = {current_best_individual}; Best Fitness = {current_best_fitness}")

        # Store both extremes of this generation in history
        fitness_hist.append((
            float(current_best_fitness),
            list(current_best_individual) if isinstance(current_best_individual, list) else current_best_individual,
            float(current_worst_fitness),
            list(current_worst_individual) if isinstance(current_worst_individual, list) else current_worst_individual,
        ))

        # EARLY STOPPING: Exit if the target fitness threshold is reached
        target_reached = current_best_fitness >= min_max_fitness if reverse else current_best_fitness <= min_max_fitness
        if target_reached:
            if verbose:
                print(f"Target fitness {min_max_fitness} reached at generation {generation}.")
            break

        # Refresh the population list for the next iteration, ordered by fitness
        population = [ind for score, ind in evaluated_population]

    return fitness_hist


def main() -> None:
    global _VALUES, _BASE, _MAX_FITNESS

    random.seed(42)

    _VALUES = [10,9, 8, 7, 6, 5, 4, 3, 2, 1, 0]
    # For a positional base system with values from 0 to N, the base should be N+1.
    # Here, max(_VALUES) is 25, so the base is 26.
    _BASE = max(_VALUES) + 1

    # The target sorted list for maximization would be [0, 1, ..., 25].
    # Calculate _MAX_FITNESS based on this sorted list and the corrected _BASE.
    sorted_values_for_max_fitness = sorted(_VALUES) # This will be [0, 1, ..., 25]
    _MAX_FITNESS = sum(float(val) * (_BASE ** i) for i, val in enumerate(sorted_values_for_max_fitness))

    generation_count = 500 # Adjusted for potentially longer convergence
    population_size = 10 # Adjusted for better diversity
    elitism_count = 1
    tournament_k = 3
    crossover_rate = 0.9
    mutation_rate = 0.1

    is_maximization_problem = True # Based on the calculate_fitness logic, higher is better

    print("Running Genetic Algorithm with permutation-specific operators...")
    fitness_history = run_ga(
        pop_size=population_size,
        generations=generation_count,
        elitism=elitism_count,
        tournament_k=tournament_k,
        crossover_rate=crossover_rate,
        mutation_rate=mutation_rate,
        min_max_fitness=_MAX_FITNESS, # Use the calculated max fitness as target
        verbose=True, # Set to True to see generation-by-generation progress
        reverse=is_maximization_problem,
        fitness_func=calculate_fitness
    )

    if fitness_history:
        # Determine the best individual based on whether it's a maximization or minimization problem
        if is_maximization_problem:
            best_individual_data = max(fitness_history, key=lambda x: x[0])
        else:
            best_individual_data = min(fitness_history, key=lambda x: x[0])

        final_score = best_individual_data[0]
        final_solution = best_individual_data[1]
        print(f"\n--- GA Finished ---")
        print(f"Best solution found: {final_solution}")
        print(f"With fitness score: {final_score}")
        print(f"Total generations run: {len(fitness_history)}")

        plot_fitness_history(fitness_history, _MAX_FITNESS, is_maximization_problem)
    else:
        print("No fitness history recorded.")


if __name__ == '__main__':
    main()
