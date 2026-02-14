import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getCurrentISOWeek, debounce } from '@/utils/inspection';
import type {
  InspectionZone,
  InspectionSousZone,
  InspectionEquipement,
  InspectionRonde,
  InspectionLigneRonde,
  InspectionDestinataireMail,
  InspectionAnomalie,
  LigneRondeUpdate,
} from '@/types/inspection';

// ============== REFERENTIEL ==============

export function useInspectionReferentiel() {
  const [zones, setZones] = useState<InspectionZone[]>([]);
  const [sousZones, setSousZones] = useState<InspectionSousZone[]>([]);
  const [equipements, setEquipements] = useState<InspectionEquipement[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [zRes, szRes, eRes] = await Promise.all([
      supabase.from('inspection_zones').select('*').order('ordre'),
      supabase.from('inspection_sous_zones').select('*').order('ordre'),
      supabase.from('inspection_equipements').select('*').order('ordre'),
    ]);
    setZones((zRes.data as InspectionZone[]) ?? []);
    setSousZones((szRes.data as InspectionSousZone[]) ?? []);
    setEquipements((eRes.data as InspectionEquipement[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { zones, sousZones, equipements, loading, refresh };
}

// ============== CURRENT RONDE ==============

export function useCurrentRonde() {
  const [ronde, setRonde] = useState<InspectionRonde | null>(null);
  const [lignes, setLignes] = useState<InspectionLigneRonde[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const semaineIso = getCurrentISOWeek();

    const { data: rondeData } = await supabase
      .from('inspection_rondes')
      .select('*')
      .eq('semaine_iso', semaineIso)
      .maybeSingle();

    if (rondeData) {
      setRonde(rondeData as InspectionRonde);
      const { data: lignesData } = await supabase
        .from('inspection_lignes_ronde')
        .select('*')
        .eq('ronde_id', rondeData.id);
      setLignes((lignesData as InspectionLigneRonde[]) ?? []);
    } else {
      setRonde(null);
      setLignes([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const createRonde = useCallback(async (): Promise<string | null> => {
    const semaineIso = getCurrentISOWeek();

    // Check if one already exists
    const { data: existing } = await supabase
      .from('inspection_rondes')
      .select('id')
      .eq('semaine_iso', semaineIso)
      .maybeSingle();

    if (existing) return existing.id;

    // Get active equipment count
    const { data: activeEquipements } = await supabase
      .from('inspection_equipements')
      .select('id')
      .eq('actif', true);

    const nbTotal = activeEquipements?.length ?? 0;
    const userName = localStorage.getItem('user_name') || 'Opérateur';

    // Create ronde
    const { data: newRonde, error: rondeError } = await supabase
      .from('inspection_rondes')
      .insert({
        semaine_iso: semaineIso,
        statut: 'EN_COURS',
        nb_points_total: nbTotal,
        soumis_par: userName,
      })
      .select()
      .single();

    if (rondeError || !newRonde) return null;

    // Create empty lignes for all active equipment
    if (activeEquipements && activeEquipements.length > 0) {
      const lignesInsert = activeEquipements.map(e => ({
        ronde_id: newRonde.id,
        equipement_id: e.id,
      }));
      await supabase.from('inspection_lignes_ronde').insert(lignesInsert);
    }

    await refresh();
    return newRonde.id;
  }, [refresh]);

  return { ronde, lignes, loading, createRonde, refresh };
}

// ============== RONDE BY ID ==============

export function useRondeById(rondeId: string | undefined) {
  const [ronde, setRonde] = useState<InspectionRonde | null>(null);
  const [lignes, setLignes] = useState<InspectionLigneRonde[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!rondeId) { setLoading(false); return; }
    setLoading(true);

    const [rondeRes, lignesRes] = await Promise.all([
      supabase.from('inspection_rondes').select('*').eq('id', rondeId).single(),
      supabase.from('inspection_lignes_ronde').select('*').eq('ronde_id', rondeId),
    ]);

    setRonde((rondeRes.data as InspectionRonde) ?? null);
    setLignes((lignesRes.data as InspectionLigneRonde[]) ?? []);
    setLoading(false);
  }, [rondeId]);

  useEffect(() => { refresh(); }, [refresh]);

  return { ronde, lignes, loading, refresh, setRonde, setLignes };
}

// ============== AUTO-SAVE ==============

export function useAutoSaveLigne(rondeId: string | undefined) {
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const pendingRef = useRef<Map<string, LigneRondeUpdate>>(new Map());

  const doSave = useCallback(async (update: LigneRondeUpdate) => {
    if (!rondeId) return;
    setSaving(true);
    const userName = localStorage.getItem('user_name') || 'Opérateur';

    await supabase
      .from('inspection_lignes_ronde')
      .update({
        statut: update.statut,
        commentaire: update.commentaire,
        urgent: update.urgent,
        rempli_par: userName,
        rempli_at: new Date().toISOString(),
      })
      .eq('ronde_id', rondeId)
      .eq('equipement_id', update.equipement_id);

    // Update progress count on ronde
    const { data: filledCount } = await supabase
      .from('inspection_lignes_ronde')
      .select('id')
      .eq('ronde_id', rondeId)
      .not('statut', 'is', null);

    if (filledCount) {
      await supabase
        .from('inspection_rondes')
        .update({ nb_points_remplis: filledCount.length })
        .eq('id', rondeId);
    }

    setSaving(false);
    setLastSaved(new Date());
  }, [rondeId]);

  const debouncedSaveRef = useRef<Map<string, ReturnType<typeof debounce>>>(new Map());

  const saveLigne = useCallback((update: LigneRondeUpdate) => {
    const key = update.equipement_id;
    if (!debouncedSaveRef.current.has(key)) {
      debouncedSaveRef.current.set(key, debounce((u: LigneRondeUpdate) => doSave(u), 500));
    }
    debouncedSaveRef.current.get(key)!(update);
  }, [doSave]);

  return { saveLigne, saving, lastSaved };
}

// ============== HISTORY ==============

export function useRondeHistory(limit: number = 52) {
  const [rondes, setRondes] = useState<InspectionRonde[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('inspection_rondes')
      .select('*')
      .order('semaine_iso', { ascending: false })
      .limit(limit);
    setRondes((data as InspectionRonde[]) ?? []);
    setLoading(false);
  }, [limit]);

  useEffect(() => { refresh(); }, [refresh]);

  return { rondes, loading, refresh };
}

// ============== ANOMALIES ==============

export function useAnomalies() {
  const [anomalies, setAnomalies] = useState<InspectionAnomalie[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('inspection_anomalies')
      .select('*')
      .order('date_ouverture', { ascending: false });
    setAnomalies((data as InspectionAnomalie[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { anomalies, loading, refresh };
}

export function useOpenAnomalies() {
  const [anomalies, setAnomalies] = useState<InspectionAnomalie[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('inspection_anomalies')
      .select('*')
      .eq('statut', 'OUVERTE')
      .order('urgent', { ascending: false })
      .order('date_ouverture', { ascending: true });
    setAnomalies((data as InspectionAnomalie[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { anomalies, loading, refresh };
}

/**
 * Synchronise les anomalies lors de la validation d'une ronde :
 * - Ouvre une anomalie pour chaque equipement DEGRADE/HORS_SERVICE qui n'en a pas deja une ouverte
 * - Ferme les anomalies ouvertes pour les equipements redevenus OPERATIONNEL
 */
export async function syncAnomalies(
  rondeId: string,
  semaineIso: string,
  lignes: InspectionLigneRonde[],
  equipements: InspectionEquipement[],
) {
  // Charger les anomalies ouvertes
  const { data: openAnomalies } = await supabase
    .from('inspection_anomalies')
    .select('*')
    .eq('statut', 'OUVERTE');

  const open = (openAnomalies as InspectionAnomalie[]) ?? [];
  const openByEquip = new Map(open.map(a => [a.equipement_id, a]));

  const toInsert: any[] = [];
  const toClose: { id: string; duree: number }[] = [];

  for (const ligne of lignes) {
    if (!ligne.statut) continue;
    const eq = equipements.find(e => e.id === ligne.equipement_id);
    if (!eq) continue;

    const existingAnomalie = openByEquip.get(ligne.equipement_id);

    if (ligne.statut === 'DEGRADE' || ligne.statut === 'HORS_SERVICE') {
      // Ouvrir une anomalie si aucune n'est ouverte pour cet equipement
      if (!existingAnomalie) {
        toInsert.push({
          equipement_id: ligne.equipement_id,
          zone_id: eq.zone_id,
          sous_zone_id: eq.sous_zone_id,
          ronde_ouverture_id: rondeId,
          semaine_ouverture: semaineIso,
          statut_equipement_initial: ligne.statut,
          commentaire_initial: ligne.commentaire,
          urgent: ligne.urgent,
          statut: 'OUVERTE',
        });
      }
    } else if (ligne.statut === 'OPERATIONNEL') {
      // Cloturer l'anomalie ouverte si elle existe
      if (existingAnomalie) {
        const dateOuverture = new Date(existingAnomalie.date_ouverture);
        const maintenant = new Date();
        const dureeMs = maintenant.getTime() - dateOuverture.getTime();
        const dureeJours = Math.max(1, Math.ceil(dureeMs / (1000 * 60 * 60 * 24)));
        toClose.push({ id: existingAnomalie.id, duree: dureeJours });
      }
    }
  }

  // Insert nouvelles anomalies
  if (toInsert.length > 0) {
    await supabase.from('inspection_anomalies').insert(toInsert);
  }

  // Cloturer les anomalies resolues
  for (const item of toClose) {
    await supabase
      .from('inspection_anomalies')
      .update({
        statut: 'RESOLUE',
        ronde_cloture_id: rondeId,
        semaine_cloture: semaineIso,
        date_cloture: new Date().toISOString(),
        duree_jours: item.duree,
      })
      .eq('id', item.id);
  }

  return { opened: toInsert.length, closed: toClose.length };
}

// ============== DESTINATAIRES ==============

export function useDestinataires() {
  const [destinataires, setDestinataires] = useState<InspectionDestinataireMail[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('inspection_destinataires_mail')
      .select('*')
      .order('nom');
    setDestinataires((data as InspectionDestinataireMail[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { destinataires, loading, refresh };
}
