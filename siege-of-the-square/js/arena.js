// Scritto a mano dallo studente

// Indirizzo base dell'API D&D
const API = "https://www.dnd5eapi.co/api/2014";

// L'arco dell'eroe è lo Shortbow dell'API D&D (lo sprite dell'eroe ha un arco corto)
const ARMA_EROE = "shortbow";

// Danno e nome dell'arco. Partono da valori di riserva e vengono
// aggiornati quando arriva la scheda dall'API (per questo sono "let")
let dannoArco = "1d6";
let nomeArco = "Shortbow";

// Bonus dell'arciere al tiro per colpire (come in D&D: d20 + bonus contro l'armatura)
const BONUS_ARCIERE = 5;

// Mostro di riserva, se l'API non risponde: così l'Arena funziona sempre
const MOSTRO_RISERVA = { sprite: "goblin", nome: "Goblin", vita: 7, armatura: 15, velocita: 150, danno: "1d6+2" };

// Il riquadro di testo sopra il gioco
const riquadro = document.getElementById("ui");


// ===== CONVERSIONE: dai dati D&D ai numeri del gioco =====

// Velocità D&D (es. "30 ft.") → pixel al secondo nel gioco
function velocitaInPixel(velocita) {
  let testo = velocita.walk;      // di solito uso la velocità a piedi
  if (velocita.fly) {
    testo = velocita.fly;         // se il mostro vola, uso quella di volo
  }

  const piedi = parseInt(testo);  // "30 ft." → 30
  const pixel = piedi * 5;        // 30 piedi → 150 pixel al secondo

  // Limiti: abbastanza veloce da raggiungere l'eroe, non troppo da essere ingiusto
  return Math.max(60, Math.min(pixel, 220));
}

// Scheda D&D → oggetto che il motore del gioco sa usare
function convertiMostro(mostro) {
  return {
    sprite: spriteDelMostro(mostro.index),
    nome: mostro.name,
    vita: mostro.hit_points,
    armatura: mostro.armor_class[0].value,
    velocita: velocitaInPixel(mostro.speed),
    danno: trovaDanno(mostro.actions)
  };
}


// ===== REGOLE: il motore le chiama durante la partita =====

// La freccia va a segno? Tiro un d20 + bonus: se arriva all'armatura del nemico, colpisco
function calcolaColpo(nemico) {
  const tiro = Math.floor(Math.random() * 20) + 1;   // dado da 20
  return tiro + BONUS_ARCIERE >= nemico.dati.armatura;
}

// Una freccia toglie il danno dell'arco arrivato dall'API
function calcolaDannoFreccia(nemico) {
  return tiraDado(dannoArco);
}

// Quanti punti vita toglie il mostro all'eroe a ogni colpo
function calcolaDannoMostro(nemico) {
  if (nemico.dati.danno === "nessuno") {
    return 5;   // il mostro non ha un attacco con danno: valore minimo
  }
  return tiraDado(nemico.dati.danno) * 2;   // ×2 perché l'eroe ha 120 punti vita
}


// ===== AVVIO: leggo le scelte, chiedo i dati all'API, faccio partire il gioco =====

function preparaArena() {
  let scelti = leggiScelti();

  // Battaglia a sorpresa: pesco adesso 3 mostri diversi a caso
  if (leggiModoCasuale()) {
    scelti = scegliACaso();
  }

  // Nessun mostro scelto: spiego cosa fare e non avvio il gioco
  if (scelti.length === 0) {
    riquadro.innerHTML = `<div>You haven't chosen any monster.</div>
                          <div><a href="bestiario.html">Go to the Bestiary</a> and choose up to ${MAX_MOSTRI_SCELTI}.</div>`;
    return;
  }

  const nemici = [];   // qui metto i mostri convertiti
  let risposte = 0;    // quante richieste sono finite, bene o male

  for (let i = 0; i < scelti.length; i++) {
    fetch(API + "/monsters/" + scelti[i])
      .then(res => res.json())
      .then(mostro => {
        nemici[i] = convertiMostro(mostro);   // stessa posizione dell'elenco dei scelti
      })
      .catch(err => {
        console.log("Mostro non disponibile:", scelti[i], err);
      })
      .then(() => {
        risposte++;

        // Quando sono finite TUTTE le richieste, avvio il gioco
        if (risposte === scelti.length) {
          avviaConINemici(nemici);
        }
      });
  }
}

// Toglie i posti vuoti, scrive i nomi sopra il gioco e avvia il motore
function avviaConINemici(nemici) {
  const pronti = [];

  for (let i = 0; i < nemici.length; i++) {
    if (nemici[i] !== undefined) {
      pronti.push(nemici[i]);   // tengo solo i mostri arrivati davvero
    }
  }

  // L'API non ha risposto per nessun mostro: uso il mostro di riserva
  if (pronti.length === 0) {
    pronti.push(MOSTRO_RISERVA);
    console.log("API non raggiungibile: uso il mostro di riserva");
  }

  // Elenco dei nomi per il riquadro, es. "Goblin, Mimic, Giant Rat"
  const nomi = [];
  for (let i = 0; i < pronti.length; i++) {
    nomi.push(pronti[i].nome);
  }

    riquadro.innerHTML = `<div><b>Foes:</b> ${nomi.join(", ")}</div>
                        <div id="arma-arena"><b>Weapon:</b> ${nomeArco} · damage ${dannoArco}</div>
                        <div id="meteo-arena">Loading weather...</div>
                        <div>WASD move · left click shoot · R restart</div>`;

  avviaArena(pronti);   // la funzione del motore: da qui parte il gioco
  caricaArco();         // i dati dell'arco arrivano subito dopo l'avvio
  preparaMeteo();       // il meteo arriva subito dopo l'avvio
}


// ===== ARMA: l'arco dell'eroe dall'API D&D =====

// Chiede all'API la scheda dello Shortbow e ne usa il danno
function caricaArco() {
  fetch(API + "/equipment/" + ARMA_EROE)
    .then(res => res.json())
    .then(arma => {
      dannoArco = arma.damage.damage_dice;   // es. "1d6"
      nomeArco = arma.name;                  // es. "Shortbow"

      document.getElementById("arma-arena").innerHTML =
         "<b>Weapon:</b> " + nomeArco + " · damage " + dannoArco;
    })
    .catch(err => {
      console.log("Arco non disponibile, uso i valori di riserva", err);
    });
}


// ===== METEO: dall'API Open-Meteo al motore del gioco =====

// Meteo reale di Aveiro: lo chiedo all'API, lo passo al motore e lo scrivo nel riquadro
function preparaMeteo() {
  chiediMeteo().then(meteo => {
    // Al motore passo solo quello che serve per disegnare e per le frecce
    impostaMeteo({
      notte: meteo.notte,
      categoria: meteo.categoria,
      deriva: derivaDelVento(meteo)
    });

    // Nel riquadro: es. "Aveiro 16°C · Pioggia · vento 30 km/h"
    let testo = "Aveiro";
    if (meteo.temperatura !== null) {
      testo += " " + meteo.temperatura + "°C";
    }
    testo += " · " + meteo.descrizione;
    if (meteo.notte) {
            testo += " · Night";
    }
    if (derivaDelVento(meteo) !== 0) {
            testo += " · wind " + meteo.vento + " km/h";
    }

    document.getElementById("meteo-arena").textContent = testo;
  });
}


// All'apertura della pagina preparo l'Arena
preparaArena();