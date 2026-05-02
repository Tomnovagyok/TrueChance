<h1 align="center">NodeJS - Template project</h1>

## readme.md preview megnyitása:<br>

`Ctrl + Shift + V`<br>

## package.json fájl létrehozása, amennyiben nem létezik:<br>

1. Terminal megnyitása.<br>

2. npm init<br>

3. **Package name:** A projekt neve<br>

4. **Version:** Elég egy entert nyomni<br>

5. **Description:** Leírása a projektnek _(valamilyen stringet megadunk, majd enter)_<br>

6. **Entry point:** elég egy entert nyomnunk<br>

7. **Test command:** elég egy entert nyomnunk<br>

8. **Git repository:** elég egy entert nyomnunk<br>

9. **Keywords:** elég egy entert nyomnunk<br>

10. **Author:** beírhatjuk a saját nevünket<br>

11. **License:** elég egy entert nyomnunk<br>

12. Ezután megjelenik az, hogy ez a fájl, amit szeretnénk-e létrehozni, majd egy enter megadásával létrehozhatjuk a **package.json** fájlt.<br>

## NodeJS - Template project használata:<br>

1. Töltsd le a Template project-et és csomagold ki.<br>

2. Lépj be a backend mappába:<br>
   `cd backend`<br>

3. Telepítsd a függőségeket a backend mappába a következő parancs segítségével, amennyiben nincs node_modules mappa a backend mappában:<br>
   `npm install`<br>

4. Backend indítása fejlesztés alatt: _(Fájlok szerkesztésének az esetén újraindul a szerver.)_<br>
   `npm run dev`<br>

5. Backend indítása élesben: _(Fájlok szerkesztésének az esetén nem indul újra a szerver.)_<br>
   `npm run start`<br>

## NPM hiba esetén<br>

Amennyiben a npm run start nem működik a következő hiba miatt:<br>

```
Cannot be loaded because running scripts is disabled on this system.
```

#### Megoldás:<br>

Át kell állítani a PowerShell végrehajtási házirendjét. Ezt rendszergazdai jogosultságokkal futó PowerShell-ben tudod megtenni:<br>

1. Nyisd meg a PowerShell-t.<br>

2. Állítsd be az Execution Policy-t a következő parancs segítségével:<br>

```
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

3. Nyomj enter-t.

4. Zárd be és nyisd újra a VS Code-ot.

## Használat:<br>

Nyisd meg a böngésződben a **http://localhost:3000** címet.

## Felhasznált npm package-ek backend-en:<br>

`nodemon`<br>
`express`<br>
`express-session`<br>
`multer`<br>
`mysql2`<br>

## nodemon.json felépítése:<br>

1. **"watch": ["."]:** megadja, hogy a teljes projektmappát figyelje a nodemon.<br>

2. **"ext": "js":** Ha bármely .js fájl változik → Nodemon újraindítja a szervert.<br>

3. **"exec": "node server.js":** Ezt a parancsot futtatja a nodemon minden újraindításkor.<br>

4. **"legacyWatch": true:** Engedélyezi a lassabb, de stabilabb fájlfigyelési módot.<br>

5. **"usePolling": true:** Rendszeresen ellenőrzi, változott-e a fájl.<br>

6. **"interval": 1000:** Meghatározza, hogy a polling milyen időközönként történjen az ellenőrzés.<br>

```json
{
    "watch": ["."],
    "ext": "js",
    "exec": "node server.js",
    "legacyWatch": true,
    "watchOptions": {
        "usePolling": true,
        "interval": 1000
    }
}
```

## .prettierrc fájl felépítése:<br>

1. Létrehozunk a projektünkben a következő néven egy fájlt: .prettierrc<br>

2. A fájlban nyitunk kapcsos zárójeleket, amelyek közé definiálhatjuk, hogy miket formázzon automatikusan a prettier<br>

3. Beállítása annak, hogy minden idézőjel szimpla idézőjel legyen: ”singleQuote”: true (false értékkel minden szimpla rendes idézőjel lesz).<br>

4. Annak beállítása, hogy legyen-e szóköz az objektum kapcsos zárójelei között: "bracketSpacing": true<br>

5. Annak meghatározása, hogy maximum hány karakter hosszú lehet egy sor: "printWidth": 100<br>

6. Beállítása annak, hogy a tabulátor hány szóközt érjen: "tabWidth": 4<br>

7. Annak meghatározása, hogy egy objektum esetén az utolsó sor után ne szerepeljen vessző: "trailingComma": "none"<br>

```
{
    "singleQuote": true,
    "bracketSpacing": true,
    "printWidth": 100,
    "tabWidth": 4,
    "trailingComma": "none"
}
```

## .prettierrc használata:<br>

1. Az Extensions fülben telepítsd a prettier-t.<br>

2. Keresd meg a VS Code beállításokban az editor.defaultFormatter opciót és válasszuk ki a Prettiert, mint formázót.<br>

3. Settings => Rákeresés a következőre: Format => Editor: Format On Save _(Ez legyen bekapcsolva)_<br>

4. Keyboard shortcuts => Format document => CMD + P / CTRL + P<br>

5. Egyéb: Prettier ignorálás: (sor elé) // prettier-ignore<br>

## Amennyiben egy port-on továbbra is futna a szerver, viszont a terminal-t már bezártuk, így onnan nem tudjuk leállítani:<br>

`npx kill-port port`<br>

`npx kill-port 3000`<br>
