# Exemple

Acest director contine exemplele folosite in prezentarea "Algoritmi genetici - utilizari si aplicatii". Exemplele sunt ordonate de la reprezentari simple la aplicatii mai apropiate de practica: permutari, parametri continui, hiperparametri ML si adaptare vizuala intr-un mediu dinamic.

## 1. Sortarea numerelor

Fisier principal: `ga_permutation.py`  
Notebook: `ga_permutation.ipynb`

Sortarea este folosita ca exemplu didactic de problema combinatoriala. Desi exista algoritmi de sortare mult mai eficienti, reprezentarea listei ca permutare face vizibile deciziile specifice unui algoritm genetic: cum este codificat cromozomul, cum este masurat fitness-ul si cum sunt aplicati operatorii fara a produce solutii invalide.

- gena: un numar din lista;
- cromozom: o permutare completa;
- fitness: scor care favorizeaza ordinea dorita;
- selectie: turneu;
- crossover: Order Crossover (OX1), pentru pastrarea unei permutari valide;
- mutatie: interschimbarea a doua pozitii;
- elitism: pastrarea celui mai bun individ.

<details>
<summary>Configuratia algoritmului</summary>

- Dimensiune populatie: 50
- Numar generatii: 200
- Rata de crossover: 0.9
- Rata de mutatie: 0.1
- Elitism: 1 individ
- Dimensiune turneu: 3

</details>

Graficul evolutiei fitness-ului poate indica pierderea diversitatii atunci cand cel mai bun si cel mai slab individ ajung la scoruri apropiate. In acele momente, populatia poate ramane blocata intr-un maxim local.

## 2. Optimizarea parametrilor continui

Notebook: `continuous_parameters_mapping.ipynb`

Acest exemplu arata cum un algoritm genetic poate optimiza parametrii continui `a`, `b` si `c` ai unei functii patratice. Cromozomul este un vector de valori reale, iar fitness-ul masoara cat de bine respecta functia comportamentul tinta.

- gena: o valoare numerica;
- cromozom: vectorul parametrilor;
- fitness: abaterea fata de comportamentul dorit;
- selectie: turneu;
- crossover: recombinare aritmetica;
- mutatie: perturbarea valorilor numerice.

<details>
<summary>Configuratia algoritmului</summary>

- Dimensiune populatie: 100
- Numar generatii: 20
- Rata de mutatie: 1.0
- Elitism: 1 individ
- Dimensiune turneu: 3

</details>

## 3. Optimizarea hiperparametrilor pentru clasificator ML / diabet

Notebook: `ga_and_ml_classifier.ipynb`

Exemplul foloseste un algoritm genetic pentru optimizarea hiperparametrilor unui `DecisionTreeClassifier` aplicat pe setul de date Pima Indians Diabetes. Modelul de baza este folosit ca referinta, iar algoritmul genetic exploreaza configuratii alternative pentru a imbunatati performanta clasificarii.

- gena: valoarea unui hiperparametru;
- cromozom: configuratia completa a clasificatorului;
- fitness: performanta modelului pe date de validare;
- obiectiv: cresterea calitatii predictive fata de modelul baseline;
- evaluare: acuratete, AUC, matrice de confuzie si raport de clasificare.

Rezultatele urmarite sunt imbunatatirea performantei generale si reducerea erorilor relevante pentru clasa pozitiva. In contextul clasificarii diabetului, recall-ul pentru cazurile pozitive este o metrica importanta, deoarece fals negativele au impact practic mai mare decat fals pozitivele.

## 4. Camuflarea moliilor

Fisier principal: `moth_camouflage.py`

Acest exemplu demonstreaza adaptarea unei populatii intr-un mediu care se modifica in timp. Fiecare individ are o culoare, iar mediul are o culoare tinta. Selectia favorizeaza indivizii mai apropiati de tinta, iar mutatia introduce variatie pentru generatiile urmatoare.

Simularea nu foloseste crossover. Cei mai adaptati indivizi sunt pastrati si clonati, iar restul populatiei este inlocuit prin copii mutate. Presiunea selectiva ridicata permite adaptarea rapida, dar poate reduce diversitatea populatiei.

<details>
<summary>Configuratia algoritmului</summary>

- Dimensiune populatie: 1024 indivizi, organizati intr-o grila 32x32
- Numar generatii: nedefinit, simularea ruleaza continuu
- Rata de mutatie: 0.01 per bit
- Presiune de selectie: 50% din populatie supravietuieste si se reproduce
- Crossover: absent

</details>

Controale utile:

- `a`: porneste sau opreste autoplay;
- `space` sau click: trece manual la faza urmatoare;
- `x`: activeaza sau dezactiveaza modul rapid;
- `r`: reseteaza simularea;
- `s`: salveaza un screenshot;
- `c`: activeaza sau dezactiveaza captura cadrelor;
- `f`: comuta fullscreen.
