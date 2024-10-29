# Configuration

Les services et scripts sont exclusivement configurables à l'aide de variables d'environnement.

Il existe une grande variété de manière de définir ces variables, mais pour les non spécialistes le plus simple lors des développements ou de tests est encore de créer un fichier `.env` à la racine du répertoire de travail.

Pour gagner du temps vous pouvez tout simplement recopier le fichier `.env.sample` (`cp .env.sample .env`).

## Service API publique (run)

| Nom de la variable | Description | Valeur par défaut |
| --- | --- | --- |
| `API_PORT` | Port à utiliser pour le service | `3000` |
| `API_URL` | URL publique de l'API | |
| `PORT` | Port à utiliser pour le service (alias) | |
| `GEOCODE_INDEXES` | Types d'index à charger | `address,parcel,poi` |
| `ADDRESS_INDEX_URL` | URL du service d'index `address` | `http://localhost:3001` |
| `PARCEL_INDEX_URL` | URL du service d'index `parcel` | `http://localhost:3002` |
| `POI_INDEX_URL` | URL du service d'index `poi` | `http://localhost:3003` |
| `CORS_DISABLE` | Option permettant de désactiver les en-têtes CORS (en cas d'API Manager ou reverse proxy les prenant déjà en charge) (`1` pour désactiver) | `0` |
| `API_ROOT_REDIRECTION` | URL vers laquelle rediriger l’utilisateur s'il tente d'accéder à l'URL racine. Renvoie une `404` si non définie | |
| `REDIS_URL` | Chaîne de connexion vers la base de données Redis persistante | |
| `MAGIC_TOKEN` | **Dev**: jeton magique permettant de créer des projets en mode debug | |
| `JWT_SECRET` | Secret pour protéger les jetons JWT | |
| `GPF_AUTHORIZATION_URL` | URL pour l'authentification GPF | |
| `GPF_TOKEN_URL` | URL d'obtention des jetons GPF | |
| `GPF_CLIENT_ID` | Identifiant du client SSO GPF | |
| `GPF_CLIENT_SECRET` | Secret du client SSO GPF | |
| `GPF_ADMIN_ROLE` | Rôle SSO permettant de reconnaître un utilisateur comme admin du géocodeur | |
| `SUPERVISION_APP_URL` | URL publique de l'interface de supervision (front) | |
| `STORAGE_FS_DIR` | Indique le répertoire à utiliser pour stoquer les fichiers du géocodage en masse (ne pas utiliser en production) | `./storage/` |
| `STORAGE_S3_ENDPOINT` | Informations de connexion au bucket S3 servant au stockage des fichiers du géocodage en masse | |
| `STORAGE_S3_REGION` | Idem | |
| `STORAGE_S3_BUCKET_NAME` | Idem | |
| `STORAGE_S3_ACCESS_KEY` | Idem | |
| `STORAGE_S3_SECRET_KEY` | Idem | |

## Services d'index thématiques (run)

| Nom de la variable | Description | Valeur par défaut |
| --- | --- | --- |
| `ADDRESS_SERVICE_PORT` | Port à utiliser pour le service `address` | `3001` |
| `PARCEL_SERVICE_PORT` | Port à utiliser pour le service `parcel` | `3002` |
| `POI_SERVICE_PORT` | Port à utiliser pour le service `poi` | `3003` |
| `PORT` | Port à utiliser pour le service (alias) | |

## Worker (run)

| Nom de la variable | Description | Valeur par défaut |
| --- | --- | --- |
| `REDIS_URL` | Chaîne de connexion vers la base de données Redis persistante | |
| `WORKERS_CONCURRENCY` | Nombre de géocodages asynchrones lancés par worker | Nombre de CPU |
| `SMTP_HOST` | Nom d'hôte du serveur SMTP pour l'envoi des notifications |  |
| `SMTP_PORT` | Port du serveur SMTP |  |
| `SMTP_USER` | Utilisateur du serveur SMTP |  |
| `SMTP_PASS` | Mot de passe du serveur SMTP |  |
| `SMTP_SECURE` | Le serveur SMTP attend-il une authentification sécurisée (`YES`) | `NO` |
| `SMTP_FROM` | Expéditeur à utiliser pour les notifications (`Nom complet <expediteur@ign.fr>`) |  |
| `SMTP_BCC` | Destinataires en copie cachée, séparés par des virgules |  |
| `SHOW_EMAILS` | Affiche le contenu des notifications dans les logs (`YES`) | `NO` |

## Récupération des index pré-existants (build)

| Nom de la variable | Description | Valeur par défaut |
| --- | --- | --- |
| `ADDRESS_ARCHIVE_URL` | URL vers l'archive des données pré-indexées (address) | |
| `ADDRESS_ARCHIVE_URL_RESOLVER` | URL vers le pointeur contenant l'URL vers les dernières données pré-indexées (address) | |
| `POI_ARCHIVE_URL` | URL vers l'archive des données pré-indexées (poi) | |
| `POI_ARCHIVE_URL_RESOLVER` | URL vers le pointeur contenant l'URL vers les dernières données pré-indexées (poi) | |
| `PARCEL_ARCHIVE_URL` | URL vers l'archive des données pré-indexées (parcel) | |
| `PARCEL_ARCHIVE_URL_RESOLVER` | URL vers le pointeur contenant l'URL vers les dernières données pré-indexées (parcel) | |

## Production des index (build)

| Nom de la variable | Description | Valeur par défaut |
| --- | --- | --- |
| `BAN_ADDOK_URL` | Structure d'URL du millésime BAN Addok à utiliser | `https://adresse.data.gouv.fr/data/ban/adresses/latest/addok/adresses-addok-{dep}.ndjson.gz` |
| `PARCELLAIRE_EXPRESS_URL` | Structure d'URL du millésime PARCELLAIRE EXPRESS à utiliser | |
| `ADMIN_EXPRESS_URL` | Structure d'URL du millésime ADMIN COG à utiliser | |
| `BDTOPO_URL` | Structure d'URL du millésime BD TOPO à utiliser | |
| `DEPARTEMENTS` | Liste des départements à prendre en compte (tous si non renseigné) | |

## Publication des index sur S3 (build)

| Nom de la variable | Description | Valeur par défaut |
| --- | --- | --- |
| `S3_REGION` | Région du stockage S3 | |
| `S3_ENDPOINT` | URL du stockage S3 | |
| `S3_BUCKET` | Nom du bucket | |
| `S3_PREFIX` | Préfixe pour le nom de l'objet créé | |
| `S3_VHOST` | V-Host du stockage S3 pour l'accès public. Nécessaire pour produire les pointeurs `latest` | |
| `S3_ACCESS_KEY` | Clé d'accès S3 | |
| `S3_SECRET_KEY` | Secret | |

## Avancé

Les variables suivantes n'ont en principe pas besoin d'être modifiées. Utilisez les si vous souhaitez par exemple placer les données sur un disque plus rapide ou disposant de caractéristiques intéressantes.

| Nom de la variable | Description | Valeur par défaut |
| --- | --- | --- |
| `TMP_PATH` | Répertoire temporaire pour les archives téléchargées | `./tmp` |
| `DATA_PATH` | Répertoire contenant les données produites ou utilisées | `./data` |
| `GEOSERVICES_DOWNLOAD_RETRIES` | Nombre de tentatives supplémentaires en cas d’échec pour récupérer un fichier provenant des Géoservices | `1` |
| `ADDOK_REQUEST_TIMEOUT` | Temps d'attente maximum pour un requête transmise à un noeud addok | `2000` |

## Géoplateforme

| Nom de la variable | Description | Valeur par défaut |
| --- | --- | --- |
| `GPF_LOGGER_ENABLED` | Active le logger GPF (formattage spécifique) | `0` |
