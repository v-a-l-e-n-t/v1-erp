# Modifications à appliquer sur CentreEmplisseurView.tsx

## 1. Calcul du tonnage par client (dans fetchStats, après ligne 226)
- Ajouter fonction calculateClientTonnage
- Calculer petroTonnage, vivoTonnage, totalClientTonnage
- Mettre à jour setStats pour inclure ces tonnages

## 2. Intégrer Production par Client dans carte Production Totale (lignes 403-461)
- Remplacer la carte Production Totale simple
- Ajouter section Recharges/Consignes totaux
- Ajouter section Production par Client avec tonnage
- Réduire les espacements (p-4 au lieu de p-6, mb-3 au lieu de mb-4, etc.)
- Uniformiser couleurs: tonnages en orange (text-primary), quantités en gris/noir (text-foreground)

## 3. Changer unités (plusieurs endroits)
- "unités" → "Bouteilles"  
- "U" → "Btl"

## 4. Détails par ligne horizontaux (lignes 512-535)
- Changer grid en flex horizontal
- Afficher: Recharges: X Btl • Y T | Consignes: X Btl • Y T

## 5. Supprimer cartes Recharges/Consignes du bas (lignes 532-587)
- Supprimer toute la section "Bottle Types Breakdown"

## 6. Supprimer carte Production par Client séparée (lignes 600-627)
- Déjà intégrée dans Production Totale
