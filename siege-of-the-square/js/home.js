// Scritto a mano dallo studente
// Il riquadro "Oggi nella piazza di Aveiro"
const boxMeteo = document.getElementById("meteo-home");

// Crea l'elenco di cosa cambia nel gioco con questo meteo
function effettiNelGioco(meteo) {
  const effetti = [];

  if (meteo.notte) {
    effetti.push("It's night: the square is dark, aim carefully.");
  }

  switch (meteo.categoria) {
    case "pioggia":
      effetti.push("It's raining on the square.");
      break;
    case "temporale":
      effetti.push("Thunderstorm: heavy rain and lightning.");
      break;
    case "neve":
      effetti.push("It's snowing on the square.");
      break;
    case "nebbia":
      effetti.push("Fog: the enemies are hard to see.");
      break;
    case "nuvoloso":
      effetti.push("Overcast sky: the square looks greyer.");
      break;
  }

  if (derivaDelVento(meteo) !== 0) {
    effetti.push("Strong wind (" + meteo.vento + " km/h): your arrows drift sideways.");
  }

  if (effetti.length === 0) {
    effetti.push("Perfect conditions: no effect on the game.");
  }

  return effetti;
}

// Chiedo il meteo e riempio il riquadro
chiediMeteo().then(meteo => {
  // Titolo, es. "16°C · Pioggia · Notte"
  let titolo = meteo.descrizione;
  if (meteo.temperatura !== null) {
    titolo = meteo.temperatura + "°C · " + titolo;
  }
  if (meteo.notte) {
    titolo = titolo + " · Night";
  }

  // Elenco degli effetti, una riga <li> per ognuno
  const effetti = effettiNelGioco(meteo);
  let elenco = "";
  for (let i = 0; i < effetti.length; i++) {
    elenco += "<li>" + effetti[i] + "</li>";
  }

  boxMeteo.innerHTML = `<h3>${titolo}</h3><ul>${elenco}</ul>`;
});