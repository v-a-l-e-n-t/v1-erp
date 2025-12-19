# Analyse du Projet ERP GPL

## 📋 Vue d'ensemble

**Nom du projet**: v1-erp  
**Type**: Application ERP (Enterprise Resource Planning) pour la gestion GPL (Gaz de Pétrole Liquéfié)  
**Stack technique**: React + TypeScript + Vite + Supabase + Tailwind CSS + shadcn/ui

---

## 🏗️ Architecture Technique

### Frontend
- **Framework**: React 18.3.1 avec TypeScript
- **Build tool**: Vite 5.4.19
- **Routing**: React Router DOM 6.30.1
- **UI Components**: 
  - shadcn/ui (composants Radix UI)
  - Tailwind CSS 3.4.17
  - Lucide React (icônes)
- **State Management**: 
  - React Query (TanStack Query) pour la gestion des données serveur
  - React Hook Form pour les formulaires
- **Visualisation**: 
  - Recharts pour les graphiques
  - Mapbox GL pour les cartes géographiques
- **Autres bibliothèques**:
  - date-fns pour la manipulation des dates
  - xlsx/xlsx-js-style pour l'import/export Excel
  - jsPDF + html2canvas pour l'export PDF
  - Decimal.js pour les calculs précis
  - Zod pour la validation de schémas

### Backend
- **BaaS**: Supabase (PostgreSQL + Auth + Storage + Edge Functions)
- **Base de données**: PostgreSQL avec migrations versionnées
- **Edge Functions**:
  - `chat-assistant`: Assistant conversationnel pour les données
  - `get-mapbox-token`: Gestion des tokens Mapbox
  - `import-baremage`: Import de données de barémage

---

## 📦 Modules Principaux

### 1. **Module Distribution** 📊
**Pages**: `/new-bilan`, `/dashboard`, `/import_data`

**Fonctionnalités**:
- **Gestion des bilans journaliers GPL**:
  - Stock initial (sphères, bouteilles, réservoirs)
  - Réceptions (par navire, numéro de réception)
  - Sorties VRAC (par client: SIMAM, PETRO IVOIRE, VIVO ENERGIES, TOTAL ENERGIES)
  - Sorties conditionnées (par client)
  - Retours marché (fuyardes par client)
  - Stock final et calcul du bilan
  - Gestion des agents (exploitation matin/soir, mouvement matin/soir)

- **Dashboard interactif**:
  - Vue d'ensemble avec KPIs
  - Vue Centre Emplisseur (production)
  - Vue Sorties (ventes)
  - Vue Distribution (mandataires)
  - Cartographie interactive de la Côte d'Ivoire
  - Historique complet avec filtres avancés

- **Gestion des mandataires**:
  - Import des ventes par mandataire
  - Statistiques de performance
  - Historique des ventes
  - Géolocalisation des destinations

**Tables principales**:
- `bilan_entries`
- `mandataires`
- `ventes_mandataires`
- `destinations_geolocation`

---

### 2. **Module Production** 🏭
**Pages**: `/production-entry`, `/agents`, `/sphere-calculation`, `/sphere-history`

**Fonctionnalités**:
- **Saisie de production par poste**:
  - Gestion des shifts (10h-19h / 20h-5h)
  - Production par ligne (B6_L1, B6_L2, B6_L3, B6_L4, B12)
  - Recharges et consignes par client (PETRO, VIVO, TOTAL)
  - Recharges et consignes par type de bouteille (B6, B12, B28, B38)
  - Calcul automatique des tonnages
  - Gestion des arrêts de production:
    - Types: maintenance corrective, manque personnel, problème approvisionnement, panne ligne, autre
    - Étapes concernées: BASCULES, PURGE, CONTROLE, ETANCHEITE, CAPSULAGE, VIDANGE, PALETTISEUR, TRI
    - Durée, description, actions correctives

- **Gestion des agents**:
  - Chefs de ligne
  - Chefs de quart
  - Agents exploitation
  - Agents mouvement
  - Suivi des modifications (audit trail)

