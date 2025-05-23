# Procédure d'installation

Cette page traite de l’installation native du géocodeur sans le recours à Docker. Pour installer le géocodeur avec Docker suivez les instructions du dernier paragraphe.

## Note relative à Windows

L'utilisation du géocodeur sous Windows n'a pas été testée. L'utilisation de l'image Docker est dans ce cas fortement recommandée.

## Pré-requis

Pour faire fonctionner le géocodeur vous devez disposer des logiciels suivants installés :

- [Node.js](https://nodejs.org) LTS 20.9+
- [Python](https://www.python.org) 3.10
- [Redis](https://redis.io) 7.x

Pour installer Python vous pouvez par exemple utiliser [pyenv](https://github.com/pyenv/pyenv).

## Environnement de compilation

Afin de pouvoir compiler les modules natifs Node.js et Python, vous devez disposer des outils nécessaires.

Sous macOS, les Developer Tools suffisent.

Sous Debian/Ubuntu, vous pouvez par exemple installer les paquets suivants :

```bash
sudo apt install build-essential gcc
```

## 7zip

Pour produire les index `poi` et `parcel` vous aurez aussi besoin de la commande `7z`.

Vous pouvez par exemple installer le package `p7zip` sous Debian/Ubuntu ou sous macOS/Homebrew.

```bash
brew install p7zip
# ou
sudo apt install p7zip
```

## Cloner le dépôt

Commencez par cloner ce dépôt avec la commande `git` adaptée. Vous aussi aussi vous contenter de télécharger les sources et d’extraire l’archive.

Placez-vous ensuite dans ce répertoire.

## Installer addok

[addok](https://addok.readthedocs.org) et quelques plugins sont nécessaires pour produire et faire fonctionner les index `address` et `poi`.

```bash
pip install -r requirements.txt
```

## Installer les dépendances Node.js

```bash
npm install
```

Vous pouvez désormais passer à l'étape suivante : [Configuration](configuration.md).

## Image Docker

L'image Docker pour `linux/amd64` peut être produite à partir du `Dockerfile`. Toutes les fonctionnalités sont alors immédiatement disponibles.
