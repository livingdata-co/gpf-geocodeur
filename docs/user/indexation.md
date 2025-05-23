# Production des index thématiques

Pour déployer une instance du géocodeur il est nécessaire de disposer de données spécialement structurées qu'on appelera "index". Il y a un jeu de données par thématique.

S'il est plus simple d'utiliser des données déjà prêtes à l'emploi, il peut dans certains cas être judicieux de les générer soi-même.

## Pré-requis

Pour exécuter les commandes présentées dans cette page vous devez disposer d'une [installation valide](installation.md).

Dans le cas de Docker pensez à créer un volume pour le répertoire `/data` interne à l'image afin de pouvoir éventuellement récupérer les données produites.

Par défaut le répertoire contenant les données produite est `./data` dans le cas d'une installation native et `/data` dans le cas d'un conteneur Docker. Ceci peut-être modifié au travers de la variable d'environnement `DATA_PATH`.

Pour chaque thématique il est possible de restreindre les données produites à une liste de départements français en spécifiant la variable d'environnement `DEPARTEMENTS`. Par exemple pour la Moselle et le Var : `DEPARTEMENTS=57,83`.

## Production des données

### Index address

La variable d'environnement `BAN_ADDOK_URL` doit être renseignée au préalable. Elle doit contenir une URL paramétrable pointant vers les données de la Base Adresse Nationale (ou structurées de la même manière, au format Addok JSON).

La valeur recommandée est :

```bash
BAN_ADDOK_URL=https://adresse.data.gouv.fr/data/ban/adresses/latest/addok/adresses-addok-{dep}.ndjson.gz
```

La production de l'index se fait à l'aide de la commande suivante :

```bash
npm run address:build-index
```

Sur une machine moyenne satisfaisant aux exigences techniques présentées sur la page [Architecture](../architecture.md) l'opération dure environ **30 minutes** et génère des fichiers pesant environ **9 Go**.

### Index parcel

La variable d'environnement `PARCELLAIRE_EXPRESS_URL` doit être renseignée au préalable. Elle doit contenir une URL paramétrable pointant vers un millésime du produit PARCELLAIRE EXPRESS de l'IGN.

Exemple de configuration :

```bash
PARCELLAIRE_EXPRESS_URL=https://gpf-ign-data.s3.sbg.io.cloud.ovh.net/parcellaire-express/PARCELLAIRE_EXPRESS_1-1__SHP_{crs}_{dep}_2023-07-01.7z
```

La production de l'index se fait à l'aide de la commande suivante :

```bash
npm run parcel:build-index
```

Sur une machine moyenne satisfaisant aux exigences techniques présentées sur la page [Architecture](../architecture.md) l'opération dure environ **7 heures** et génère des fichiers pesant environ **40 Go**.

**Attention** : sur une machine avec un disque distant, peu performant, et/ou si la source de téléchargement des données PARCELLAIRE EXPRESS dispose d'une faible bande passante ce traitement peut facilement durer plusieurs jours !!!

### Index poi

Les variables d'environnement `ADMIN_EXPRESS_URL` et `BDTOPO_URL` doivent être renseignées au préalable. Elles doivent contenir des URL paramétrables pointant vers des millésimes des produits BD TOPO et ADMIN EXPRESS COG de l'IGN.

Exemple de configuration :

```bash
ADMIN_EXPRESS_URL=https://gpf-ign-data.s3.sbg.io.cloud.ovh.net/admin-express/ADMIN-EXPRESS-COG_3-2__SHP_WGS84G_FRA_2023-05-03.7z
BDTOPO_URL=https://gpf-ign-data.s3.sbg.io.cloud.ovh.net/bdtopo/BDTOPO_3-3_TOUSTHEMES_GPKG_{crs}_{dep}_2023-09-15.7z
```

La production de l'index se fait à l'aide des commandes suivantes :

```bash
npm run poi:build-from-bdtopo # environ 2 heures
npm run poi:build-index # environ 20 minutes
```

Sur une machine moyenne satisfaisant aux exigences techniques présentées sur la page [Architecture](../architecture.md) l'opération dure environ **3 heures** et génère des fichiers pesant environ **10 Go**.

## Stockage S3 des données

Afin de faciliter le déploiement dans certains environnement de production, ce dépôt inclut des commandes pour publier les données indexées sur un bucket S3.

Pour cela, vous devez tout d'abord [configurer les variables d'environnement correspondantes](configuration.md).

Les objets créés par le processus de publication ont la forme suivante : `{prefix}index-{type}-{datetime}.tar.gz`.\
Exemple : `sample-57-index-address-2023-07-25-22-11-29.tar.gz`

```bash
npm run address:publish-index
npm run poi:publish-index
npm run parcel:publish-index
```

L'opération prend quelques minutes en raison de la compression `gzip` et du temps de transfert (variable selon l'infrastructure S3 utilisée et votre localisation).

## Récupération de données pré-indexées

Pour récupérer les données pré-générées par des tiers ou via l'étape précédente, vous pouvez indiquer dans la configuration le chemin direct vers chaque archive ou le chemin vers le pointeur `latest` qui lui contient l'URL finale.

Ces informations sont communiquées par le fournisseur ou en cohérence avec l'étape précédente.

Les commandes à utiliser ensuite sont les suivantes (pour chaque thématique) :

```bash
npm run address:download-index
npm run poi:download-index
npm run parcel:download-index
```