- **Calcul des sphères**:
  - Calcul de masse GPL dans les sphères de stockage
  - Barémage intégré
  - Historique des calculs
  - Export PDF

**Tables principales**:
- `production_shifts`
- `lignes_production`
- `arrets_production`
- `agents`
- `chefs_ligne`
- `chefs_quart`
- `sphere_calculations`
- `sphere_calibration`

---

### 3. **Module VRAC** 🚛
**Pages**: `/vrac`, `/vrac-login`, `/vrac-admin`, `/vrac-chargements`

**Fonctionnalités**:
- **Portail client**:
  - Authentification par mot de passe généré
  - Demande de chargement VRAC
  - Suivi des demandes (en attente, validée, refusée, terminée, chargée)
  - Historique des chargements

- **Dashboard admin**:
  - Suivi en temps réel des chargements
  - Validation des demandes
  - Saisie du tonnage chargé
  - Statistiques journalières

- **Administration**:
  - Gestion des clients VRAC
  - Gestion des utilisateurs clients
  - Configuration des champs de sortie

**Tables principales**:
- `vrac_clients`
- `vrac_users`
- `vrac_demandes_chargement`

**Sécurité**:
- Row Level Security (RLS) activé
- Authentification séparée pour les clients VRAC
- Routes protégées pour l'administration

---

## 🗄️ Structure de la Base de Données

### Tables principales

1. **Bilan & Distribution**:
   - `bilan_entries`: Bilans journaliers GPL
   - `mandataires`: Mandataires de distribution
   - `ventes_mandataires`: Ventes par mandataire
   - `destinations_geolocation`: Géolocalisation des destinations

2. **Production**:
   - `production_shifts`: Postes de production
   - `lignes_production`: Production par ligne
   - `arrets_production`: Arrêts de production
   - `agents`: Agents de production
   - `chefs_ligne`: Chefs de ligne
   - `chefs_quart`: Chefs de quart

3. **Sphères**:
   - `sphere_calculations`: Calculs de masse
   - `sphere_calibration`: Calibration des sphères

4. **VRAC**:
   - `vrac_clients`: Clients VRAC
   - `vrac_users`: Utilisateurs clients
   - `vrac_demandes_chargement`: Demandes de chargement

5. **Système**:
   - `user_roles`: Rôles utilisateurs (admin, chef_depot)
   - `audit_logs`: Logs d'audit
   - `demo_requests`: Demandes de démo
   - `objectifs_mensuels`: Objectifs mensuels
   - `production_modifications`: Modifications de production

### Types ENUM

- `app_role`: admin, chef_depot
- `shift_type`: 10h-19h, 20h-5h
- `ligne_type`: B6_L1, B6_L2, B6_L3, B6_L4, B12
- `arret_type`: maintenance_corrective, manque_personnel, probleme_approvisionnement, panne_ligne, autre
- `etape_ligne`: BASCULES, PURGE, CONTROLE, ETANCHEITE, CAPSULAGE, VIDANGE, PALETTISEUR, TRI, AUTRE
- `demande_statut`: en_attente, validee, refusee, terminee, charge

---

## 📊 Indicateurs & KPIs

Le système gère **190 indicateurs** répartis en plusieurs catégories:

1. **Bilan Matière - Stocks** (12 indicateurs)
2. **Bilan Matière - Réceptions** (9 indicateurs)
3. **Bilan Matière - Sorties Globales** (5 indicateurs)
4. **Bilan Matière - Sorties VRAC** (8 indicateurs)
5. **Bilan Matière - Sorties Conditionnées** (7 indicateurs)
6. **Bilan Matière - Fuyardes** (6 indicateurs)
7. **Production - Tonnage** (15 indicateurs)
8. **Production - Bouteilles** (20 indicateurs)
9. **Production - Arrêts** (15 indicateurs)
10. **Production - Étapes Ligne** (9 indicateurs)
11. **Production - KPI Performance** (5 indicateurs)
12. **Indicateurs Croisés** (8 indicateurs)
13. **Alertes** (6 indicateurs)
14. **Tendances et Prévisions** (6 indicateurs)

