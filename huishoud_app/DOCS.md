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
