# Exemple

Acest director conține exemplele folosite în prezentarea "Algoritmi genetici - utilizări și aplicații". Exemplele sunt ordonate de la reprezentări simple la aplicații mai apropiate de practică: permutări, parametri continui, hiperparametri ML și adaptare vizuală într-un mediu dinamic.

## 1. Sortarea numerelor

Fișier principal: `ga_permutation.py`
Notebook: `ga_permutation.ipynb`

Sortarea este folosită ca exemplu didactic de problemă combinatorială. Deși există algoritmi de sortare mult mai eficienți, reprezentarea listei ca permutare face vizibile deciziile specifice unui algoritm genetic: cum este codificat cromozomul, cum este măsurat fitness-ul și cum sunt aplicați operatorii fără a produce soluții invalide.

- gena: un număr din listă;
- cromozom: o permutare completă;
- fitness: scor care favorizează ordinea dorită;
- selecție: turneu;
- crossover: Order Crossover (OX1), pentru păstrarea unei permutări valide;
- mutație: interschimbarea a două poziții;
- elitism: păstrarea celui mai bun individ.

<details>
<summary>Configurația algoritmului</summary>

- Dimensiune populație: 50
- Număr generații: 200
- Rata de crossover: 0.9
- Rata de mutație: 0.1
- Elitism: 1 individ
- Dimensiune turneu: 3

</details>

Graficul evoluției fitness-ului poate indica pierderea diversității atunci când cel mai bun și cel mai slab individ ajung la scoruri apropiate. În acele momente, populația poate rămâne blocată într-un maxim local.

## 2. Optimizarea parametrilor continui

Notebook: `continuous_parameters_mapping.ipynb`

Acest exemplu arată cum un algoritm genetic poate optimiza parametrii continui `a`, `b` și `c` ai unei funcții pătratice. Cromozomul este un vector de valori reale, iar fitness-ul măsoară cât de bine respectă funcția comportamentul țintă.

- gena: o valoare numerică;
- cromozom: vectorul parametrilor;
- fitness: abaterea față de comportamentul dorit;
- selecție: turneu;
- crossover: recombinare aritmetică;
- mutație: perturbarea valorilor numerice.

<details>
<summary>Configurația algoritmului</summary>

- Dimensiune populație: 100
- Număr generații: 20
- Rata de mutație: 1.0
- Elitism: 1 individ
- Dimensiune turneu: 3

</details>

## 3. Optimizarea hiperparametrilor pentru clasificator ML / diabet

Notebook: `ga_and_ml_classifier.ipynb`

Exemplul folosește un algoritm genetic pentru optimizarea hiperparametrilor unui `DecisionTreeClassifier` aplicat pe setul de date Pima Indians Diabetes. Modelul de bază este folosit ca referință, iar algoritmul genetic explorează configurații alternative pentru a îmbunătăți performanța clasificării.

- gena: valoarea unui hiperparametru;
- cromozom: configurația completă a clasificatorului;
- fitness: performanța modelului pe date de validare;
- obiectiv: creșterea calității predictive față de modelul baseline;
- evaluare: acuratețe, AUC, matrice de confuzie și raport de clasificare.

Rezultatele urmărite sunt îmbunătățirea performanței generale și reducerea erorilor relevante pentru clasa pozitivă. În contextul clasificării diabetului, recall-ul pentru cazurile pozitive este o metrică importantă, deoarece fals negativele au impact practic mai mare decât fals pozitivele.

## 4. Camuflarea moliilor

Fișier principal: `moth_camouflage.py`

Acest exemplu demonstrează adaptarea unei populații într-un mediu care se modifică în timp. Fiecare individ are o culoare, iar mediul are o culoare țintă. Selecția favorizează indivizii mai apropiați de țintă, iar mutația introduce variație pentru generațiile următoare.

Simularea nu folosește crossover. Cei mai adaptați indivizi sunt păstrați și clonați, iar restul populației este înlocuit prin copii mutate. Presiunea selectivă ridicată permite adaptarea rapidă, dar poate reduce diversitatea populației.

<details>
<summary>Configurația algoritmului</summary>

- Dimensiune populație: 1024 indivizi, organizați într-o grilă 32x32
- Număr generații: nedefinit, simularea rulează continuu
- Rata de mutație: 0.01 per bit
- Presiune de selecție: 50% din populație supraviețuiește și se reproduce
- Crossover: absent

</details>

Controale utile:

- `a`: pornește sau oprește autoplay;
- `space` sau click: trece manual la faza următoare;
- `x`: activează sau dezactivează modul rapid;
- `r`: resetează simularea;
- `s`: salvează un screenshot;
- `c`: activează sau dezactivează captura cadrelor;
- `f`: comuta fullscreen.