---

## 🔐 Sécurité & Authentification

### Authentification
- **Dashboard principal**: Authentification par mot de passe (sessionStorage/localStorage)
- **Module VRAC**: Système d'authentification séparé avec génération de mots de passe
- **Routes protégées**: Utilisation de `ProtectedRoute` pour les pages admin

### Row Level Security (RLS)
- RLS activé sur les tables sensibles
- Politiques de sécurité définies dans les migrations
- Séparation des données par client VRAC

### Audit Trail
- Table `audit_logs` pour tracer les modifications
- Champs `last_modified_by` et `last_modified_at` sur plusieurs tables
- Historique des modifications de production

---

## 🎨 Interface Utilisateur

### Design System
- **Composants**: shadcn/ui (48 composants UI)
- **Styling**: Tailwind CSS avec thème personnalisé
- **Icons**: Lucide React
- **Charts**: Recharts
- **Maps**: Mapbox GL avec carte interactive de la Côte d'Ivoire

### Pages principales
1. **Landing** (`/`): Page d'accueil avec présentation des fonctionnalités
2. **AppHome** (`/app`): Menu principal avec navigation vers les modules
3. **DashboardHistorique** (`/dashboard`): Dashboard principal avec vues multiples
4. **NewBilan** (`/new-bilan`): Formulaire de saisie de bilan
5. **ProductionDataEntry** (`/production-entry`): Saisie de production
6. **AgentsManagement** (`/agents`): Gestion des agents
7. **SphereCalculation** (`/sphere-calculation`): Calcul des sphères
8. **ImportData** (`/import_data`): Import de données
9. **VracClientPortal** (`/vrac`): Portail client VRAC
10. **VracAdminPanel** (`/vrac-admin`): Administration VRAC
11. **VracChargementDashboard** (`/vrac-chargements`): Dashboard chargements VRAC

---

## 📁 Structure des Fichiers

```
src/
├── components/          # Composants React réutilisables
│   ├── dashboard/      # Composants spécifiques au dashboard
│   ├── mandataires/    # Composants gestion mandataires
│   ├── ui/             # Composants UI shadcn (48 fichiers)
│   └── vrac/           # Composants module VRAC
├── hooks/              # Hooks React personnalisés
├── integrations/       # Intégrations externes
│   └── supabase/       # Client Supabase et types
├── lib/                # Utilitaires
├── pages/              # Pages de l'application
├── scripts/            # Scripts utilitaires
├── types/              # Types TypeScript
│   ├── balance.ts      # Types bilans
│   ├── production.ts   # Types production
│   └── vrac.ts         # Types VRAC
└── utils/              # Fonctions utilitaires
    ├── calculations.ts
    ├── sphereCalculations.ts
    ├── importBaremageData.ts
    └── validation.ts

supabase/
├── migrations/         # Migrations PostgreSQL (20 fichiers)
├── functions/          # Edge Functions
│   ├── chat-assistant/
│   ├── get-mapbox-token/
│   └── import-baremage/
└── config.toml         # Configuration Supabase
```

---

## 🔧 Fonctionnalités Avancées

### 1. **Assistant Conversationnel**
- Edge Function `chat-assistant` pour interroger les données
- Interface chatbot intégrée dans le dashboard

### 2. **Import/Export**
- Import Excel (xlsx) pour:
  - Barémage
  - Ventes mandataires
  - Bilans
- Export Excel et PDF pour:
  - Bilans
  - Calculs de sphères
  - Rapports de production

### 3. **Cartographie**
- Carte interactive de la Côte d'Ivoire (Mapbox)
- Visualisation des destinations de livraison
- Légende et filtres

