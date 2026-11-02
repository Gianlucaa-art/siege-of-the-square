# Sprite dei nemici

Ogni file è una striscia orizzontale di fotogrammi tutti uguali, in una sola riga.
Numero di fotogrammi = larghezza dell'immagine / larghezza di un fotogramma.

| Sprite | Cartella | Animazione | File | Fotogramma (px) | Fotogrammi |
|---|---|---|---|---|---|
| Goblin | `goblin/` | idle | `enemy_idle.png` | 150 x 150 | 4 |
| | | walk | `enemy_walk.png` | 150 x 150 | 8 |
| | | attack | `enemy_attack.png` | 150 x 150 | 8 |
| | | take hit | `enemy_take_hit.png` | 150 x 150 | 4 |
| | | death | `enemy_death.png` | 150 x 150 | 4 |
| Skeleton | `skeleton/` | idle | `enemy_idle.png` | 150 x 150 | 4 |
| | | walk | `enemy_walk.png` | 150 x 150 | 4 |
| | | attack | `enemy_attack.png` | 150 x 150 | 8 |
| | | shield | `enemy_shield.png` | 150 x 150 | 4 |
| | | take hit | `enemy_take_hit.png` | 150 x 150 | 4 |
| | | death | `enemy_death.png` | 150 x 150 | 4 |
| Mushroom | `mushroom/` | idle | `enemy_idle.png` | 150 x 150 | 4 |
| | | walk | `enemy_walk.png` | 150 x 150 | 8 |
| | | attack | `enemy_attack.png` | 150 x 150 | 8 |
| | | take hit | `enemy_take_hit.png` | 150 x 150 | 4 |
| | | death | `enemy_death.png` | 150 x 150 | 4 |
| Mushroom 2 | `mushroom_2/` | idle | `enemy_idle.png` | 80 x 64 | 7 |
| | | walk | `enemy_walk.png` | 80 x 64 | 8 |
| | | attack | `enemy_attack.png` | 80 x 64 | 10 |
| | | take hit | `enemy_take_hit.png` | 80 x 64 | 5 |
| | | death | `enemy_death.png` | 80 x 64 | 15 |
| Flying Eye | `flying_eye/` | walk (volo, manca idle) | `enemy_walk.png` | 150 x 150 | 8 |
| | | attack | `enemy_attack.png` | 150 x 150 | 8 |
| | | take hit | `enemy_take_hit.png` | 150 x 150 | 4 |
| | | death | `enemy_death.png` | 150 x 150 | 4 |
| Warrior | `warrior/` | idle | `Idle.png` | 184 x 137 | 6 |
| | | run | `Run.png` | 184 x 137 | 8 |
| | | attack 1 | `Attack1.png` | 184 x 137 | 4 |
| | | attack 2 | `Attack2.png` | 184 x 137 | 4 |
| | | hit (hurt) | `Hit.png` | 184 x 137 | 3 |
| | | death | `Death.png` | 184 x 137 | 9 |
| | | jump | `Jump.png` | 184 x 137 | 2 |
| | | fall | `Fall.png` | 184 x 137 | 2 |
| Wizard | `wizard/` | idle | `Idle.png` | 150 x 150 | 8 |
| | | move | `Move.png` | 150 x 150 | 8 |
| | | attack | `Attack.png` | 150 x 150 | 8 |
| | | take hit | `Take Hit.png` | 150 x 150 | 4 |
| | | death | `Death.png` | 150 x 150 | 5 |
| Bat | `bat/` | fly (idle) | `fly.png` | 87 x 87 | 11 |
| | | attack | `attack.png` | 87 x 87 | 11 |
| | | hurt | `hurt.png` | 87 x 87 | 3 |
| | | fly-to-fall | `fly-to-fall.png` | 87 x 87 | 3 |
| | | fall | `fall.png` | 87 x 87 | 5 |
| | | death | `death.png` | 87 x 87 | 4 |
| Rat | `rat/` | idle | `idle.png` | 70 x 70 | 10 |
| | | run | `run.png` | 70 x 70 | 8 |
| | | attack | `attack_bite.png` | 70 x 70 | 12 |
| | | hurt | `hurt.png` | 70 x 70 | 3 |
| | | death | `rat-death.png` | 70 x 70 | 6 |
| Slime | `slime/` | idle | `idle.png` | 156 x 156 | 14 |
| | | walk | `walk.png` | 156 x 156 | 6 |
| | | attack | `attack.png` | 156 x 156 | 19 |
| | | hurt | `hurt.png` | 156 x 156 | 3 |
| | | death | `death.png` | 156 x 156 | 11 |
| Mimic | `mimic/` | idle (scrigno chiuso) | `Idle_closed.png` | 146 x 146 | 1 |
| | | idle (scrigno aperto) | `idle_open.png` | 146 x 146 | 1 |
| | | opening | `opening.png` | 146 x 146 | 6 |
| | | transform | `transform.png` | 146 x 146 | 7 |
| | | idle (trasformato) | `idle_transformed.png` | 146 x 146 | 9 |
| | | walk | `walk.png` | 146 x 146 | 6 |
| | | attack 1 | `attack_1.png` | 146 x 146 | 14 |
| | | attack 2 | `attack_2.png` | 146 x 146 | 13 |
| | | hurt | `hurt.png` | 146 x 146 | 3 |
| | | death | `death.png` | 146 x 146 | 6 |

## Note

- **Warrior:** i fotogrammi sono più larghi che alti (184 x 137), non quadrati.
- **Flying Eye:** non ha un'animazione idle, usa `enemy_walk.png`.
- **Mimic:** per un nemico "a sorpresa" l'ordine è `Idle_closed` → `opening` → `transform`
  → `idle_transformed`.
- La sagoma del personaggio non riempie tutto il fotogramma: c'è parecchio spazio vuoto
  intorno, soprattutto negli sprite da 150 x 150.
