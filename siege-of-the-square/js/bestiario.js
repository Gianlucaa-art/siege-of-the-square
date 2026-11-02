// Scritto a mano dallo studente

// Indirizzo base dell'API D&D
const API = "https://www.dnd5eapi.co/api/2014";

// Il contenitore vuoto della pagina dove metterò le card
const contenitore = document.getElementById("cards");

// La casella di ricerca della pagina
const campoRicerca = document.getElementById("ricerca");

// Qui salvo le schede complete dei mostri giocabili arrivate dall'API
let mostriCaricati = [];

// La finestra della scheda (modale di Bootstrap) e le sue parti
const modale = new bootstrap.Modal(document.getElementById("modaleMostro"));
const titoloModale = document.querySelector("#modaleMostro .modal-title");
const corpoModale = document.querySelector("#modaleMostro .modal-body");

// Il mostro la cui scheda è aperta in questo momento
let mostroAperto = null;

// Gli elementi della selezione
const bottoneScelta = document.getElementById("btn-affronta");      // pulsante nella finestra
const contatore = document.getElementById("contatore-scelti");      // "Chosen foes: X / 3"
const bottoneCombatti = document.getElementById("btn-combatti");    // pulsante "Fight"
const bottoneRandom = document.getElementById("btn-random");        // pulsante "Random foes"

// La card: illustrazione D&D come immagine principale, e accanto lo sprite dell'Arena
function creaCard(mostro) {
  const sprite = spriteDelMostro(mostro.index);   // cartella dello sprite, dalla tabella

  // Se il mostro è tra quelli scelti, la card riceve la classe "scelta"
  let classeScelta = "";
  if (leggiScelti().includes(mostro.index)) {
    classeScelta = "scelta";
  }

  return `<div class="col-6 col-md-4 col-lg-3 mb-3">
            <div class="card h-100 text-center ${classeScelta}" data-index="${mostro.index}">
              <div class="card-immagini">
                <img src="https://www.dnd5eapi.co${mostro.image}" alt="${mostro.name}" class="immagine-dnd">
                <div class="icona-arena">
                  <img src="assets/anteprime/${sprite}.png" alt="${mostro.name} in the Arena">
                  <span>Arena</span>
                </div>
              </div>
              <div class="card-body">
                <h5 class="card-title">${mostro.name}</h5>
                <p class="card-text">Difficulty ${mostro.challenge_rating}</p>
              </div>
            </div>
          </div>`;
}

// Illustrazione D&D e sprite uno accanto all'altro, poi le statistiche
function creaScheda(mostro) {
  const sprite = spriteDelMostro(mostro.index);

  let html = `<div class="row align-items-end text-center mb-3">`;

  // L'illustrazione D&D c'è solo per alcuni mostri: la aggiungo solo se esiste
  if (mostro.image) {
    html += `<div class="col-6">
               <img src="https://www.dnd5eapi.co${mostro.image}" alt="${mostro.name}" class="img-fluid">
               <p class="small mt-2">D&D illustration</p>
             </div>`;
  }

  html += `<div class="col-6">
             <img src="assets/anteprime/${sprite}.png" alt="${mostro.name} in pixel art" class="anteprima-pixel">
             <p class="small mt-2">In the Arena</p>
           </div>
         </div>`;

  // Il valore interno "nessuno" non lo mostro al giocatore: scrivo un trattino
  let attacco = trovaDanno(mostro.actions);
  if (attacco === "nessuno") {
    attacco = "—";
  }

  html += `<p><b>Type:</b> ${mostro.type}</p>
           <p><b>Difficulty:</b> ${mostro.challenge_rating}</p>
           <p><b>Hit points:</b> ${mostro.hit_points}</p>
           <p><b>Armor:</b> ${mostro.armor_class[0].value}</p>
           <p><b>Speed:</b> ${mostro.speed.walk}</p>
           <p><b>Attack:</b> ${attacco}</p>`;

  return html;
}

// Mostra nella pagina le card di una lista di mostri
function mostraCard(lista) {
  // Se la lista è vuota, lo scrivo invece di lasciare la pagina bianca
  if (lista.length === 0) {
    contenitore.innerHTML = "<p>No monster found.</p>";
    return;
  }

  let html = "";   // qui accumulo l'HTML di tutte le card

  // Ciclo: un giro per ogni mostro della lista
  for (let i = 0; i < lista.length; i++) {
    html += creaCard(lista[i]);
  }

  // Metto tutte le card nella pagina in un colpo solo
  contenitore.innerHTML = html;
}

// Tiene solo i mostri il cui nome contiene il testo cercato
function filtraMostri() {
  const testo = campoRicerca.value.toLowerCase();   // quello che ho scritto, in minuscolo
  const trovati = [];                               // qui metto i mostri che vanno bene

  for (let i = 0; i < mostriCaricati.length; i++) {
    const mostro = mostriCaricati[i];

    // Salto i mostri che l'API non ha restituito (posto vuoto)
    if (mostro === undefined) {
      continue;
    }

    if (mostro.name.toLowerCase().includes(testo)) {
      trovati.push(mostro);
    }
  }

  mostraCard(trovati);
}

