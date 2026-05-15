# Exemple

## Sortarea numerelor

Acesta este un exemplu forțat deoarece exista algoritmi de sortare mult mai buni, însă exemplul rămâne relevant dacă privim numerele pe care vrem să le sortăm ca pe permutări ale unui șir. Abordarea utilizează o reprezentare bazată pe permutări și aplică un set de operatori genetici clasici pentru probleme de ordonare, incluzând selecția prin turneu, încrucișarea de tip Order Crossover (OX1) și mutația prin interschimbare (swap mutation).

<details>
<summary>Configurația algoritmului</summary>

- **Dimensiune populație:** 50
- **Număr generații:** 200
- **Rată de încrucișare:** 0.9
- **Rată de mutație:** 0.1
- **Elitism:** 1 individ
- **Dimensiune turneu (selecție):** 3

</details>

### Discuție pe grafic

Se poate observa că in dreptul generațiilor 48 și 180 cel mai bun scor de fitness este egal cu cel mai rău scor de fitness. Acest lucru înseamnă că populația și=a pierdut diversitatea și că algoritmul a rămas blocat într-un maxim local.

## Optimizarea parametrilor unei funcții pătratice

Acest exemplu arata cum un algoritm genetic poate optimiza parametrii continui `a`, `b` si `c` ai unei functii patratice, pentru a obtine o parabola orientata in sus cat mai plata. Pentru aceasta, algoritmul evoluează o populație de cromozomi cu valori reale, folosind operatori precum selecția prin turneu, recombinarea aritmetică pentru a genera soluții intermediare și o mutație bazată pe adăugarea unei valori aleatorii pentru a explora spațiul parametrilor.

<details>
<summary>Configurația algoritmului</summary>

- **Dimensiune populație:** 100
- **Număr generații:** 20
- **Rată de mutație:** 1.0 (agresivă, fiecare genă este modificată)
- **Elitism:** 1 individ
- **Dimensiune turneu (selecție):** 3

</details>

## Camuflarea moliilor

Acest exemplu demonstrează cum o populație poate sa evolueze în continuu în timp ce mediul continuă să evolueze si el. Acest proces de co-evoluție este simulat printr-un algoritm ce nu utilizează încrucișarea, bazându-se exclusiv pe o presiune de selecție puternică și mutație. Cei mai adaptați indivizi sunt clonați direct, iar restul populației este înlocuit de copii ce suferă mutații la nivel de bit, permițând o adaptare rapidă la un mediu dinamic.

Chiar dacă există momente în care populația este neadaptată, în numai câteva generații va reuși sa se adapteze la mediu. Acest lucru se datorează faptului că jumătate din populație este întotdeauna ștearsă (nu are nici o șansă de a ajunge să se împerecheze), presiunea evolutivă fiind extrem de mare.

<details>
<summary>Configurația algoritmului</summary>

- **Dimensiune populație:** 1024 (grilă 32x32)
- **Număr generații:** Nedefinit (rulează continuu)
- **Rată de mutație (per bit):** 0.01
- **Presiune de selecție:** 50% (jumătatea superioară a populației supraviețuiește și se reproduce)
- **Încrucișare:** Inexistentă

</details>

