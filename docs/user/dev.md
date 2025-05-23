# Développement

## Style de code

Le code source de ce dépôt suit les conventions [XO](https://github.com/xojs/xo) malgré quelques modifications mineures consultables dans le fichier [package.json](/package.json)

Pour tester la conformité du code, exécutez la commande suivante :

```bash
npm run lint
```

## Tests

Les tests unitaires sont localisés au plus près du code, dans des répertoires `__tests__` qui reflettent l'arborescence du code source.

Pour lancer les tests unitaires, exécutez la commande suivante :

```bash
npm run test
```

Pour lancer les tests et produire des rapports de couverture de code au format LCOV et HTML, exécutez la commande suivante :

```bash
npm run test-lcov
```
