# MusiClass

Application desktop Windows/macOS pour retrouver rapidement une partition dans un classeur physique.

## Lancer en développement

```powershell
npm.cmd install
npm.cmd run dev
```

## Construire

```powershell
npm.cmd run build
npm.cmd run dist:win
```

La version macOS doit être construite sur un Mac avec `npm run dist:mac`.

Les données sont enregistrées localement dans le stockage de l’application Electron.
