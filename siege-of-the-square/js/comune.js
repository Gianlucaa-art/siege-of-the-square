// Scritto a mano dallo studente


// ===== MOSTRI =====

// Cerca il primo attacco del mostro che ha un danno, es. "1d6+2".
// Se non ne trova, restituisce "nessuno".
function trovaDanno(azioni) {
  if (azioni === undefined) {
    return "nessuno";   // il mostro non ha proprio azioni
  }

  for (let i = 0; i < azioni.length; i++) {
    const azione = azioni[i];
    if (azione.damage && azione.damage.length > 0 && azione.damage[0].damage_dice) {
      return azione.damage[0].damage_dice;   // trovato: esco subito
    }
  }

  return "nessuno";   // ho controllato tutte le azioni, nessuna fa danno
}

// I 9 mostri giocabili: ogni mostro dell'API D&D ha il suo sprite.
// index = nome del mostro nell'API · sprite = cartella in assets/enemies
const MOSTRI_GIOCABILI = [
  { index: "goblin",        sprite: "goblin" },
  { index: "skeleton",      sprite: "skeleton" },
  { index: "violet-fungus", sprite: "mushroom" },
  { index: "guard",         sprite: "warrior" },
  { index: "cultist",       sprite: "wizard" },
  { index: "giant-bat",     sprite: "bat" },
  { index: "giant-rat",     sprite: "rat" },
  { index: "gray-ooze",     sprite: "slime" },
  { index: "mimic",         sprite: "mimic" }
];

// Dato il nome di un mostro dell'API, restituisce la cartella del suo sprite.
// Se il mostro non è giocabile, restituisce null.
function spriteDelMostro(index) {
  for (let i = 0; i < MOSTRI_GIOCABILI.length; i++) {
    if (MOSTRI_GIOCABILI[i].index === index) {
      return MOSTRI_GIOCABILI[i].sprite;   // trovato: esco subito
    }
  }

  return null;   // ho controllato tutta la tabella: non è giocabile
}


// ===== SCELTA DEI MOSTRI PER LA BATTAGLIA =====

// Quanti mostri al massimo si possono scegliere per una battaglia
const MAX_MOSTRI_SCELTI = 3;

// Legge dal localStorage l'elenco dei mostri scelti, es. ["goblin", "mimic"]
function leggiScelti() {
  const testo = localStorage.getItem("mostriScelti");

  if (testo === null) {
    return [];   // non è ancora stato scelto niente: elenco vuoto
  }

  return JSON.parse(testo);   // da testo ad array
}

// Salva nel localStorage l'elenco dei mostri scelti
function salvaScelti(scelti) {
  localStorage.setItem("mostriScelti", JSON.stringify(scelti));   // da array a testo
}

// Sceglie a caso MAX_MOSTRI_SCELTI mostri DIVERSI tra quelli giocabili.
// Restituisce l'elenco dei loro index, es. ["mimic", "goblin", "giant-rat"]
function scegliACaso() {
  const scelti = [];

  // Continuo a pescare finché non ne ho abbastanza
  while (scelti.length < MAX_MOSTRI_SCELTI) {
    const posizione = Math.floor(Math.random() * MOSTRI_GIOCABILI.length);   // da 0 a 8
    const index = MOSTRI_GIOCABILI[posizione].index;

    // Lo aggiungo solo se non l'ho già pescato
    if (!scelti.includes(index)) {
      scelti.push(index);
    }
  }

  return scelti;
}

// La modalità "battaglia a sorpresa" è accesa? (salvata nel localStorage come "si" o "no")
function leggiModoCasuale() {
  return localStorage.getItem("modoCasuale") === "si";
}

// Accende (true) o spegne (false) la modalità "battaglia a sorpresa"
function salvaModoCasuale(acceso) {
  if (acceso) {
    localStorage.setItem("modoCasuale", "si");
  } else {
    localStorage.setItem("modoCasuale", "no");
  }
}


// ===== DADI =====

