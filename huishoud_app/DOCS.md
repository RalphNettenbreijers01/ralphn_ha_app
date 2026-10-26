# Thuis - Huishoudbeheer

Na het starten verschijnt "Huishouden" in de zijbalk van Home Assistant (Ingress, geen poort nodig). Staat hij er niet: Instellingen → Add-ons → Thuis → zet "Toon in zijbalk" aan.

Data staat in `/data/huishoud.json` en is dus gedeeld tussen alle apparaten. Die map zit in Home Assistant-back-ups.

## Thema

De app volgt automatisch het actieve Home Assistant-thema (licht/donker, kleuren, lettertype) en gebruikt dezelfde iconenset (mdi).

## Sensoren in Home Assistant

De add-on publiceert (en ververst elke 5 minuten):

| Entiteit | Betekenis |
| --- | --- |
| `sensor.huishoud_taken_vandaag` | aantal open taken vandaag; attribuut `taken` bevat de lijst |
| `sensor.huishoud_taken_achterstallig` | aantal open taken uit het verleden |
| `sensor.huishoud_<naam>_open_vandaag` | open taken vandaag per gebruiker |

Te gebruiken in automatiseringen en dashboards. Let op: dit zijn sensoren, geen echte calendar- of to-do-entiteiten.

## Meldingen

Opties van de add-on:

- `notify_service`: standaard notify-service (bijv. `mobile_app_pixel_8`), voor taken zonder gebruiker of zonder eigen service.
- `notify_time`: tijdstip van de dagelijkse herinnering (standaard `08:00`).

Per gebruiker kun je in de app een eigen meldingsservice instellen. Elke gebruiker krijgt dan alleen de eigen taken van vandaag, plus achterstallige taken.

## Terugkerende taken

Kies bij een taak onder "Herhalen": dagelijks, wekelijks, om de 2 weken, elke 4 weken, maandelijks, jaarlijks of aangepast (elke N dagen/weken/maanden/jaren), eventueel met einddatum. Status (afvinken) geldt per voorkomen; "Deze keer overslaan" slaat één voorkomen over. Wijzigen of verwijderen geldt voor de hele reeks. Maandelijkse taken op de 29e-31e vallen in kortere maanden op de laatste dag. Terugkerende taken worden ook meegenomen in de sensoren en meldingen.

## Notities (post-its)

Pagina "Notities": gekleurde post-its met optioneel een afzender. Pin een notitie vast (speldicoon) om hem op het dashboard onder "Prikbord" te tonen.

## Boodschappenlijst

Pagina "Boodschappen": producten toevoegen met hoeveelheid en categorie (gegroepeerd per afdeling), afvinken in de winkel en "Voltooide verwijderen" om op te ruimen. Eerder gebruikte producten komen als suggestie terug, met hun laatste categorie. Op het dashboard staat een compact overzicht. Sensor: `sensor.huishoud_boodschappen` (aantal producten; attribuut `producten`).

## Afvalophaling (Afvalbeheer)

Vul in de opties van de add-on `afval_entities` in met de entiteiten van de Afvalbeheer-integratie, gescheiden door komma's (bijv. `calendar.afvalbeheer` of `sensor.afvalbeheer_gft, sensor.afvalbeheer_restafval`; zie Ontwikkelaarstools → Statussen). Start de add-on daarna opnieuw.

- Voor elke ophaaldag maakt de app een taak "<soort> buiten zetten" op de **avond ervoor** (standaard 18:00, instelbaar).
- Op de pagina "Afval" koppel je per containersoort een gebruiker (en eventueel ruimte) of zet je een soort uit.
- Kalenderentiteiten werken het betrouwbaarst. Bij sensoren zoekt de add-on naar een datum in de status of attributen; lukt dat niet, dan staat er een melding op de pagina "Afval".
- Verwijder je zo'n taak zelf, dan komt hij niet terug.

## Samen gebruiken (meerdere apparaten)

