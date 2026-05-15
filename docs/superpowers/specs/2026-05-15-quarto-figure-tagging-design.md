# Quarto Figure Tagging Design For `examples/`

## Context

Projectul conține exemple în `examples/` care produc figuri ce trebuie referite din `manuscript.qmd`.

Exemplele care intră în acest flux sunt notebook-urile Jupyter, în ordinea existentă din folder:

1. `continuous_parameters_mapping.ipynb`
2. `ga_and_ml_classifier.ipynb`
3. `ga_permutation.ipynb`

Fișierul `moth_camouflage.py` este exclus din acest pas.

## Goal

Fiecare figură relevantă generată de notebook-uri trebuie să poată fi:

- numerotată automat de Quarto;
- referită din articol prin `@fig-...`;
- însoțită de caption clar;
- extensibilă la cazurile în care o singură celulă produce mai multe figuri.

## Decision

Vom standardiza etichetarea figurilor la nivelul celulei care produce output-ul grafic, folosind opțiunile Quarto pentru Jupyter:

- `#| label: fig-...`
- `#| fig-cap: "..."`  
- `#| fig-alt: "..."` unde este util pentru accesibilitate și claritate

Pentru celule care produc mai multe figuri:

- vom folosi tot opțiunile Quarto la nivel de celulă;
- dacă figurile trebuie tratate separat, fiecare va avea propria celulă;
- dacă figurile trebuie tratate ca grup logic, vom folosi `fig-cap` împreună cu `fig-subcap` și, dacă este nevoie, opțiuni de layout precum `layout-ncol`.

## Why This Approach

Aceasta este abordarea recomandată explicit de documentația Quarto pentru figuri generate de code cells în notebook-uri Jupyter.

Avantaje:

- caption-ul și identificatorul stau lângă codul care produce figura;
- rezultatul este direct compatibil cu cross-reference-urile Quarto;
- convenția este uniformă pentru toate notebook-urile;
- suportă natural cazurile cu output multiplu;
- evită folosirea `tags` ca mecanism impropriu pentru numerotare și caption.

Nu vom folosi `tags` de notebook cell pentru această problemă. `tags` rămân metadata generică de notebook, nu mecanism de referențiere a figurilor.

## Conventions

### Labeling

- toate figurile referibile vor avea `label` cu prefixul obligatoriu `fig-`;
- etichetele vor fi descriptive și stabile;
- prefixul etichetei va reflecta notebook-ul sursă.

Exemple de stil:

- `fig-continuous-final-population`
- `fig-ml-baseline-confusion-matrix`
- `fig-permutation-fitness-history`

### Captions

- `fig-cap` va descrie exact ce arată figura, nu doar tipul de grafic;
- formulările vor fi potrivite pentru citare în articol;
- unde o figură este compusă, `fig-cap` descrie ansamblul, iar `fig-subcap` descrie fiecare componentă.

### Alt Text

- `fig-alt` va fi adăugat pentru figurile care ajung în articol;
- textul va descrie semantic figura, nu doar faptul că este un grafic.

## Scope Of Edits

Pentru fiecare notebook selectat:

1. identificăm celulele care produc figurile relevante pentru articol;
2. adăugăm opțiunile Quarto la nivel de celulă;
3. păstrăm codul de calcul și vizualizare neschimbat, cu excepția restructurării minime necesare pentru separarea logică a figurilor;
4. randăm notebook-ul cu Quarto pentru verificare;
5. confirmăm că figurile apar cu caption și pot fi referite.

## Verification

Pentru fiecare notebook modificat, verificarea minimă este:

1. render cu Quarto;
2. inspecție a HTML-ului generat pentru prezența figurii și a caption-ului;
3. confirmare că identificatorul rezultat este de forma `fig-...`.

## Implementation Order

Notebook-urile vor fi tratate în ordinea din `examples/`, excluzând fișierul Python:

1. `continuous_parameters_mapping.ipynb`
2. `ga_and_ml_classifier.ipynb`
3. `ga_permutation.ipynb`