// Trasforma un testo di dadi D&D in un numero, es. "1d6+2" → tira 1 dado da 6 e aggiunge 2.
// Accetta anche un numero fisso, es. "10".
function tiraDado(testo) {
  // Caso semplice: nessuna "d", quindi è un numero fisso
  if (!testo.includes("d")) {
    return Number(testo);
  }

  const parti = testo.split("d");         // "1d6+2" → ["1", "6+2"]
  const quantiDadi = Number(parti[0]);    // 1
  const resto = parti[1].split("+");      // "6+2"  → ["6", "2"]
  const facce = Number(resto[0]);         // 6

  let bonus = 0;                          // se non c'è il "+", il bonus è 0
  if (resto.length > 1) {
    bonus = Number(resto[1]);             // 2
  }

  let totale = 0;
  for (let i = 0; i < quantiDadi; i++) {
    totale += Math.floor(Math.random() * facce) + 1;   // un dado: numero da 1 a facce
  }

  return totale + bonus;
}


// ===== METEO (API Open-Meteo) =====

// Indirizzo della richiesta: meteo attuale alle coordinate di Aveiro
const METEO_URL = "https://api.open-meteo.com/v1/forecast?latitude=40.64&longitude=-8.65&current=temperature_2m,weather_code,wind_speed_10m,is_day,wind_direction_10m";

// Meteo di riserva, se l'API non risponde: giorno sereno, senza vento
const METEO_RISERVA = { temperatura: null, vento: 0, direzione: 270, notte: false, categoria: "sereno", descrizione: "Clear" };

// Dal codice meteo dell'API (standard internazionale WMO) a una categoria semplice
function categoriaMeteo(codice) {
  if (codice === 0) {
    return "sereno";
  }
  if (codice <= 3) {
    return "nuvoloso";
  }
  if (codice === 45 || codice === 48) {
    return "nebbia";
  }
  if ((codice >= 71 && codice <= 77) || codice === 85 || codice === 86) {
    return "neve";
  }
  if (codice >= 95) {
    return "temporale";
  }
  return "pioggia";   // tutti gli altri codici sono pioviggine, pioggia o rovesci
}

// Il nome della categoria da mostrare nella pagina
function descrizioneMeteo(categoria) {
  switch (categoria) {
    case "sereno":
      return "Clear";
    case "nuvoloso":
      return "Cloudy";
    case "nebbia":
      return "Fog";
    case "pioggia":
      return "Rain";
    case "neve":
      return "Snow";
    case "temporale":
      return "Thunderstorm";
    default:
      return "Unknown";
  }
}

// Per la presentazione: l'indirizzo può forzare il meteo, es. arena.html?notte=1&meteo=pioggia&vento=40
function applicaProva(meteo) {
  const parametri = new URLSearchParams(window.location.search);

  if (parametri.has("notte")) {
    meteo.notte = true;
  }
  if (parametri.has("meteo")) {
    meteo.categoria = parametri.get("meteo");
    meteo.descrizione = descrizioneMeteo(meteo.categoria);
  }
  if (parametri.has("vento")) {
    meteo.vento = Number(parametri.get("vento"));
  }

  return meteo;
}

// Chiede il meteo attuale all'API e lo trasforma in un oggetto semplice.
// Restituisce la richiesta, così chi la usa può aggiungere il suo .then
function chiediMeteo() {
  return fetch(METEO_URL)
    .then(res => res.json())
    .then(data => {
      const attuale = data.current;
      const categoria = categoriaMeteo(attuale.weather_code);

      const meteo = {
        temperatura: Math.round(attuale.temperature_2m),
        vento: Math.round(attuale.wind_speed_10m),
        direzione: attuale.wind_direction_10m,
        notte: attuale.is_day === 0,
        categoria: categoria,
        descrizione: descrizioneMeteo(categoria)
      };

      return applicaProva(meteo);
    })
    .catch(err => {
      console.log("Meteo non disponibile, uso quello di riserva", err);
      return applicaProva(METEO_RISERVA);
    });
}

// Il vento diventa uno spostamento laterale delle frecce, in pixel al secondo.
// Sotto i 20 km/h il vento non conta.
function derivaDelVento(meteo) {
  if (meteo.vento < 20) {
    return 0;
  }

  const forza = meteo.vento * 2;   // es. 30 km/h → 60 pixel al secondo

  // La direzione indica DA DOVE arriva il vento, in gradi (90 = da est, 270 = da ovest).
  // Se arriva da est (meno di 180°) spinge verso ovest, cioè a sinistra: valore negativo.
  if (meteo.direzione < 180) {
    return -forza;
  }
  return forza;   // arriva da ovest: spinge a destra
}