# Čísielka – prototyp

Klikateľný prototyp webového portálu pre **externých účtovníkov a malé účtovnícke kancelárie**. Slúži na rozhovory s účtovníkmi: aby si vedeli rýchlo predstaviť, ako by produkt fungoval, a aby sme overili, či rieši ich reálny problém.

> Problém, ktorý riešime: *„Ako dostanem od 30 klientov všetky doklady za mesiac bez toho, aby som im 30-krát písala email a pamätala si, kto mi čo ešte neposlal?“*

Prototyp je **čisto frontendový** – všetky dáta sú ukážkové, uložené len v prehliadači (localStorage). Neodosielajú sa žiadne emaily, nič sa neukladá na server.

## Spustenie

Potrebný je Node.js 18+.

```bash
npm install
npm run dev
```

Aplikácia beží na adrese, ktorú vypíše Vite (typicky http://localhost:5173).

Produkčný build: `npm run build` (výstup v `dist/`, statické súbory – dajú sa nasadiť kamkoľvek).

## Ovládanie dema

Tmavá lišta úplne hore nie je súčasťou produktu, slúži len na ovládanie ukážky:

| Ovládanie | Čo robí |
|---|---|
| **Účtovníčka / Klient** | Prepína pohľad medzi účtovníčkou (desktop) a jej klientom (mobilný portál). Pri klientovi sa dá vybrať, za koho sa pozeráme. |
| **Simulovaný dátum** | Demo beží v simulovanom čase (štart: 9. 10. 2026, uzávierka za september). |
| **+1 deň** | Posunie čas o deň a spustí automatické pripomienky – takto sa dá naživo ukázať, ako systém sám nahání klientov. |
| **Reset** | Vráti všetky ukážkové dáta do pôvodného stavu. |

## Implementovaná funkcionalita

### Pohľad účtovníčky

- **Prehľad** – na jednom mieste vidí, čo čaká na ňu, čo čaká na klientov, čo je po termíne a koľko dokladov treba skontrolovať. Tabuľka uzávierky za september ukazuje pri každom klientovi, koľko požiadaviek už je splnených.
- **Požiadavky** – zoznam všetkých požiadaviek voči klientom s filtrami podľa stavu (Čaká na mňa, Čaká na klienta, Po termíne, Vyriešené), klienta a textu.
- **Nová požiadavka** – výber klienta, typ (nahrať doklad / otázka / dodať informáciu), rýchle šablóny (bankový výpis, faktúry od dodávateľov, bločky za PHM, nejasná platba na výpise…), termín a automatické pripomienky. Klientovi „odíde“ email.
- **Detail požiadavky** – zadanie, priložené doklady, **vlákno správ s klientom** (komunikácia ostáva pri konkrétnej požiadavke, nestratí sa v emailoch), akcie *Vyriešiť / Vrátiť klientovi / Pripomenúť teraz* a **história** (kto čo kedy urobil, vrátane automatických pripomienok).
- **Klienti** – zoznam klientov so stavom uzávierky a detail klienta (kontakty, požiadavky, doklady, celá história).
- **Doklady** – všetky nahraté doklady so stavmi **Nahrané → Skontrolované → Exportované**. V detaile dokladu účtovníčka vidí náhľad, doplní/skontroluje údaje (dodávateľ, IČO, DIČ, číslo, dátumy, základ, DPH, suma) a doklad schváli.
- **Export do Pohody** – vybrané skontrolované doklady sa stiahnu ako **POHODA XML** (dataPack s prijatými faktúrami), ktorý sa importuje cez *Súbor → Datová komunikace → XML import*. Systém **upozorní pri pokuse exportovať doklad druhýkrát**.
- **Notifikácie** – zvonček s udalosťami (klient nahral doklad, odpovedal, nereaguje ani po pripomienkach).
- **Vyhľadávanie** – klienti, požiadavky aj doklady (dodávateľ, číslo faktúry, IČO).
- **Nastavenia** – kedy sa posielajú automatické pripomienky (predvolene: 1. po 3 dňoch, 2. po 7 dňoch, po 10 dňoch upozornenie účtovníčke).

### Pohľad klienta (mobil)

- Otvára sa cez odkaz z emailu, **bez registrácie a hesla**.
- Úvodná obrazovka: *„Účtovníčka od vás potrebuje 2 veci“* – jasný zoznam úloh s termínom.
- **Nahranie dokladu** – výber súborov, drag & drop alebo **odfotenie mobilom**, voliteľná poznámka a tlačidlo *Odovzdať účtovníčke*.
- Odpoveď na otázku (napr. *„Čo bola platba 1 250 € pre Alza.sk?“*) a správy k požiadavke.
- **Odovzdané** – prehľad všetkého, čo klient poslal, a v akom je to stave.
- **Správy** – ukážka emailov a pripomienok, ktoré klientovi chodia.

### Automatické pripomienky

```
Požiadavka vytvorená → email klientovi
        ↓ 3 dni bez reakcie
1. automatická pripomienka
        ↓ 7 dní
2. automatická pripomienka
        ↓ 10 dní
upozornenie účtovníčke („klient nereaguje“)
```

## Odporúčaný scenár ukážky (cca 5 minút)

1. **Prehľad** – „Takto by ste ráno videli, čo od koho chýba.“ Ukázať klienta Ján Mráz (po termíne, nereaguje).
2. **Nová požiadavka** pre Petra Kováča cez šablónu (napr. *Bločky za PHM*) → odoslať.
3. Prepnúť na **Klient** (Peter Kováč) – ukázať, aké jednoduché to má klient: otvoriť požiadavku, nahrať fotku/PDF, *Odovzdať*.
4. Späť na **Účtovníčku** – notifikácia, požiadavka je v stave *Čaká na mňa*, v histórii je všetko zaznamenané.
5. Otvoriť doklad → doplniť údaje → **Schváliť** → **Doklady → Exportovať do Pohody** → stiahne sa XML. Skúsiť exportovať znova → upozornenie na duplicitu.
6. **+1 deň** niekoľkokrát – automatické pripomienky sa objavia v histórii požiadavky a v *Správach* klienta; Novák Stavby prekročí 10 dní a príde upozornenie účtovníčke.
7. **Reset** pred ďalším rozhovorom.

Otázky na rozhovor sú v `01_predstava_o_trhu_a_zakaznikoch.md` (sekcia 6).

## Čo zámerne nie je v prototype

- AI kontrola chýb v účtovníctve (DPH vs. kontrolné hlásenie, kurzy, banka, zaokrúhlenie) – rozšírená verzia, diplomová práca.
- OCR / automatické vyťaženie údajov z dokladov – údaje zatiaľ dopĺňa účtovníčka ručne.
- Skutočné emaily, prihlasovanie, backend, databáza, viac používateľov v kancelárii a práva.
- Priama integrácia s Pohodou, Money, KROS (len export XML súboru).
- Vystavovanie faktúr, bankové napojenia, mzdy.

## Technické poznámky

- Vite + React 18 + TypeScript + Tailwind CSS, routing cez `react-router` (HashRouter).
- Stav aplikácie: `src/store/AppStore.tsx` (React Context + localStorage), ukážkové dáta: `src/data/seed.ts`.
- Export do Pohody: `src/lib/pohodaXml.ts`.
- Architektúra je zámerne jednoduchá – ide o prototyp na overenie konceptu, nie o základ produkčného systému.