Alle apparaten delen dezelfde data op de server. Wijzigingen van anderen verschijnen binnen ongeveer 3 seconden (en direct bij terugkeren naar de app). Wijzigingen worden per item samengevoegd: als twee mensen tegelijk verschillende producten afvinken, blijven beide wijzigingen behouden. Wijzigen twee mensen precies hetzelfde item tegelijk, dan wint de laatste.

## Maaltijden (weekmenu)

Pagina "Maaltijden": plan per dag het avondeten, met wie er kookt en de ingrediënten. Kies je een eerder gerecht uit de suggesties, dan worden de ingrediënten overgenomen. "Naar lijst" (per maaltijd) en "Week naar boodschappenlijst" zetten ingrediënten op de boodschappenlijst, zonder dubbelen van wat er al open staat. Sensor: `sensor.huishoud_avondeten_vandaag` (attributen `kok`, `ingredienten`).

## Punten, beloningen en badges

- Elke taak levert punten op (standaard 10, instelbaar per taak). Rond je een taak af, dan krijgt de toegewezen gebruiker de punten; open je de taak weer, dan gaan ze terug. Verwijderde taken laten verdiende punten met rust. Elke 100 verdiende punten is een level.
- Beloningen maak je zelf aan (naam, icoon, kosten) en wissel je in met punten. Bonuspunten kun je handmatig geven.
- Badges (18) worden automatisch behaald en nooit ingetrokken: aantal taken, punten, dagen op rij, vroeg/laat, afval, specialist per ruimte, koken volgens het weekmenu en een eerste beloning. Een nieuwe badge verschijnt als melding, ook op andere apparaten.
- Sensoren: `sensor.huishoud_<naam>_punten` (attribuut `badges`).

## Recepten

Pagina "Recepten": bewaar gerechten die jullie vaker maken, met ingrediënten en bereiding. "Naar lijst" zet de ingrediënten met één klik op de boodschappenlijst (wat al open staat wordt overgeslagen). "Inplannen" zet het recept op een dag in het weekmenu, optioneel met kok en met de ingrediënten op de lijst. In het weekmenu kies je een recept uit de suggesties, of sla je een maaltijd op via "Als recept opslaan".

## Lijsten

Pagina "Lijsten": gedeelde afvinklijstjes naast de boodschappen (inpaklijst, klusjes, cadeau-ideeën…). Maak zelf lijsten of begin met een voorbeeld; items afvinken, verwijderen en "Klare items verwijderen" werken zoals bij de boodschappen. Alle apparaten zien dezelfde lijsten.

## Overzicht (statistieken)

Pagina "Overzicht": per week, maand, 90 dagen of jaar: afgeronde taken, percentage op schema, achterstallige taken en verdiende punten; verder afgerond per persoon en per ruimte, het verloop over de laatste 8 weken, de weekdagen waarop taken worden afgerond en de maaltijden in de periode.

## Offline werken

- Valt de verbinding weg terwijl de app open staat (bijv. in de winkel), dan werk je gewoon door: alles wordt lokaal bewaard en er staat een melding "Geen verbinding". Zodra er weer verbinding is, worden de wijzigingen automatisch verstuurd en per item samengevoegd met wat anderen intussen deden.
- Open je de app later opnieuw, dan worden niet-verstuurde wijzigingen eerst samengevoegd met de server, zodat er niets verloren gaat.
- Een service worker bewaart de app zelf, zodat hij ook bij opstarten zonder verbinding kan laden. Let op: de app draait in Home Assistant; die moet zelf ook kunnen laden. Opstarten zonder enige verbinding werkt dus alleen als Home Assistant (of de app erin) al in de cache van je telefoon of browser staat.

## Uiterlijk

Het menu en de pagina's gebruiken kleurrijke emoji als pictogrammen, elk onderdeel met een eigen kleur. Taken afvinken, een badge halen of een beloning inwisselen laat confetti vliegen. Wie liever geen bewegende elementen ziet, krijgt ze automatisch niet als "beweging verminderen" aan staat in het besturingssysteem.
