# Génération des POI

Ce dépôt contient un script permettant de générer des POI prêts à indexer à partir de la BD TOPO.

Ce script est exécuté via la commande `npm run poi:build-from-bdtopo` tel qu'indiqué dans la [procédure de production des index thématiques](indexation.md).

Les règles d'extraction des POI sont définies dans le fichier [mapping.js](/indexes/poi/scripts/build-from-bdtopo/mapping.js).

Pour chaque couche de la BD TOPO, sont définies les règles de construction des champs `fields` ainsi que trois paramètres optionnels `filter`, `computeCommunes` et `simplification`.

## `fields`

Ce champs obligatoire permet de définir les règles de construction de chaque champ de l'objet POI à constituer.

Un champ peut être défini de 2 manières :

- avec une valeur primitive (`Number`, `String`, `Boolean`) ou un tableau de valeurs primitives si le champ est de type multiple ;
- avec une fonction prenant en arguments les propriétés de l'objet source BD TOPO et retournant une valeur primitive ou un tableau de valeurs primitives telles défini que ci-dessus.

## `extrafields`

Champs optionnel qui permet de définir les règles de construction des champs additionnels `extrafields` de l'objet POI à constituer. Le champs `cleabs` est automatiquement calculé.

Il fonctionne comme `fields`.

## `filter`

Fonction optionnelle permettant de déterminer si un objet source BD TOPO doit être pris en compte ou non par l'extraction. Elle prend en argument les propritétés de l'objet source BD TOPO et doit retourner un booléen (`true` si l'objet est conservé).

## `computeCommunes`

Par défaut : `false`

Si la value est définie à `true` alors le script tentera d'affecter un ou plusieurs citycode à l'objet considéré en effectuant une intersection spatiale. Les communes recouvrant plus de 40% de la surface de la géométrie d'un objet POI sont retenues.

## `simplification`

Si spécifié (`Number`) la géométrie est simplifiée avec le niveau de tolérance indiqué, dans l'unité du système WGS-84.