### 4. **Calculs Automatisés**
- Calculs de tonnage par ligne et par client
- Calculs de bilan matière
- Calculs de masse dans les sphères avec barémage
- Calculs de KPIs de production (TRS, OEE, etc.)

### 5. **Gestion des Objectifs**
- Table `objectifs_mensuels` pour définir des objectifs
- Comparaison avec les réalisations

---

## 🚀 Scripts Disponibles

```bash
npm run dev          # Démarrage serveur de développement (port 8080)
npm run build        # Build de production
npm run build:dev    # Build mode développement
npm run lint         # Linting ESLint
npm run preview      # Prévisualisation du build
```

---

## 📝 Points d'Attention

### Modifications en cours
D'après `MODIFICATIONS_A_APPLIQUER.md`, des modifications sont prévues sur `CentreEmplisseurView.tsx`:
- Calcul du tonnage par client
- Intégration Production par Client dans la carte Production Totale
- Changement d'unités ("unités" → "Bouteilles", "U" → "Btl")
- Détails par ligne horizontaux
- Suppression de certaines cartes redondantes

### Migrations SQL
- 20 fichiers de migration dans `supabase/migrations/`
- Dernière migration: `20251217124821_3c632413-4fa2-44ab-b4ec-432b13de0a9f.sql` (audit_logs)
- Migration VRAC: `20251216_vrac_client_module.sql`

### Configuration
- Variables d'environnement requises:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_PUBLISHABLE_KEY`
- Port de développement: 8080
- Alias de chemin: `@/` → `./src/`

---

## 🎯 Cas d'Usage Métier

### 1. **Gestionnaire de Dépôt**
- Saisie quotidienne des bilans GPL
- Suivi des stocks (sphères, bouteilles, réservoirs)
- Analyse des sorties VRAC et conditionnées
- Suivi des réceptions

### 2. **Chef de Production**
- Saisie des données de production par poste
- Gestion des arrêts de production
- Suivi des performances par ligne
- Calcul des tonnages produits

### 3. **Responsable Distribution**
- Suivi des ventes par mandataire
- Analyse géographique des livraisons
- Gestion des objectifs mensuels
- Export de rapports

### 4. **Client VRAC**
- Demande de chargement en ligne
- Suivi du statut des demandes
- Consultation de l'historique

### 5. **Administrateur VRAC**
- Validation des demandes de chargement
- Saisie des tonnages réels
- Gestion des clients et utilisateurs
- Dashboard de suivi en temps réel

---

## 🔄 Flux de Données

1. **Bilan Journalier**:
   ```
   Saisie → Validation → Stockage (Supabase) → Dashboard → Export
   ```

2. **Production**:
   ```
   Saisie Shift → Lignes Production → Arrêts → Calcul Tonnage → Dashboard
   ```

3. **VRAC**:
   ```
   Client: Demande → Admin: Validation → Chargement → Tonnage → Statut "Chargé"
   ```

4. **Import Mandataires**:
   ```
   Excel → Parsing → Validation → Stockage → Dashboard → Carte
   ```

---

## 📈 Évolutions Possibles

1. **Notifications**: Système d'alertes pour stocks critiques, bilans négatifs
2. **Rapports automatisés**: Génération automatique de rapports périodiques
3. **Mobile**: Application mobile pour la saisie terrain
4. **API REST**: Exposition d'API pour intégrations externes
5. **Multi-tenant**: Support de plusieurs dépôts/clients
6. **Analytics avancés**: Machine Learning pour prévisions

---

## ✅ Conclusion

Ce projet est un **ERP complet et fonctionnel** pour la gestion GPL avec:
- ✅ Gestion complète des bilans matière
- ✅ Suivi de production détaillé
- ✅ Module VRAC avec portail client
- ✅ Dashboard interactif avec cartographie
- ✅ Import/Export de données
- ✅ Système d'audit et traçabilité
- ✅ Interface moderne et responsive

Le code est bien structuré, utilise des technologies modernes et suit les bonnes pratiques React/TypeScript.

