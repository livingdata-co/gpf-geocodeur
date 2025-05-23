# Démarrage du service

Avant de lancer le service, veuillez vérifier que :

- Le service a été correctement [installé](installation.md) et [configuré](configuration.md)
- Vous disposez des [données pré-indexées](indexation.md) dans votre dossier `data`.

Sur 5 terminaux différents, lancez successivement les 3 services d'index thématiques et le service exposant l'API publique :

```bash
npm run address:start
```

```bash
npm run parcel:start
```

```bash
npm run poi:start
```

```bash
npm run api:start
```

```bash
npm run worker:start
```
