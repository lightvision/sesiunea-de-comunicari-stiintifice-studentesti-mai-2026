# Algoritmi genetici - utilizări și aplicații

## Despre proiect

Acest repository conține materialele dezvoltate pentru lucrarea și prezentarea cu titlul **„Algoritmi genetici - utilizări și aplicații”**, realizate în cadrul **Sesiunii de Comunicări Științifice Studențești** din 16 mai 2026, organizată de **Facultatea de Informatică** a **Universității Titu Maiorescu din București**.

Scopul proiectului este dublu: pe de o parte, să introducă noțiunile teoretice de bază despre algoritmii genetici, iar pe de altă parte să arate cum aceste idei pot fi aplicate pe probleme concrete, de la optimizare numerică și probleme de permutare până la reglarea hiperparametrilor și adaptarea într-un mediu dinamic.

## Ce conține repository-ul

Repository-ul include:

- articolul redactat în Quarto;
- prezentarea Quarto de tip `revealjs`;
- exemple executabile care ilustrează aplicarea algoritmilor genetici pe mai multe tipuri de probleme;
- resurse vizuale folosite atât în articol, cât și în prezentare.

## Structura proiectului

- `manuscript.qmd`  
  Articolul principal, în format Quarto.

- `presentation.qmd`  
  Prezentarea de tip slide deck, în format Quarto `revealjs`.

- `examples/`  
  Exemple, notebook-uri și simulări folosite pentru ilustrarea aplicațiilor algoritmilor genetici.

- `images/`  
  Imagini și resurse grafice utilizate în articol și prezentare.

- `_authors.yml`  
  Metadatele legate de autori.

- `_quarto.yml`  
  Configurația generală a proiectului Quarto.

## Exemple incluse

### 1. Optimizarea parametrilor unei funcții pătratice

Acest exemplu arată cum un algoritm genetic poate optimiza parametrii continui `a`, `b` și `c` ai unei funcții pătratice, pentru a obține o parabolă orientată în sus și cât mai plată. Reprezentarea folosește cromozomi cu valori reale, iar operatorii principali sunt selecția prin turneu, recombinarea aritmetică și mutația prin perturbație.

### 2. Sortarea numerelor ca problemă de permutare

Exemplul tratează sortarea ca pe o problemă de permutare, pentru a evidenția situațiile în care ordinea elementelor este esențială. Sunt utilizați operatori compatibili cu acest tip de reprezentare, în special `Order Crossover (OX1)` și `swap mutation`. Experimentul este util și pentru ilustrarea pierderii diversității genetice și a convergenței premature.

### 3. Optimizarea hiperparametrilor unui clasificator

Acest exemplu folosește un algoritm genetic pentru optimizarea hiperparametrilor unui `DecisionTreeClassifier` pe setul de date Pima Indians Diabetes. Rezultatele compară modelul baseline cu modelul optimizat și evidențiază îmbunătățiri în acuratețe, scor AUC și reducerea fals negativilor.

### 4. Camuflarea moliilor într-un mediu dinamic

Acest exemplu simulează adaptarea continuă a unei populații într-un mediu care își schimbă culoarea de fundal. Modelul evidențiază rolul selecției puternice și al mutației în menținerea capacității de readaptare, fără utilizarea operatorului de încrucișare.

## Randare și rulare

### Randarea articolului

```powershell
.\.venv\Scripts\quarto.exe render .\manuscript.qmd
```

### Randarea prezentării

```powershell
.\.venv\Scripts\quarto.exe render .\presentation.qmd
```

### Rularea exemplelor

Exemplele pot fi rulate individual din directorul `examples/`, în funcție de tipul fișierului:

- notebook-urile `.ipynb` pot fi deschise și executate în Jupyter sau randate prin Quarto;
- simularea moliilor poate fi rulată direct ca script Python, din mediul virtual al proiectului.

## Autori

- Marius-Florinel Ionel
- Cristina-Mirela Done
- Brandon Aron

**Coordonator științific:** Conf.univ.dr. Daniela Joița
