# Algoritmi genetici - utilizari si aplicatii

Acest proiect a fost creat pentru Sesiunea de Comunicari Stiintifice Studentesti din 16 mai 2026, Universitatea Titu Maiorescu din Bucuresti.

Tema lucrarii este prezentarea algoritmilor genetici prin exemple practice, usor de rulat si de explicat.

## Structura proiectului

- `examples/` - exemple Python si notebook-uri pentru algoritmi genetici;
- `site-prezentare/` - site Quarto cu manuscript, prezentare si pagina de acces;
- `site-prezentare/_site/` - output generat de Quarto.

## Exemple incluse

- sortarea numerelor ca problema de permutari;
- optimizarea parametrilor continui ai unei functii;
- simularea camuflarii moliilor intr-un mediu in schimbare;
- placeholder intentionat pentru exemplul XGBoost/Iris, pana la clarificarea cerintelor.

## Rulare

Instalarea mediului:

```bash
uv sync
```

Rularea prezentarii Quarto:

```bash
cd site-prezentare
uv run quarto render
```

Rularea prezentarii impreuna cu animatia `py5` pentru camuflarea moliilor:

```powershell
.\scripts\present-with-moth.ps1
```

Scriptul foloseste `uv` daca este disponibil pe PATH; altfel foloseste mediul Python activ doar daca acesta poate importa `py5`.

Rularea exemplului de permutari:

```bash
uv run python examples/ga_permutation.py
```

Rularea simularii vizuale:

```bash
uv run python examples/moth_camouflage.py
```
