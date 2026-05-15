# Exemple

Acest director contine exemplele folosite pentru prezentarea "Algoritmi genetici - utilizari si aplicatii". Scopul lor este didactic: fiecare exemplu evidentiaza alta reprezentare a solutiei si alta forma de fitness.

## Sortarea numerelor

Fisier principal: `ga_permutation.py`  
Notebook: `ga_permutation.ipynb`

Acesta este un exemplu intentionat simplificat. Sortarea are algoritmi clasici mult mai buni, dar exemplul ramane util daca privim lista de numere ca pe o permutare.

- gena: un numar din lista;
- cromozom: o permutare completa;
- fitness: scorul care favorizeaza ordinea dorita;
- crossover: ordered crossover, pentru a pastra o permutare valida;
- mutatie: interschimbarea a doua pozitii.

## Optimizarea parametrilor unei functii patratice

Notebook: `continuous_parameters_mapping.ipynb`

Acest exemplu arata cum un algoritm genetic poate optimiza parametrii continui `a`, `b` si `c` ai unei functii patratice.

- gena: o valoare numerica;
- cromozom: vectorul parametrilor;
- fitness: cat de bine respecta functia comportamentul dorit;
- mutatie: modificari mici ale parametrilor.

## Camuflarea moliilor

Fisier principal: `moth_camouflage.py`

Acest exemplu demonstreaza cum o populatie poate evolua in timp ce mediul se schimba. Fiecare individ are o culoare, iar mediul are o culoare tinta. Selectia favorizeaza indivizii mai apropiati de tinta, iar mutatia produce variatie.

Chiar daca exista momente in care populatia este neadaptata, in cateva generatii poate reveni spre mediu. Exemplul este util pentru a vizualiza presiunea selectiva, adaptarea si distributia populatiei.

Controale utile:

- `a`: porneste/opreste autoplay;
- `space` sau click: trece manual la faza urmatoare;
- `x`: activeaza/dezactiveaza modul rapid;
- `r`: reseteaza simularea;
- `s`: salveaza un screenshot;
- `c`: activeaza/dezactiveaza captura cadrelor;
- `f`: comuta fullscreen.

## XGBoost si Iris

Acest exemplu este pastrat intentionat ca placeholder.

Discutia mentioneaza un exemplu real cu XGBoost si setul de date Iris, dar cerintele trebuie clarificate inainte de integrare. Dupa clarificare, exemplul poate optimiza hiperparametri, selectia de trasaturi sau alta componenta a pipeline-ului ML.
