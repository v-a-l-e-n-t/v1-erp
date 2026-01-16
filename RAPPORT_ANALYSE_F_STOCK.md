# Rapport d'Analyse - Fichier f_stock.xlsx

**Date d'analyse** : $(date)  
**Fichier analysé** : `f_stock.xlsx`  
**Type de fichier** : Fichier Excel de suivi de stocks de bouteilles GPL

---

## 📊 Vue d'ensemble

Le fichier `f_stock.xlsx` est un fichier de suivi de stocks de bouteilles GPL (Gaz de Pétrole Liquéfié) utilisé par l'entreprise SAEPP. Il contient **10 feuilles** organisant différents types de stocks et états de bouteilles.

### Caractéristiques générales
- **Nombre total de feuilles** : 10
- **Structure** : Fichier Excel avec feuilles de calcul
- **Objectif** : Suivi détaillé des stocks de bouteilles par catégorie et emplacement
- **Types de bouteilles suivis** : B6 (6kg), B12 (12.5kg), B28 (28kg), B38 (38kg)

---

## 📑 Détail des Feuilles

### 1. **Accueil**
- **Type** : Page de navigation
- **Lignes** : 11
- **Colonnes** : 8
- **Données** : Aucune donnée de stock (page d'accueil uniquement)
- **Description** : Page d'accueil servant de menu de navigation vers les autres feuilles

---

### 2. **Btles Neuve _ DV** (Bouteilles Neuves - Dépôt Vrac)
- **Type** : Suivi de stocks
- **Lignes** : 350 (21 lignes de données)
- **Colonnes** : 20
- **Ligne d'en-tête** : Ligne 3
- **Description** : Suivi des bouteilles neuves stockées au dépôt vrac
- **Données** : 21 lignes de données réelles
- **Année de référence** : 2026

**Objectif métier** : 
- Suivre l'inventaire des bouteilles neuves au dépôt vrac
- Permettre le suivi des mouvements (entrées/sorties) de bouteilles neuves

---

### 3. **Btles HS _ DV** (Bouteilles Hors Service - Dépôt Vrac)
- **Type** : Suivi de stocks
- **Lignes** : 332 (14 lignes de données)
- **Colonnes** : 21
- **Ligne d'en-tête** : Ligne 3
- **Description** : Suivi des bouteilles hors service au dépôt vrac
- **Données** : 14 lignes de données réelles
- **Année de référence** : 2025

**Objectif métier** :
- Tracker les bouteilles endommagées ou hors service
- Gérer le retrait de la circulation des bouteilles défectueuses
- Planifier les réparations ou recyclages

---

### 4. **RECONFIGURATION**
- **Type** : Suivi de stocks
- **Lignes** : 326 (6 lignes de données)
- **Colonnes** : 21
- **Ligne d'en-tête** : Ligne 3
- **Description** : Suivi des bouteilles en reconfiguration/manutention
- **Données** : 6 lignes de données réelles
- **Année de référence** : 2025

**Objectif métier** :
- Suivre les bouteilles en cours de reconfiguration
- Gérer les opérations de manutention et transformation
- Tracker les bouteilles en transit entre différents états

---

### 5. **Consigne _ CE** (Consignes - Centre d'Emplissage)
- **Type** : Suivi de stocks
- **Lignes** : 334 (19 lignes de données)
- **Colonnes** : 30 (la plus large)
- **Ligne d'en-tête** : Ligne 3
- **Description** : Suivi des bouteilles consignées au centre d'emplissage
- **Données** : 19 lignes de données réelles
- **Année de référence** : 2026

**Objectif métier** :
- Gérer le système de consigne (bouteilles réutilisables)
- Suivre les bouteilles consignées par les clients
- Gérer le retour et la réutilisation des bouteilles

---

### 6. **PARC BOUTEILLES CE (PI & TEMCI)**
- **Type** : Suivi de stocks
- **Lignes** : 340 (14 lignes de données)
- **Colonnes** : 21
- **Ligne d'en-tête** : Ligne 3
- **Description** : Parc de bouteilles au centre d'emplissage (PI & TEMCI)
- **Données** : 14 lignes de données réelles
- **Année de référence** : 2025

**Objectif métier** :
- Gérer le parc de bouteilles spécifique aux clients PI (Petro Ivoire) et TEMCI
- Suivre les stocks dédiés par client
- Optimiser l'allocation des bouteilles par client

---

### 7. **Synthèses Stocks (2)**
- **Type** : Synthèse consolidée
- **Lignes** : 265 (19 lignes de données)
- **Colonnes** : 22
- **Ligne d'en-tête** : Ligne 3
- **Description** : Synthèses et états de stocks consolidés
- **Données** : 19 lignes de données réelles
- **Taux de remplissage** : 4.17% (le plus élevé)

**Objectif métier** :
- Consolider les données de toutes les catégories de stocks
- Fournir une vue d'ensemble des états de stocks
- Générer des rapports de synthèse pour la direction

---

### 8. **STOCK OUTILS VIVO**
- **Type** : Suivi de stocks spécialisés
- **Lignes** : 257 (6 lignes de données)
- **Colonnes** : 18
- **Ligne d'en-tête** : Ligne 3
- **Description** : Stock d'outils et bouteilles VIVO ENERGY
- **Données** : 6 lignes de données réelles
- **Année de référence** : 2025

**Objectif métier** :
- Gérer les stocks spécifiques au client VIVO ENERGY
- Suivre les outils et équipements associés
- Gérer l'inventaire dédié client

---

### 9. **PEINTURE TDS**
- **Type** : Suivi de stocks en transformation
- **Lignes** : 335 (14 lignes de données)
- **Colonnes** : 19
- **Ligne d'en-tête** : Ligne 5
- **Description** : Suivi des bouteilles à la peinture
- **Données** : 14 lignes de données réelles
- **Types de bouteilles** : B6, B12
- **Année de référence** : 2025

**Objectif métier** :
- Suivre les bouteilles en cours de peinture/transformation
- Gérer le processus de personnalisation des bouteilles
- Tracker les bouteilles en attente de finition

---

### 10. **Synthèses Stocks**
- **Type** : Synthèse consolidée
- **Lignes** : 265 (19 lignes de données)
- **Colonnes** : 23 (la plus large)
- **Ligne d'en-tête** : Ligne 3
- **Description** : Synthèses et états de stocks consolidés
- **Données** : 19 lignes de données réelles
- **Date de référence** : 05/01/2026
- **Taux de remplissage** : 4.10%

**Objectif métier** :
- Vue consolidée la plus récente des stocks
- Rapport de synthèse avec date de référence
- Tableau de bord exécutif des stocks

---

## 🔍 Analyse des Données

### Structure des données
- **Format standardisé** : Toutes les feuilles suivent une structure similaire
  - Lignes 1-2 : En-tête SAEPP
  - Ligne 3 : Titre de la feuille et type de suivi
  - Ligne 4 : Espacement
  - Ligne 5+ : En-têtes de colonnes et données

### Types de bouteilles suivis
- **B6** : Bouteilles de 6 kg
- **B12** : Bouteilles de 12.5 kg
- **B28** : Bouteilles de 28 kg (mentionnées mais peu présentes)
- **B38** : Bouteilles de 38 kg (mentionnées mais peu présentes)

### Catégories de stocks identifiées

1. **Stocks par état physique** :
   - Bouteilles neuves
   - Bouteilles hors service
   - Bouteilles en reconfiguration
   - Bouteilles à la peinture

2. **Stocks par emplacement** :
   - Dépôt Vrac (DV)
   - Centre d'Emplissage (CE)

3. **Stocks par type de gestion** :
   - Consignes (réutilisables)
   - Parc client (PI & TEMCI)
   - Stock outils (VIVO)

4. **Synthèses** :
   - Synthèses consolidées
   - États de stocks

---

## 📈 Statistiques Globales

| Métrique | Valeur |
|----------|--------|
| Nombre total de feuilles | 10 |
| Feuilles avec données | 9 |
| Feuille la plus large | Synthèses Stocks (23 colonnes) |
| Feuille avec le plus de données | Btles Neuve _ DV (21 lignes) |
| Taux de remplissage moyen | ~2-4% |
| Années couvertes | 2025, 2026 |

---

## 🎯 Objectifs Métier du Fichier

### 1. **Traçabilité Complète**
- Suivre chaque bouteille selon son état et son emplacement
- Historique des mouvements de stocks
- Identification des bouteilles par type (B6, B12, B28, B38)

### 2. **Gestion Multi-États**
- Bouteilles neuves → en service → hors service → reconfiguration
- Cycle de vie complet des bouteilles
- Gestion des transformations (peinture, reconfiguration)

### 3. **Gestion Multi-Clients**
- Stocks dédiés par client (PI, TEMCI, VIVO)
- Parc de bouteilles par client
- Outils et équipements par client

### 4. **Optimisation des Stocks**
- Synthèses pour prise de décision
- Identification des goulots d'étranglement
- Planification des approvisionnements

### 5. **Conformité et Reporting**
- États de stocks consolidés
- Rapports pour la direction
- Traçabilité réglementaire

---

## 🔗 Intégration avec l'ERP GazPILOT

### Points de connexion potentiels

1. **Module Production** :
   - Les bouteilles produites doivent être suivies dans ce fichier
   - Lien avec les lignes de production (B6, B12, B28, B38)

2. **Module Distribution** :
   - Les sorties conditionnées correspondent aux bouteilles sorties du stock
   - Les retours marché (fuyardes) doivent être réintégrés dans le suivi

3. **Module VRAC** :
   - Moins de connexion directe (VRAC = vrac, pas bouteilles)

### Recommandations d'intégration

1. **Import automatique** :
   - Créer un module d'import pour synchroniser les données
   - Automatiser la mise à jour des stocks depuis l'ERP

2. **Export vers f_stock.xlsx** :
   - Générer automatiquement les rapports de stocks
   - Exporter les données consolidées

3. **Double saisie à éviter** :
   - Intégrer le fichier Excel dans l'ERP
   - Éliminer la saisie manuelle redondante

---

## ⚠️ Observations et Recommandations

### Points d'attention

1. **Faible taux de remplissage** :
   - La plupart des feuilles ont un taux de remplissage de 1-4%
   - Beaucoup d'espaces vides (structure prévue pour croissance)

2. **Données dispersées** :
   - 10 feuilles différentes pour différents types de stocks
   - Risque de désynchronisation entre feuilles

3. **Format Excel** :
   - Dépendance à un format propriétaire
   - Risque de corruption ou de perte de données
   - Difficulté de versioning

4. **Saisie manuelle** :
   - Probable saisie manuelle des données
   - Risque d'erreurs humaines
   - Pas de validation automatique

### Recommandations

1. **Migration vers base de données** :
   - Intégrer ce suivi dans l'ERP GazPILOT
   - Créer des tables dédiées pour chaque type de stock
   - Automatiser les calculs et consolidations

2. **Automatisation** :
   - Connecter avec le module Production pour les entrées
   - Connecter avec le module Distribution pour les sorties
   - Générer automatiquement les synthèses

3. **Validation des données** :
   - Implémenter des règles de validation
   - Détecter les incohérences automatiquement
   - Alertes en cas d'anomalies

4. **Reporting amélioré** :
   - Tableaux de bord interactifs
   - Graphiques et visualisations
   - Export PDF automatique

---

## 📝 Conclusion

Le fichier `f_stock.xlsx` est un outil de suivi de stocks de bouteilles GPL essentiel pour l'entreprise SAEPP. Il couvre tous les aspects du cycle de vie des bouteilles :
- États physiques (neuves, HS, reconfiguration, peinture)
- Emplacements (dépôt vrac, centre d'emplissage)
- Clients (PI, TEMCI, VIVO)
- Types de bouteilles (B6, B12, B28, B38)

**Recommandation principale** : Intégrer ce suivi dans l'ERP GazPILOT pour :
- Éliminer la double saisie
- Automatiser les calculs
- Améliorer la traçabilité
- Réduire les erreurs
- Faciliter les reporting et analyses

---

**Fin du rapport**
