# Démarrage du service

Avant de lancer le service, veuillez vérifier que :

- Le service a été correctement [installé](installation.md) et [configuré](configuration.md)
- Vous disposez des [données pré-indexées](indexation.md) dans votre dossier `data`.

Sur 5 terminaux différents, lancez successivement les 3 services d'index thématiques et le service exposant l'API publique :

```bash
yarn address:start
```

```bash
yarn parcel:start
```

```bash
yarn poi:start
```

```bash
yarn api:start
```

```bash
yarn worker:start
```
