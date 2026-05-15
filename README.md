# Algoritmi genetici - utilizări și aplicații

Acest proiect a fost creat pentru Sesiunea de Comunicări Științifice Studențești din 16 mai 2026, Universitatea Titu Maiorescu din București.

Tema lucrării este prezentarea algoritmilor genetici prin exemple practice, ușor de rulat și de explicat.

## Structura proiectului

- `examples/` - exemple Python și notebook-uri pentru algoritmi genetici;
- `site-prezentare/` - site Quarto cu manuscript, prezentare și pagină de acces;
- `site-prezentare/_site/` - output generat de Quarto.

## Exemple incluse

- sortarea numerelor ca problemă de permutări;
- optimizarea parametrilor continui ai unei funcții;
- optimizarea hiperparametrilor pentru un clasificator ML aplicat pe date despre diabet;
- simularea camuflării moliilor într-un mediu în schimbare.

## Rulare

Instalarea mediului:

```bash
uv sync
```

Rularea prezentării Quarto:

```bash
uv run quarto render site-prezentare
```

Rularea prezentării împreună cu animația `py5` pentru camuflarea moliilor, pe Windows PowerShell:

```powershell
.\scripts\present-with-moth.ps1
```

Scriptul folosește `uv` dacă este disponibil pe PATH; altfel folosește mediul Python activ doar dacă acesta poate importa `py5`.

Rularea exemplului de permutări:

```bash
uv run python examples/ga_permutation.py
```

Deschiderea notebook-urilor pentru exemplele cu parametri continui și clasificator ML:

```bash
uv run jupyter lab examples
```

Rularea simulării vizuale:

```bash
uv run python examples/moth_camouflage.py
```