// Chiede all'API la scheda di ogni mostro della tabella
function caricaMostri() {
  contenitore.innerHTML = "<p>Loading monsters...</p>";

  let risposte = 0;   // quante richieste sono finite, bene o male

  for (let i = 0; i < MOSTRI_GIOCABILI.length; i++) {
    fetch(API + "/monsters/" + MOSTRI_GIOCABILI[i].index)
      .then(res => res.json())
      .then(mostro => {
        mostriCaricati[i] = mostro;   // stessa posizione che ha nella tabella
      })
      .catch(err => {
        console.log("Mostro non disponibile:", MOSTRI_GIOCABILI[i].index, err);
      })
      .then(() => {
        risposte++;

        // Quando sono finite TUTTE le richieste, mostro le card
        if (risposte === MOSTRI_GIOCABILI.length) {
          filtraMostri();
        }
      });
  }
}

// Aggiorna contatore, pulsante "Fight" e pulsante "Random foes"
function aggiornaSelezione() {
  const scelti = leggiScelti();

  if (leggiModoCasuale()) {
    // Battaglia a sorpresa: i mostri li sceglierà l'Arena
    contatore.textContent = "Surprise battle: " + MAX_MOSTRI_SCELTI + " random foes";
    bottoneRandom.classList.add("attivo");
    bottoneCombatti.disabled = false;
  } else {
    // Scelta manuale
    contatore.textContent = "Chosen foes: " + scelti.length + " / " + MAX_MOSTRI_SCELTI;
    bottoneRandom.classList.remove("attivo");
    bottoneCombatti.disabled = (scelti.length === 0);   // spento se non ho scelto niente
  }
}

// Decide il testo del pulsante nella finestra, in base al mostro aperto
function aggiornaBottoneScelta() {
  const scelti = leggiScelti();

  if (scelti.includes(mostroAperto.index)) {
    // il mostro è già scelto: posso toglierlo
    bottoneScelta.textContent = "Remove from battle";
    bottoneScelta.disabled = false;
  } else if (scelti.length >= MAX_MOSTRI_SCELTI) {
    // non è scelto, ma non c'è più posto
    bottoneScelta.textContent = "You already have " + MAX_MOSTRI_SCELTI + " foes";
    bottoneScelta.disabled = true;
  } else {
    // non è scelto e c'è posto: posso aggiungerlo
    bottoneScelta.textContent = "Add to battle";
    bottoneScelta.disabled = false;
  }
}

// La scheda non si richiede all'API: la cerco tra quelle già scaricate
function apriSchedaMostro(index) {
  for (let i = 0; i < mostriCaricati.length; i++) {
    const mostro = mostriCaricati[i];

    if (mostro !== undefined && mostro.index === index) {
      mostroAperto = mostro;                       // ricordo quale mostro sto mostrando
      titoloModale.textContent = mostro.name;      // il nome nel titolo
      corpoModale.innerHTML = creaScheda(mostro);  // la scheda nel corpo
      aggiornaBottoneScelta();                     // testo giusto sul pulsante
      modale.show();                               // apro la finestra
      return;                                      // trovato: esco
    }
  }
}

// A ogni lettera scritta nella casella, rifiltro le card
campoRicerca.addEventListener("input", filtraMostri);

// Il pulsante nella finestra aggiunge o toglie il mostro dalla battaglia
bottoneScelta.addEventListener("click", () => {
  if (mostroAperto === null) {
    return;   // nessuna scheda aperta: non faccio niente
  }

  // Se scelgo un mostro a mano, la battaglia a sorpresa si spegne
  salvaModoCasuale(false);

  const scelti = leggiScelti();
  const posizione = scelti.indexOf(mostroAperto.index);   // dove si trova nell'elenco (-1 = non c'è)

  if (posizione !== -1) {
    scelti.splice(posizione, 1);              // era scelto: lo tolgo
  } else if (scelti.length < MAX_MOSTRI_SCELTI) {
    scelti.push(mostroAperto.index);          // non era scelto e c'è posto: lo aggiungo
  }

  salvaScelti(scelti);       // salvo il nuovo elenco
  aggiornaBottoneScelta();   // aggiorno il testo del pulsante
  aggiornaSelezione();       // aggiorno contatore e pulsanti
  filtraMostri();            // ridisegno le card, per evidenziare quelle scelte
});

// Il pulsante "Fight" apre l'Arena
bottoneCombatti.addEventListener("click", () => {
  window.location.href = "arena.html";
});

// Il pulsante "Random foes" accende o spegne la battaglia a sorpresa
bottoneRandom.addEventListener("click", () => {
  if (leggiModoCasuale()) {
    salvaModoCasuale(false);    // era acceso: lo spengo e torno alla scelta manuale
  } else {
    salvaModoCasuale(true);     // era spento: lo accendo
  }

  salvaScelti([]);        // in entrambi i casi parto senza mostri scelti: spariscono i segni "Chosen"
  aggiornaSelezione();    // aggiorno contatore e pulsanti
  filtraMostri();         // ridisegno le card senza evidenziazioni
});

// Quando clicco una card, scopro quale mostro è e apro la sua scheda
contenitore.addEventListener("click", (evento) => {
  const card = evento.target.closest(".card");   // la card su cui ho cliccato

  if (card === null) {
    return;   // ho cliccato fuori da una card: non faccio niente
  }

  apriSchedaMostro(card.dataset.index);
});

// All'apertura della pagina carico i mostri e aggiorno il contatore
caricaMostri();
aggiornaSelezione();