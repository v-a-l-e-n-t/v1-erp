import { useState, useEffect, useCallback, useRef } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { RapportChariotLigne, AnomalieChariot, RapportChariot } from '@/types/chariot';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { CalendarIcon, Plus, Trash2, Save, List, FilePlus, Edit, AlertTriangle, X, FileDown, ImageIcon, RotateCcw, Printer } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// ─── Helpers ────────────────────────────────────────────────────────

const createEmptyLigne = (): RapportChariotLigne => ({
  chariot_id: '',
  chariot_nom: '',
  etat: null,
  compteur_horaire: null,
  horaire_prochaine_vidange: null,
  ecart: null,
  anomalies: [],
  numero_di: '',
  gasoil: null,
  temps_arret: null,
  numero_permis: '',
});

const DEFAULT_CHARIOTS = [
  'CHARIOT COMATEC 04',
  'CHARIOT COMATEC 05',
  'CHARIOT COMATEC 06',
  'CHARIOT COMATEC 07',
  'CHARIOT COMATEC BACK UP',
  'CHARIOT DSA 01',
  'CHARIOT DSA 02',
  'CHARIOT DSA 03',
  'CHARIOT ITB 05',
  'CHARIOT ITB 03',
  'CHARIOT ITB 04',
];

const createInitialLignes = (): RapportChariotLigne[] =>
  DEFAULT_CHARIOTS.map(nom => ({ ...createEmptyLigne(), chariot_nom: nom }));

// ─── History filter types ───────────────────────────────────────────

type DatePeriodType = 'all' | 'year' | 'month' | 'period' | 'day';

interface HistoryFilters {
  datePeriod: DatePeriodType;
  dateYear: number;
  dateMonth: number; // 0-11
  dateFrom: Date | undefined;
  dateTo: Date | undefined;
  dateDay: Date | undefined;
}

const currentYear = new Date().getFullYear();

const emptyFilters: HistoryFilters = {
  datePeriod: 'all',
  dateYear: currentYear,
  dateMonth: new Date().getMonth(),
  dateFrom: undefined,
  dateTo: undefined,
  dateDay: undefined,
};

interface RapportHistoriqueLigne {
  id: string;
  chariot_nom: string;
  etat: string | null;
  compteur_horaire: number | null;
  horaire_prochaine_vidange: number | null;
  ecart: number | null;
  numero_di: string | null;
  gasoil: number | null;
  temps_arret: number | null;
  numero_permis: string | null;
  anomalies: { description: string; numero_di: string }[];
}

interface RapportHistorique extends RapportChariot {
  lignes: RapportHistoriqueLigne[];
}

// ─── Component ──────────────────────────────────────────────────────

const FormChariot = () => {
  // Form state
  const [date, setDate] = useState<Date>(new Date());
  const [timeValue, setTimeValue] = useState(format(new Date(), 'HH:mm'));
  const [lignes, setLignes] = useState<RapportChariotLigne[]>(createInitialLignes);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('new');

  // Export refs
  const exportRef = useRef<HTMLDivElement>(null);
  const popupExportRef = useRef<HTMLDivElement>(null);

  // Print choice dialog (from history)
  const [printDialog, setPrintDialog] = useState<{ open: boolean; rapportId: string | null }>({ open: false, rapportId: null });

  // Known chariots for resolving IDs
  const [allChariots, setAllChariots] = useState<{ id: string; nom: string }[]>([]);

  // Alert dialog for écart vidange
  const [alertVidange, setAlertVidange] = useState<{ show: boolean; chariots: string[] }>({
    show: false,
    chariots: [],
  });

  // History
  const [rapports, setRapports] = useState<RapportHistorique[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [filters, setFilters] = useState<HistoryFilters>({ ...emptyFilters });

  // Delete confirmation
  const [deleteRapportId, setDeleteRapportId] = useState<string | null>(null);

  // Anomaly dialog
  const [anomalyDialog, setAnomalyDialog] = useState<{
    open: boolean;
    ligneIndex: number;
  }>({ open: false, ligneIndex: -1 });

  // Edit popup state
  const [editPopup, setEditPopup] = useState<{
    open: boolean;
    rapportId: string | null;
    date: Date;
    timeValue: string;
    lignes: RapportChariotLigne[];
    saving: boolean;
    anomalyDialog: { open: boolean; ligneIndex: number };
  }>({
    open: false,
    rapportId: null,
    date: new Date(),
    timeValue: '',
    lignes: [],
    saving: false,
    anomalyDialog: { open: false, ligneIndex: -1 },
  });

  // ─── Load existing chariots ───────────────────────────────────────
  useEffect(() => {
    const loadChariots = async () => {
      const { data } = await supabase
        .from('chariots')
        .select('id, nom')
        .eq('actif', true)
        .order('nom');
      if (data) setAllChariots(data);
    };
    loadChariots();
  }, []);

  // ─── Check écart on load (from last report) ──────────────────────
  useEffect(() => {
    const checkEcartOnLoad = async () => {
      const { data: lastRapport } = await supabase
        .from('rapports_chariots')
        .select('id')
        .order('date_rapport', { ascending: false })
        .limit(1)
        .single();

      if (!lastRapport) return;

      const { data: lignesData } = await supabase
        .from('rapport_chariot_lignes')
        .select('ecart, chariot_id')
        .eq('rapport_id', lastRapport.id);

      if (!lignesData) return;

      const alertChariots: string[] = [];
      for (const l of lignesData) {
        if (l.ecart !== null && l.ecart <= 72) {
          const chariot = allChariots.find(c => c.id === l.chariot_id);
          alertChariots.push(chariot?.nom || 'Chariot inconnu');
        }
      }

      if (alertChariots.length > 0) {
        setAlertVidange({ show: true, chariots: alertChariots });
      }
    };

    if (allChariots.length > 0) {
      checkEcartOnLoad();
    }
  }, [allChariots]);

  // ─── Load history ─────────────────────────────────────────────────
  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    const { data } = await supabase
      .from('rapports_chariots')
      .select('*')
      .order('date_rapport', { ascending: false });

    if (data && data.length > 0) {
      // Batch query for ALL lignes
      const rapportIds = data.map(r => r.id);
      const { data: allLignesData } = await supabase
        .from('rapport_chariot_lignes')
        .select('*, chariot_id')
        .in('rapport_id', rapportIds);

      const allLignes = allLignesData || [];

      // Batch query for ALL anomalies across all lignes
      const ligneIds = allLignes.map(l => l.id as string);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let anomaliesByLigne = new Map<string, any[]>();
      if (ligneIds.length > 0) {
        const { data: allAnomaliesData } = await supabase
          .from('rapport_chariot_anomalies')
          .select('*')
          .in('ligne_id', ligneIds)
          .order('ordre');
        for (const a of (allAnomaliesData || [])) {
          const lid = a.ligne_id as string;
          if (!anomaliesByLigne.has(lid)) anomaliesByLigne.set(lid, []);
          anomaliesByLigne.get(lid)!.push(a);
        }
      }

      // Group lignes by rapport_id
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const lignesByRapport = new Map<string, any[]>();
      for (const l of allLignes) {
        const rid = l.rapport_id as string;
        if (!lignesByRapport.has(rid)) lignesByRapport.set(rid, []);
        lignesByRapport.get(rid)!.push(l);
      }

      const rapportsWithLignes: RapportHistorique[] = data.map(r => {
        const rawLignes = lignesByRapport.get(r.id) || [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const lignes: RapportHistoriqueLigne[] = rawLignes.map((l: any) => {
          const chariot = allChariots.find(c => c.id === l.chariot_id);
          const anomalies = (anomaliesByLigne.get(l.id) || []).map((a: { description: string; numero_di?: string }) => ({
            description: a.description,
            numero_di: a.numero_di || '',
          }));
          return {
            id: l.id as string,
            chariot_nom: chariot?.nom || 'Inconnu',
            etat: l.etat as string | null,
            compteur_horaire: l.compteur_horaire as number | null,
            horaire_prochaine_vidange: l.horaire_prochaine_vidange as number | null,
            ecart: l.ecart as number | null,
            numero_di: l.numero_di as string | null,
            gasoil: l.gasoil as number | null,
            temps_arret: l.temps_arret as number | null,
            numero_permis: l.numero_permis as string | null,
            anomalies,
          };
        });
        return { ...r, lignes };
      });
      setRapports(rapportsWithLignes);
    } else {
      setRapports([]);
    }
    setLoadingHistory(false);
  }, [allChariots]);

  useEffect(() => {
    if (activeTab === 'history' && allChariots.length > 0) {
      loadHistory();
    }
  }, [activeTab, loadHistory, allChariots]);

  // ─── Filter history ───────────────────────────────────────────────
  const filteredRapports = rapports.filter(r => {
    const rapportDate = new Date(r.date_rapport);

    // Date period filtering
    if (filters.datePeriod === 'year') {
      if (rapportDate.getFullYear() !== filters.dateYear) return false;
    } else if (filters.datePeriod === 'month') {
      if (rapportDate.getFullYear() !== filters.dateYear || rapportDate.getMonth() !== filters.dateMonth) return false;
    } else if (filters.datePeriod === 'period') {
      if (filters.dateFrom && rapportDate < filters.dateFrom) return false;
      if (filters.dateTo) {
        const endOfDay = new Date(filters.dateTo);
        endOfDay.setHours(23, 59, 59, 999);
        if (rapportDate > endOfDay) return false;
      }
    } else if (filters.datePeriod === 'day') {
      if (filters.dateDay) {
        const dayStart = new Date(filters.dateDay);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(filters.dateDay);
        dayEnd.setHours(23, 59, 59, 999);
        if (rapportDate < dayStart || rapportDate > dayEnd) return false;
      }
    }

    return true;
  });

  // ─── Open rapport in edit popup ──────────────────────────────────
  const openEditPopup = async (rapportId: string) => {
    const { data: rapport } = await supabase
      .from('rapports_chariots')
      .select('*')
      .eq('id', rapportId)
      .single();

    if (!rapport) return;

    const rapportDate = new Date(rapport.date_rapport);

    const { data: lignesData } = await supabase
      .from('rapport_chariot_lignes')
      .select('*')
      .eq('rapport_id', rapportId);

    if (!lignesData || lignesData.length === 0) return;

    // Batch load all anomalies for all lignes at once (instead of N+1 queries)
    const ligneIds = lignesData.map(l => l.id as string);
    const { data: allAnomaliesData } = await supabase
      .from('rapport_chariot_anomalies')
      .select('*')
      .in('ligne_id', ligneIds)
      .order('ordre');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anomaliesByLigne = new Map<string, any[]>();
    for (const a of (allAnomaliesData || [])) {
      const lid = a.ligne_id as string;
      if (!anomaliesByLigne.has(lid)) anomaliesByLigne.set(lid, []);
      anomaliesByLigne.get(lid)!.push(a);
    }

    const lignesWithAnomalies: RapportChariotLigne[] = lignesData.map(l => {
      const chariot = allChariots.find(c => c.id === l.chariot_id);
      const anomalies = anomaliesByLigne.get(l.id as string) || [];
      return {
        id: l.id,
        rapport_id: l.rapport_id,
        chariot_id: l.chariot_id,
        chariot_nom: chariot?.nom || 'Inconnu',
        etat: l.etat as 'marche' | 'arret' | null,
        compteur_horaire: l.compteur_horaire,
        horaire_prochaine_vidange: l.horaire_prochaine_vidange,
        ecart: l.ecart,
        anomalies: anomalies.map((a: { id: string; description: string; numero_di?: string }) => ({ id: a.id, description: a.description, numero_di: a.numero_di || '' })),
        numero_di: l.numero_di || '',
        gasoil: l.gasoil,
        temps_arret: l.temps_arret,
        numero_permis: l.numero_permis || '',
      };
    });

    setEditPopup({
      open: true,
      rapportId,
      date: rapportDate,
      timeValue: format(rapportDate, 'HH:mm'),
      lignes: lignesWithAnomalies,
      saving: false,
      anomalyDialog: { open: false, ligneIndex: -1 },
    });
  };

  // ─── Edit popup helpers ─────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updatePopupLigne = (index: number, field: keyof RapportChariotLigne, value: any) => {
    setEditPopup(prev => {
      const updatedLignes = prev.lignes.map((l, i) => {
        if (i !== index) return l;
        const newLigne = { ...l, [field]: value };
        if (field === 'compteur_horaire' || field === 'horaire_prochaine_vidange') {
          const compteur = field === 'compteur_horaire' ? value : l.compteur_horaire;
          const vidange = field === 'horaire_prochaine_vidange' ? value : l.horaire_prochaine_vidange;
          newLigne.ecart = compteur !== null && vidange !== null ? vidange - compteur : null;
        }
        return newLigne;
      });
      return { ...prev, lignes: updatedLignes };
    });
  };

  const addPopupLigne = () => {
    setEditPopup(prev => ({ ...prev, lignes: [...prev.lignes, createEmptyLigne()] }));
  };

  const removePopupLigne = (index: number) => {
    setEditPopup(prev => ({ ...prev, lignes: prev.lignes.filter((_, i) => i !== index) }));
  };

  const addPopupAnomalie = (ligneIndex: number) => {
    setEditPopup(prev => ({
      ...prev,
      lignes: prev.lignes.map((l, i) =>
        i === ligneIndex ? { ...l, anomalies: [...l.anomalies, { description: '', numero_di: '' }] } : l
      ),
    }));
  };

  const updatePopupAnomalie = (ligneIndex: number, anomalieIndex: number, description: string) => {
    setEditPopup(prev => ({
      ...prev,
      lignes: prev.lignes.map((l, i) =>
        i === ligneIndex
          ? { ...l, anomalies: l.anomalies.map((a, j) => (j === anomalieIndex ? { ...a, description } : a)) }
          : l
      ),
    }));
  };

  const removePopupAnomalie = (ligneIndex: number, anomalieIndex: number) => {
    setEditPopup(prev => ({
      ...prev,
      lignes: prev.lignes.map((l, i) =>
        i === ligneIndex ? { ...l, anomalies: l.anomalies.filter((_, j) => j !== anomalieIndex) } : l
      ),
    }));
  };

  const handleSavePopup = async () => {
    const validLignes = editPopup.lignes.filter(l => l.chariot_nom.trim() !== '');
    if (validLignes.length === 0) {
      toast.error('Saisissez au moins un nom de chariot');
      return;
    }

    setEditPopup(prev => ({ ...prev, saving: true }));

    try {
      const [hours, minutes] = editPopup.timeValue.split(':').map(Number);
      const dateRapport = new Date(editPopup.date);
      dateRapport.setHours(hours, minutes, 0, 0);

      const rapportId = editPopup.rapportId!;

      // 1) Resolve ALL chariot IDs BEFORE any deletion
      const resolvedLignes: { ligne: RapportChariotLigne; chariotId: string }[] = [];
      for (const ligne of validLignes) {
        const chariotId = await resolveChariotId(ligne.chariot_nom);
        if (!chariotId) throw new Error(`Impossible de créer le chariot "${ligne.chariot_nom}"`);
        resolvedLignes.push({ ligne, chariotId });
      }

      // 2) Update rapport header
      const { error } = await supabase
        .from('rapports_chariots')
        .update({ date_rapport: dateRapport.toISOString(), updated_at: new Date().toISOString() })
        .eq('id', rapportId);
      if (error) throw error;

      // 3) Delete old lignes (CASCADE deletes anomalies too)
      const { error: delError } = await supabase.from('rapport_chariot_lignes').delete().eq('rapport_id', rapportId);
      if (delError) throw delError;

      // 4) Batch insert all lignes at once
      const lignesInsert = resolvedLignes.map(({ ligne, chariotId }) => ({
        rapport_id: rapportId,
        chariot_id: chariotId,
        etat: ligne.etat,
        compteur_horaire: ligne.compteur_horaire,
        horaire_prochaine_vidange: ligne.horaire_prochaine_vidange,
        numero_di: ligne.numero_di || null,
        gasoil: ligne.gasoil,
        temps_arret: ligne.temps_arret,
        numero_permis: ligne.numero_permis || null,
      }));

      const { data: insertedLignes, error: lignesError } = await supabase
        .from('rapport_chariot_lignes')
        .insert(lignesInsert)
        .select('id');
      if (lignesError) throw lignesError;

      // 5) Batch insert all anomalies at once
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const allAnomalies: any[] = [];
      resolvedLignes.forEach(({ ligne }, idx) => {
        const ligneId = insertedLignes[idx].id;
        ligne.anomalies
          .filter(a => a.description.trim() !== '')
          .forEach((a, aIdx) => {
            allAnomalies.push({
              ligne_id: ligneId,
              description: a.description.trim(),
              numero_di: a.numero_di?.trim() || '',
              ordre: aIdx,
            });
          });
      });

      if (allAnomalies.length > 0) {
        const { error: anomError } = await supabase.from('rapport_chariot_anomalies').insert(allAnomalies);
        if (anomError) throw anomError;
      }

      // Check alert for écart ≤ 72h after save
      const alertChariots = validLignes
        .filter(l => l.ecart !== null && l.ecart <= 72)
        .map(l => l.chariot_nom);
      if (alertChariots.length > 0) {
        setTimeout(() => setAlertVidange({ show: true, chariots: alertChariots }), 300);
      }

      toast.success('Rapport mis à jour avec succès');
      setEditPopup(prev => ({ ...prev, open: false }));
      loadHistory();
    } catch (err: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const msg = err instanceof Error ? err.message : (err as any)?.message || JSON.stringify(err);
      toast.error('Erreur lors de la sauvegarde: ' + msg);
    } finally {
      setEditPopup(prev => ({ ...prev, saving: false }));
    }
  };

  // ─── Update ligne field ──────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateLigne = (index: number, field: keyof RapportChariotLigne, value: any) => {
    setLignes(prev => {
      const updated = prev.map((l, i) => {
        if (i !== index) return l;
        const newLigne = { ...l, [field]: value };
        if (field === 'compteur_horaire' || field === 'horaire_prochaine_vidange') {
          const compteur = field === 'compteur_horaire' ? value : l.compteur_horaire;
          const vidange = field === 'horaire_prochaine_vidange' ? value : l.horaire_prochaine_vidange;
          if (compteur !== null && vidange !== null) {
            newLigne.ecart = vidange - compteur;
          } else {
            newLigne.ecart = null;
          }
        }
        return newLigne;
      });

      return updated;
    });
  };

  // ─── Remove ligne ────────────────────────────────────────────────
  const removeLigne = (index: number) => {
    setLignes(prev => prev.filter((_, i) => i !== index));
  };

  // ─── Add empty ligne ─────────────────────────────────────────────
  const addEmptyLigne = () => {
    setLignes(prev => [...prev, createEmptyLigne()]);
  };

  // ─── Anomalies management ────────────────────────────────────────
  const addAnomalie = (ligneIndex: number) => {
    setLignes(prev =>
      prev.map((l, i) =>
        i === ligneIndex
          ? { ...l, anomalies: [...l.anomalies, { description: '', numero_di: '' }] }
          : l
      )
    );
  };

  const updateAnomalie = (ligneIndex: number, anomalieIndex: number, description: string) => {
    setLignes(prev =>
      prev.map((l, i) =>
        i === ligneIndex
          ? {
              ...l,
              anomalies: l.anomalies.map((a, j) =>
                j === anomalieIndex ? { ...a, description } : a
              ),
            }
          : l
      )
    );
  };

  const removeAnomalie = (ligneIndex: number, anomalieIndex: number) => {
    setLignes(prev =>
      prev.map((l, i) =>
        i === ligneIndex
          ? { ...l, anomalies: l.anomalies.filter((_, j) => j !== anomalieIndex) }
          : l
      )
    );
  };

  // ─── Resolve or create chariot in DB ──────────────────────────────
  const resolveChariotId = async (nom: string): Promise<string | null> => {
    if (!nom.trim()) return null;

    // Check if already known
    const existing = allChariots.find(c => c.nom.toLowerCase() === nom.trim().toLowerCase());
    if (existing) return existing.id;

    // Create new
    const { data, error } = await supabase
      .from('chariots')
      .insert({ nom: nom.trim() })
      .select('id, nom')
      .single();

    if (error) {
      // May already exist (race condition) — try to find it
      const { data: found } = await supabase
        .from('chariots')
        .select('id, nom')
        .ilike('nom', nom.trim())
        .single();
      if (found) {
        setAllChariots(prev => [...prev, found].sort((a, b) => a.nom.localeCompare(b.nom)));
        return found.id;
      }
      return null;
    }

    setAllChariots(prev => [...prev, data].sort((a, b) => a.nom.localeCompare(b.nom)));
    return data.id;
  };

  // ─── Save rapport ────────────────────────────────────────────────
  const handleSave = async () => {
    // Filter out lines with no chariot name
    const validLignes = lignes.filter(l => l.chariot_nom.trim() !== '');

    if (validLignes.length === 0) {
      toast.error('Saisissez au moins un nom de chariot dans le tableau');
      return;
    }

    setSaving(true);

    try {
      const [hours, minutes] = timeValue.split(':').map(Number);
      const dateRapport = new Date(date);
      dateRapport.setHours(hours, minutes, 0, 0);

      // 1) Resolve ALL chariot IDs first (before creating the rapport)
      const resolvedLignes: { ligne: RapportChariotLigne; chariotId: string }[] = [];
      for (const ligne of validLignes) {
        const chariotId = await resolveChariotId(ligne.chariot_nom);
        if (!chariotId) throw new Error(`Impossible de créer le chariot "${ligne.chariot_nom}"`);
        resolvedLignes.push({ ligne, chariotId });
      }

      // 2) Create rapport header
      const { data, error } = await supabase
        .from('rapports_chariots')
        .insert({ date_rapport: dateRapport.toISOString() })
        .select('id')
        .single();
      if (error) throw error;
      const rapportId = data.id;

      // 3) Batch insert all lignes at once
      const lignesInsert = resolvedLignes.map(({ ligne, chariotId }) => ({
        rapport_id: rapportId,
        chariot_id: chariotId,
        etat: ligne.etat,
        compteur_horaire: ligne.compteur_horaire,
        horaire_prochaine_vidange: ligne.horaire_prochaine_vidange,
        numero_di: ligne.numero_di || null,
        gasoil: ligne.gasoil,
        temps_arret: ligne.temps_arret,
        numero_permis: ligne.numero_permis || null,
      }));

      const { data: insertedLignes, error: lignesError } = await supabase
        .from('rapport_chariot_lignes')
        .insert(lignesInsert)
        .select('id');
      if (lignesError) throw lignesError;

      // 4) Batch insert all anomalies at once
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const allAnomalies: any[] = [];
      resolvedLignes.forEach(({ ligne }, idx) => {
        const ligneId = insertedLignes[idx].id;
        ligne.anomalies
          .filter(a => a.description.trim() !== '')
          .forEach((a, aIdx) => {
            allAnomalies.push({
              ligne_id: ligneId,
              description: a.description.trim(),
              numero_di: a.numero_di?.trim() || '',
              ordre: aIdx,
            });
          });
      });

      if (allAnomalies.length > 0) {
        const { error: anomError } = await supabase.from('rapport_chariot_anomalies').insert(allAnomalies);
        if (anomError) throw anomError;
      }

      // Check alert for écart ≤ 72h after save
      const alertChariots = validLignes
        .filter(l => l.ecart !== null && l.ecart <= 72)
        .map(l => l.chariot_nom);
      if (alertChariots.length > 0) {
        setTimeout(() => setAlertVidange({ show: true, chariots: alertChariots }), 300);
      }

      toast.success('Rapport sauvegardé avec succès');
      setLignes(createInitialLignes());
      setDate(new Date());
      setTimeValue(format(new Date(), 'HH:mm'));
    } catch (error: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const msg = error instanceof Error ? error.message : (error as any)?.message || JSON.stringify(error);
      toast.error('Erreur lors de la sauvegarde: ' + msg);
    } finally {
      setSaving(false);
    }
  };

  // ─── Delete rapport ──────────────────────────────────────────────
  const handleDeleteRapport = async () => {
    if (!deleteRapportId) return;

    const { error } = await supabase
      .from('rapports_chariots')
      .delete()
      .eq('id', deleteRapportId);

    if (error) {
      toast.error('Erreur lors de la suppression');
    } else {
      toast.success('Rapport supprimé');
      loadHistory();
    }
    setDeleteRapportId(null);
  };

  // ─── Taux de disponibilité global ────────────────────────────────
  const lignesAvecEtat = lignes.filter(l => l.chariot_nom.trim() && l.etat);
  const lignesEnMarche = lignesAvecEtat.filter(l => l.etat === 'marche');
  const tauxDisponibilite = lignesAvecEtat.length > 0
    ? Math.round((lignesEnMarche.length / lignesAvecEtat.length) * 100)
    : null;

  // ─── Generic export function ─────────────────────────────────────
  const doExport = async (type: 'pdf' | 'image', ref: React.RefObject<HTMLDivElement | null>, exportDate: Date) => {
    if (!ref.current) return;

    toast.info('Export en cours...');

    try {
      const canvas = await html2canvas(ref.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        allowTaint: true,
        logging: false,
        onclone: (clonedDoc: Document) => {
          const container = clonedDoc.querySelector('[data-export-ref]');
          if (!container) return;

          // Hide elements marked for export-hide
          container.querySelectorAll('.export-hide').forEach(el => {
            (el as HTMLElement).style.display = 'none';
          });

          // Replace all inputs with styled spans
          container.querySelectorAll('input').forEach(input => {
            const span = clonedDoc.createElement('span');
            span.textContent = input.value || input.placeholder || '';
            span.style.cssText = `
              display: flex;
              align-items: center;
              justify-content: center;
              text-align: center;
              font-size: 14px;
              padding: 4px 8px;
              min-height: 36px;
              color: ${input.value ? '#111' : '#999'};
            `;
            input.parentNode?.replaceChild(span, input);
          });

          // Replace buttons inside table rows with styled spans (skip hidden ones)
          container.querySelectorAll('table button').forEach(btn => {
            const htmlBtn = btn as HTMLButtonElement;
            if (htmlBtn.classList.contains('export-hide') || htmlBtn.closest('.export-hide')) return;
            const span = clonedDoc.createElement('span');
            span.textContent = htmlBtn.textContent || '';
            const computed = window.getComputedStyle(htmlBtn);
            span.style.cssText = `
              display: inline-flex;
              align-items: center;
              justify-content: center;
              text-align: center;
              font-size: ${computed.fontSize};
              font-weight: ${computed.fontWeight};
              color: ${computed.color};
              background-color: ${computed.backgroundColor};
              border: ${computed.border};
              border-radius: ${computed.borderRadius};
              padding: ${computed.padding};
              height: ${computed.height};
              min-width: ${computed.width};
            `;
            htmlBtn.parentNode?.replaceChild(span, htmlBtn);
          });
        },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      const timestamp = format(exportDate, 'yyyyMMdd_HHmm');

      if (type === 'image') {
        const link = document.createElement('a');
        link.download = `rapport_chariots_${timestamp}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        toast.success('Image exportée avec succès');
      } else {
        const pdf = new jsPDF({
          orientation: 'landscape',
          unit: 'mm',
          format: 'a4',
        });

        const imgWidth = 287;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        const imgData = canvas.toDataURL('image/png');

        pdf.addImage(imgData, 'PNG', 5, 5, imgWidth, imgHeight);
        pdf.save(`rapport_chariots_${timestamp}.pdf`);
        toast.success('PDF exporté avec succès');
      }
    } catch (error: unknown) {
      toast.error("Erreur lors de l'export: " + (error instanceof Error ? error.message : String(error)));
    }
  };

  const handleExport = (type: 'pdf' | 'image') => doExport(type, exportRef, date);
  const handlePopupExport = (type: 'pdf' | 'image') => doExport(type, popupExportRef, editPopup.date);

  // ─── Print from history ─────────────────────────────────────────
  const pendingPrint = useRef<{ type: 'pdf' | 'image'; date: Date } | null>(null);

  const handleHistoryPrint = async (type: 'pdf' | 'image') => {
    const rapportId = printDialog.rapportId;
    if (!rapportId) return;
    setPrintDialog({ open: false, rapportId: null });

    // Load rapport data from DB to get the date
    const { data: rapport } = await supabase
      .from('rapports_chariots')
      .select('date_rapport')
      .eq('id', rapportId)
      .single();

    const rapportDate = rapport ? new Date(rapport.date_rapport) : new Date();
    pendingPrint.current = { type, date: rapportDate };

    await openEditPopup(rapportId);
  };

  // Effect: when popup opens with a pending print, export after render
  useEffect(() => {
    if (editPopup.open && pendingPrint.current) {
      const { type, date: exportDate } = pendingPrint.current;
      pendingPrint.current = null;
      const timer = setTimeout(() => {
        doExport(type, popupExportRef, exportDate);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [editPopup.open]);

  // ─── Render ───────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-[1600px] mx-auto space-y-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="new">
              <FilePlus className="h-4 w-4 mr-1" />
              Nouveau
            </TabsTrigger>
            <TabsTrigger value="history">
              <List className="h-4 w-4 mr-1" />
              Historique
            </TabsTrigger>
          </TabsList>

          {/* ─── NEW / EDIT TAB ─────────────────────────────────── */}
          <TabsContent value="new">
            <Card>
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center justify-end gap-4">
                  {/* Right: Image, PDF, Sauvegarder */}
                  <div className="flex items-center gap-2 flex-wrap ml-auto">
                    <Button variant="outline" onClick={() => handleExport('image')}>
                      <ImageIcon className="h-4 w-4 mr-1" />
                      Image
                    </Button>
                    <Button variant="outline" onClick={() => handleExport('pdf')}>
                      <FileDown className="h-4 w-4 mr-1" />
                      PDF
                    </Button>
                    <Button onClick={handleSave} disabled={saving}>
                      <Save className="h-4 w-4 mr-1" />
                      {saving ? 'Sauvegarde...' : 'Sauvegarder'}
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                {/* Export container — everything inside this ref is captured */}
                <div ref={exportRef} data-export-ref className="bg-white p-4">
                  {/* Header: date + title */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    {/* Date & Time picker */}
                    <div className="flex items-center gap-2">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="justify-start text-left font-normal">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {format(date, 'PPP', { locale: fr })}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={date}
                            onSelect={(d) => d && setDate(d)}
                            locale={fr}
                          />
                        </PopoverContent>
                      </Popover>
                      <Input
                        type="time"
                        value={timeValue}
                        onChange={(e) => setTimeValue(e.target.value)}
                        className="w-28"
                      />
                    </div>

                    {/* Title */}
                    <h2 className="text-xl md:text-2xl font-bold text-center uppercase tracking-wide">
                      Rapport sur l'état des chariots
                    </h2>

                    {/* Taux de disponibilité */}
                    <div className="flex items-center gap-2 min-w-[180px] justify-end">
                      {tauxDisponibilite !== null ? (
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border font-semibold text-sm ${
                          tauxDisponibilite >= 80
                            ? 'bg-green-50 border-green-300 text-green-700'
                            : tauxDisponibilite >= 50
                            ? 'bg-amber-50 border-amber-300 text-amber-700'
                            : 'bg-red-50 border-red-300 text-red-700'
                        }`}>
                          <div className={`h-3 w-3 rounded-full ${
                            tauxDisponibilite >= 80
                              ? 'bg-green-500'
                              : tauxDisponibilite >= 50
                              ? 'bg-amber-500'
                              : 'bg-red-500'
                          }`} />
                          Disponibilité : {tauxDisponibilite}%
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-gray-50 border-gray-200 text-gray-400 text-sm">
                          <div className="h-3 w-3 rounded-full bg-gray-300" />
                          Disponibilité : —
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Table */}
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-10 text-center">N°</TableHead>
                          <TableHead className="min-w-[130px]">Chariot</TableHead>
                          <TableHead className="min-w-[180px] text-center">État</TableHead>
                          <TableHead className="min-w-[120px]">Compteur horaire (h)</TableHead>
                          <TableHead className="min-w-[140px]">Horaire proch. vidange (h)</TableHead>
                          <TableHead className="min-w-[90px]">Écart (h)</TableHead>
                          <TableHead className="min-w-[200px]">Anomalie</TableHead>
                          <TableHead className="min-w-[100px]">N° DI</TableHead>
                          <TableHead className="min-w-[90px]">Gasoil</TableHead>
                          <TableHead className="min-w-[110px]">Temps d'arrêt (h)</TableHead>
                          <TableHead className="min-w-[110px]">N° Permis</TableHead>
                          <TableHead className="w-10"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {lignes.map((ligne, index) => {
                          const rowStyle =
                            ligne.etat === 'marche'
                              ? { backgroundColor: '#dcfce7' } // green-100
                              : ligne.etat === 'arret'
                              ? { backgroundColor: '#fee2e2' } // red-100
                              : undefined;

                          return (
                            <TableRow key={index} style={rowStyle}>
                              <TableCell className="text-center font-semibold text-muted-foreground text-sm">{index + 1}</TableCell>
                              {/* Chariot name — input direct */}
                              <TableCell className="font-medium">
                                <Input
                                  placeholder="Nom du chariot"
                                  value={ligne.chariot_nom}
                                  onChange={(e) => updateLigne(index, 'chariot_nom', e.target.value)}
                                  className="w-44 text-xs"
                                />
                              </TableCell>

                              {/* État — Big Buttons */}
                              <TableCell className="text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <Button
                                    type="button"
                                    className={`h-9 px-3 text-sm font-bold ${
                                      ligne.etat === 'marche'
                                        ? 'bg-green-600 hover:bg-green-700 text-white'
                                        : 'bg-white hover:bg-green-50 text-green-700 border border-green-300'
                                    }`}
                                    onClick={() => updateLigne(index, 'etat', 'marche')}
                                  >
                                    MARCHE
                                  </Button>
                                  <Button
                                    type="button"
                                    className={`h-9 px-3 text-sm font-bold ${
                                      ligne.etat === 'arret'
                                        ? 'bg-red-600 hover:bg-red-700 text-white'
                                        : 'bg-white hover:bg-red-50 text-red-700 border border-red-300'
                                    }`}
                                    onClick={() => updateLigne(index, 'etat', 'arret')}
                                  >
                                    ARRÊT
                                  </Button>
                                </div>
                              </TableCell>

                              {/* Compteur horaire */}
                              <TableCell>
                                <Input
                                  type="number"
                                  min="0"
                                  value={ligne.compteur_horaire ?? ''}
                                  onChange={(e) =>
                                    updateLigne(index, 'compteur_horaire', e.target.value ? parseFloat(e.target.value) : null)
                                  }
                                  className="w-24"
                                />
                              </TableCell>

                              {/* Horaire prochaine vidange */}
                              <TableCell>
                                <Input
                                  type="number"
                                  min="0"
                                  value={ligne.horaire_prochaine_vidange ?? ''}
                                  onChange={(e) =>
                                    updateLigne(index, 'horaire_prochaine_vidange', e.target.value ? parseFloat(e.target.value) : null)
                                  }
                                  className="w-28 text-xs"
                                />
                              </TableCell>

                              {/* Écart (calculé) */}
                              <TableCell>
                                <span
                                  className={`font-semibold ${
                                    ligne.ecart !== null && ligne.ecart <= 72
                                      ? 'text-red-600'
                                      : 'text-gray-700'
                                  }`}
                                >
                                  {ligne.ecart !== null ? ligne.ecart : '—'}
                                </span>
                              </TableCell>

                              {/* Anomalies — list + button to open dialog */}
                              <TableCell>
                                <div className="space-y-1">
                                  {ligne.anomalies.length > 0 && (
                                    <div className="text-xs space-y-0.5">
                                      {ligne.anomalies.map((a, aIdx) => (
                                        <div key={aIdx} className="text-gray-700 leading-tight">
                                          <span className="font-bold">{aIdx + 1}.</span> {a.description}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-xs print:hidden export-hide"
                                    onClick={() => setAnomalyDialog({ open: true, ligneIndex: index })}
                                  >
                                    <Plus className="h-3 w-3 mr-1" />
                                    Ajouter
                                  </Button>
                                </div>
                              </TableCell>

                              {/* N° DI — from anomalies */}
                              <TableCell>
                                {ligne.anomalies.length > 0 ? (
                                  <div className="text-xs space-y-0.5">
                                    {ligne.anomalies.map((a, aIdx) => (
                                      <div key={aIdx} className="text-gray-700 leading-tight">
                                        <span className="font-bold">{aIdx + 1}.</span> <span className="font-semibold">{a.numero_di || '—'}</span>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-xs text-gray-400">—</span>
                                )}
                              </TableCell>

                              {/* Gasoil */}
                              <TableCell>
                                <Input
                                  type="number"
                                  min="0"
                                  value={ligne.gasoil ?? ''}
                                  onChange={(e) =>
                                    updateLigne(index, 'gasoil', e.target.value ? parseFloat(e.target.value) : null)
                                  }
                                  className="w-20"
                                />
                              </TableCell>

                              {/* Temps d'arrêt */}
                              <TableCell>
                                <Input
                                  type="number"
                                  min="0"
                                  value={ligne.temps_arret ?? ''}
                                  onChange={(e) =>
                                    updateLigne(index, 'temps_arret', e.target.value ? parseFloat(e.target.value) : null)
                                  }
                                  className="w-24"
                                />
                              </TableCell>

                              {/* N° Permis */}
                              <TableCell>
                                <Input
                                  value={ligne.numero_permis}
                                  onChange={(e) => updateLigne(index, 'numero_permis', e.target.value)}
                                  className="w-24"
                                />
                              </TableCell>

                              {/* Delete row */}
                              <TableCell className="export-hide">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-red-500 hover:text-red-700"
                                  onClick={() => removeLigne(index)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Add line button — outside export ref */}
                <div className="mt-4">
                  <Button variant="outline" onClick={addEmptyLigne}>
                    <Plus className="h-4 w-4 mr-1" />
                    Ajouter une ligne
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── HISTORY TAB ────────────────────────────────────── */}
          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Historique des rapports</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {editPopup.open ? (
                  /* ─── INLINE EDIT VIEW ─────────────────────────────── */
                  <div>
                    {/* Header: Retour + export buttons */}
                    <div className="flex items-center justify-between mb-4">
                      <Button variant="outline" className="border-red-400 text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => setEditPopup(prev => ({ ...prev, open: false }))}>
                        <RotateCcw className="h-4 w-4 mr-1" />
                        Retour
                      </Button>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => handlePopupExport('image')}>
                          <ImageIcon className="h-4 w-4 mr-1" />
                          Image
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handlePopupExport('pdf')}>
                          <FileDown className="h-4 w-4 mr-1" />
                          PDF
                        </Button>
                        <Button onClick={handleSavePopup} disabled={editPopup.saving}>
                          <Save className="h-4 w-4 mr-1" />
                          {editPopup.saving ? 'Sauvegarde...' : 'Sauvegarder'}
                        </Button>
                      </div>
                    </div>

                    {/* Export container */}
                    <div ref={popupExportRef} data-export-ref className="bg-white p-4">
                      {/* Date & Time + Title + Dispo */}
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                        <div className="flex items-center gap-2">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" className="justify-start text-left font-normal">
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {format(editPopup.date, 'PPP', { locale: fr })}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <Calendar
                                mode="single"
                                selected={editPopup.date}
                                onSelect={(d) => d && setEditPopup(prev => ({ ...prev, date: d }))}
                                locale={fr}
                              />
                            </PopoverContent>
                          </Popover>
                          <Input
                            type="time"
                            value={editPopup.timeValue}
                            onChange={(e) => setEditPopup(prev => ({ ...prev, timeValue: e.target.value }))}
                            className="w-28"
                          />
                        </div>

                        <h2 className="text-xl md:text-2xl font-bold text-center uppercase tracking-wide">
                          Rapport sur l'état des chariots
                        </h2>

                        {/* Taux de disponibilité */}
                        {(() => {
                          const popupAvec = editPopup.lignes.filter(l => l.chariot_nom.trim() && l.etat);
                          const popupMarche = popupAvec.filter(l => l.etat === 'marche');
                          const popupTaux = popupAvec.length > 0 ? Math.round((popupMarche.length / popupAvec.length) * 100) : null;
                          return (
                            <div className="flex items-center gap-2 min-w-[180px] justify-end">
                              {popupTaux !== null ? (
                                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border font-semibold text-sm ${
                                  popupTaux >= 80 ? 'bg-green-50 border-green-300 text-green-700'
                                    : popupTaux >= 50 ? 'bg-amber-50 border-amber-300 text-amber-700'
                                    : 'bg-red-50 border-red-300 text-red-700'
                                }`}>
                                  <div className={`h-3 w-3 rounded-full ${
                                    popupTaux >= 80 ? 'bg-green-500' : popupTaux >= 50 ? 'bg-amber-500' : 'bg-red-500'
                                  }`} />
                                  Disponibilité : {popupTaux}%
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-gray-50 border-gray-200 text-gray-400 text-sm">
                                  <div className="h-3 w-3 rounded-full bg-gray-300" />
                                  Disponibilité : —
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>

                      {/* Table */}
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-10 text-center">N°</TableHead>
                              <TableHead className="min-w-[130px]">Chariot</TableHead>
                              <TableHead className="min-w-[180px] text-center">État</TableHead>
                              <TableHead className="min-w-[120px]">Compteur horaire (h)</TableHead>
                              <TableHead className="min-w-[140px]">Horaire proch. vidange (h)</TableHead>
                              <TableHead className="min-w-[90px]">Écart (h)</TableHead>
                              <TableHead className="min-w-[200px]">Anomalie</TableHead>
                              <TableHead className="min-w-[100px]">N° DI</TableHead>
                              <TableHead className="min-w-[90px]">Gasoil</TableHead>
                              <TableHead className="min-w-[110px]">Temps d'arrêt (h)</TableHead>
                              <TableHead className="min-w-[110px]">N° Permis</TableHead>
                              <TableHead className="w-10 export-hide"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {editPopup.lignes.map((ligne, index) => {
                              const rowStyle =
                                ligne.etat === 'marche'
                                  ? { backgroundColor: '#dcfce7' }
                                  : ligne.etat === 'arret'
                                  ? { backgroundColor: '#fee2e2' }
                                  : undefined;
                              return (
                                <TableRow key={index} style={rowStyle}>
                                  <TableCell className="text-center font-semibold text-muted-foreground text-sm">{index + 1}</TableCell>
                                  <TableCell className="font-medium">
                                    <Input
                                      placeholder="Nom du chariot"
                                      value={ligne.chariot_nom}
                                      onChange={(e) => updatePopupLigne(index, 'chariot_nom', e.target.value)}
                                      className="w-44 text-xs"
                                    />
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <div className="flex items-center justify-center gap-2">
                                      <Button
                                        type="button"
                                        className={`h-9 px-3 text-sm font-bold ${
                                          ligne.etat === 'marche'
                                            ? 'bg-green-600 hover:bg-green-700 text-white'
                                            : 'bg-white hover:bg-green-50 text-green-700 border border-green-300'
                                        }`}
                                        onClick={() => updatePopupLigne(index, 'etat', 'marche')}
                                      >
                                        MARCHE
                                      </Button>
                                      <Button
                                        type="button"
                                        className={`h-9 px-3 text-sm font-bold ${
                                          ligne.etat === 'arret'
                                            ? 'bg-red-600 hover:bg-red-700 text-white'
                                            : 'bg-white hover:bg-red-50 text-red-700 border border-red-300'
                                        }`}
                                        onClick={() => updatePopupLigne(index, 'etat', 'arret')}
                                      >
                                        ARRÊT
                                      </Button>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <Input
                                      type="number"
                                      min="0"
                                      value={ligne.compteur_horaire ?? ''}
                                      onChange={(e) => updatePopupLigne(index, 'compteur_horaire', e.target.value ? parseFloat(e.target.value) : null)}
                                      className="w-24"
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <Input
                                      type="number"
                                      min="0"
                                      value={ligne.horaire_prochaine_vidange ?? ''}
                                      onChange={(e) => updatePopupLigne(index, 'horaire_prochaine_vidange', e.target.value ? parseFloat(e.target.value) : null)}
                                      className="w-28"
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <span className={`font-semibold ${ligne.ecart !== null && ligne.ecart <= 72 ? 'text-red-600' : 'text-gray-700'}`}>
                                      {ligne.ecart !== null ? ligne.ecart : '—'}
                                    </span>
                                  </TableCell>
                                  <TableCell>
                                    <div className="space-y-1">
                                      {ligne.anomalies.length > 0 && (
                                        <div className="text-xs space-y-0.5">
                                          {ligne.anomalies.map((a, aIdx) => (
                                            <div key={aIdx} className="text-gray-700 leading-tight">
                                              <span className="font-bold">{aIdx + 1}.</span> {a.description}
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="h-7 text-xs export-hide"
                                        onClick={() => setEditPopup(prev => ({ ...prev, anomalyDialog: { open: true, ligneIndex: index } }))}
                                      >
                                        <Plus className="h-3 w-3 mr-1" />
                                        Ajouter
                                      </Button>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    {ligne.anomalies.length > 0 ? (
                                      <div className="text-xs space-y-0.5">
                                        {ligne.anomalies.map((a, aIdx) => (
                                          <div key={aIdx} className="text-gray-700 leading-tight">
                                            <span className="font-bold">{aIdx + 1}.</span> <span className="font-semibold">{a.numero_di || '—'}</span>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <span className="text-xs text-gray-400">—</span>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <Input
                                      type="number"
                                      min="0"
                                      value={ligne.gasoil ?? ''}
                                      onChange={(e) => updatePopupLigne(index, 'gasoil', e.target.value ? parseFloat(e.target.value) : null)}
                                      className="w-20"
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <Input
                                      type="number"
                                      min="0"
                                      value={ligne.temps_arret ?? ''}
                                      onChange={(e) => updatePopupLigne(index, 'temps_arret', e.target.value ? parseFloat(e.target.value) : null)}
                                      className="w-24"
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <Input
                                      value={ligne.numero_permis}
                                      onChange={(e) => updatePopupLigne(index, 'numero_permis', e.target.value)}
                                      className="w-24"
                                    />
                                  </TableCell>
                                  <TableCell className="export-hide">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-red-500 hover:text-red-700"
                                      onClick={() => removePopupLigne(index)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </div>{/* close popupExportRef */}

                    <div className="flex justify-between mt-4">
                      <Button variant="outline" onClick={addPopupLigne}>
                        <Plus className="h-4 w-4 mr-1" />
                        Ajouter une ligne
                      </Button>
                    </div>
                  </div>
                ) : (
                <>
                {/* Filters */}
                <div className="flex flex-wrap items-end gap-3 p-3 bg-gray-50 rounded-lg border">
                  {/* Date period selector */}
                  <div className="w-[130px]">
                    <Label className="text-xs mb-1 block">Période</Label>
                    <Select
                      value={filters.datePeriod}
                      onValueChange={(v: DatePeriodType) => setFilters(f => ({ ...f, datePeriod: v }))}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Toutes périodes</SelectItem>
                        <SelectItem value="year">Année</SelectItem>
                        <SelectItem value="month">Mois</SelectItem>
                        <SelectItem value="period">Période</SelectItem>
                        <SelectItem value="day">Jour</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Conditional date sub-filters */}
                  {(filters.datePeriod === 'year' || filters.datePeriod === 'month') && (
                    <div className="w-[100px]">
                      <Label className="text-xs mb-1 block">Année</Label>
                      <Select
                        value={String(filters.dateYear)}
                        onValueChange={(v) => setFilters(f => ({ ...f, dateYear: Number(v) }))}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 5 }, (_, i) => currentYear - i).map(y => (
                            <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {filters.datePeriod === 'month' && (
                    <div className="w-[120px]">
                      <Label className="text-xs mb-1 block">Mois</Label>
                      <Select
                        value={String(filters.dateMonth)}
                        onValueChange={(v) => setFilters(f => ({ ...f, dateMonth: Number(v) }))}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'].map((m, i) => (
                            <SelectItem key={i} value={String(i)}>{m}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {filters.datePeriod === 'period' && (
                    <>
                      <div className="w-[130px]">
                        <Label className="text-xs mb-1 block">Date début</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className="w-full justify-start text-left text-xs">
                              <CalendarIcon className="mr-1 h-3 w-3" />
                              {filters.dateFrom ? format(filters.dateFrom, 'dd/MM/yyyy') : 'Début'}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={filters.dateFrom}
                              onSelect={(d) => setFilters(f => ({ ...f, dateFrom: d || undefined }))}
                              locale={fr}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div className="w-[130px]">
                        <Label className="text-xs mb-1 block">Date fin</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className="w-full justify-start text-left text-xs">
                              <CalendarIcon className="mr-1 h-3 w-3" />
                              {filters.dateTo ? format(filters.dateTo, 'dd/MM/yyyy') : 'Fin'}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={filters.dateTo}
                              onSelect={(d) => setFilters(f => ({ ...f, dateTo: d || undefined }))}
                              locale={fr}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </>
                  )}

                  {filters.datePeriod === 'day' && (
                    <div className="w-[130px]">
                      <Label className="text-xs mb-1 block">Jour</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" className="w-full justify-start text-left text-xs">
                            <CalendarIcon className="mr-1 h-3 w-3" />
                            {filters.dateDay ? format(filters.dateDay, 'dd/MM/yyyy') : 'Choisir...'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={filters.dateDay}
                            onSelect={(d) => setFilters(f => ({ ...f, dateDay: d || undefined }))}
                            locale={fr}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  )}

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => setFilters({ ...emptyFilters })}
                    title="Réinitialiser les filtres"
                  >
                    <RotateCcw className="h-3 w-3" />
                  </Button>
                </div>

                {/* History table */}
                {loadingHistory ? (
                  <p className="text-center text-muted-foreground py-8">Chargement...</p>
                ) : filteredRapports.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Aucun rapport trouvé.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date et Heure</TableHead>
                          <TableHead>Chariots</TableHead>
                          <TableHead>État</TableHead>
                          <TableHead>Disponibilité</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredRapports.map((rapport) => {
                          const enMarche = rapport.lignes.filter(l => l.etat === 'marche').length;
                          const enArret = rapport.lignes.filter(l => l.etat === 'arret').length;
                          const withEtat = enMarche + enArret;
                          const taux = withEtat > 0 ? Math.round((enMarche / withEtat) * 100) : null;
                          return (
                          <TableRow key={rapport.id}>
                            <TableCell className="whitespace-nowrap">
                              {format(new Date(rapport.date_rapport), 'PPP HH:mm', { locale: fr })}
                            </TableCell>
                            <TableCell>
                              <span className="text-sm font-medium">{rapport.lignes.length} chariots</span>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {enMarche > 0 && (
                                  <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-green-100 text-green-700">
                                    {enMarche} Marche
                                  </span>
                                )}
                                {enArret > 0 && (
                                  <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-red-100 text-red-700">
                                    {enArret} Arrêt
                                  </span>
                                )}
                                {withEtat === 0 && (
                                  <span className="text-xs text-gray-400">—</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {taux !== null ? (
                                <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                                  taux >= 80 ? 'bg-green-100 text-green-700'
                                    : taux >= 50 ? 'bg-amber-100 text-amber-700'
                                    : 'bg-red-100 text-red-700'
                                }`}>
                                  {taux}%
                                </span>
                              ) : <span className="text-xs text-gray-400">—</span>}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openEditPopup(rapport.id)}
                                >
                                  <Edit className="h-3 w-3 mr-1" />
                                  Voir
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setPrintDialog({ open: true, rapportId: rapport.id })}
                                >
                                  <Printer className="h-3 w-3 mr-1" />
                                  Imprimer
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-red-500 hover:text-red-700"
                                  onClick={() => setDeleteRapportId(rapport.id)}
                                >
                                  <Trash2 className="h-3 w-3 mr-1" />
                                  Supprimer
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
                </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* ─── VIDANGE ALERT DIALOG ────────────────────────────────── */}
      <Dialog open={alertVidange.show} onOpenChange={(open) => setAlertVidange(prev => ({ ...prev, show: open }))}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              Alerte Vidange
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-gray-700">
              Les chariots suivants ont un écart de vidange inférieur ou égal à <strong>72 heures</strong>.
              Veuillez actualiser la date de la prochaine vidange.
            </p>
            <ul className="list-disc list-inside space-y-1">
              {alertVidange.chariots.map((nom, i) => (
                <li key={i} className="text-sm font-medium text-red-600">{nom}</li>
              ))}
            </ul>
          </div>
          <DialogFooter>
            <Button onClick={() => setAlertVidange({ show: false, chariots: [] })}>
              Compris
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── ANOMALY DIALOG ──────────────────────────────────────── */}
      <Dialog
        open={anomalyDialog.open}
        onOpenChange={(open) => {
          if (!open) setAnomalyDialog({ open: false, ligneIndex: -1 });
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Anomalies {anomalyDialog.ligneIndex >= 0 && lignes[anomalyDialog.ligneIndex]?.chariot_nom
                ? `— ${lignes[anomalyDialog.ligneIndex].chariot_nom}`
                : ''}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[400px] overflow-y-auto">
            {anomalyDialog.ligneIndex >= 0 && lignes[anomalyDialog.ligneIndex]?.anomalies.map((anomalie, aIdx) => (
              <div key={aIdx} className="border rounded-lg p-3 space-y-2 bg-gray-50">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-muted-foreground">Anomalie N°{aIdx + 1}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 text-red-500 hover:text-red-700"
                    onClick={() => removeAnomalie(anomalyDialog.ligneIndex, aIdx)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div>
                  <Label className="text-xs mb-1 block">N° DI</Label>
                  <Input
                    value={anomalie.numero_di}
                    onChange={(e) => {
                      const idx = anomalyDialog.ligneIndex;
                      setLignes(prev => prev.map((l, i) =>
                        i === idx ? { ...l, anomalies: l.anomalies.map((a, j) => j === aIdx ? { ...a, numero_di: e.target.value } : a) } : l
                      ));
                    }}
                    placeholder="N° DI..."
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs mb-1 block">Description</Label>
                  <textarea
                    className="w-full min-h-[50px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={anomalie.description}
                    onChange={(e) => updateAnomalie(anomalyDialog.ligneIndex, aIdx, e.target.value)}
                    placeholder="Décrire l'anomalie..."
                  />
                </div>
              </div>
            ))}
            {anomalyDialog.ligneIndex >= 0 && lignes[anomalyDialog.ligneIndex]?.anomalies.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Aucune anomalie enregistrée.</p>
            )}
          </div>
          <DialogFooter className="flex justify-between sm:justify-between">
            <Button
              variant="outline"
              onClick={() => {
                if (anomalyDialog.ligneIndex >= 0) {
                  addAnomalie(anomalyDialog.ligneIndex);
                }
              }}
            >
              <Plus className="h-4 w-4 mr-1" />
              Nouvelle anomalie
            </Button>
            <Button onClick={() => setAnomalyDialog({ open: false, ligneIndex: -1 })}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── EDIT ANOMALY DIALOG ─────────────────────────────── */}
      <Dialog
        open={editPopup.anomalyDialog.open}
        onOpenChange={(open) => {
          if (!open) setEditPopup(prev => ({ ...prev, anomalyDialog: { open: false, ligneIndex: -1 } }));
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Anomalies {editPopup.anomalyDialog.ligneIndex >= 0 && editPopup.lignes[editPopup.anomalyDialog.ligneIndex]?.chariot_nom
                ? `— ${editPopup.lignes[editPopup.anomalyDialog.ligneIndex].chariot_nom}`
                : ''}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[400px] overflow-y-auto">
            {editPopup.anomalyDialog.ligneIndex >= 0 && editPopup.lignes[editPopup.anomalyDialog.ligneIndex]?.anomalies.map((anomalie, aIdx) => (
              <div key={aIdx} className="border rounded-lg p-3 space-y-2 bg-gray-50">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-muted-foreground">Anomalie N°{aIdx + 1}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 text-red-500 hover:text-red-700"
                    onClick={() => removePopupAnomalie(editPopup.anomalyDialog.ligneIndex, aIdx)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div>
                  <Label className="text-xs mb-1 block">N° DI</Label>
                  <Input
                    value={anomalie.numero_di}
                    onChange={(e) => {
                      const idx = editPopup.anomalyDialog.ligneIndex;
                      setEditPopup(prev => ({
                        ...prev,
                        lignes: prev.lignes.map((l, i) =>
                          i === idx ? { ...l, anomalies: l.anomalies.map((a, j) => j === aIdx ? { ...a, numero_di: e.target.value } : a) } : l
                        ),
                      }));
                    }}
                    placeholder="N° DI..."
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs mb-1 block">Description</Label>
                  <textarea
                    className="w-full min-h-[50px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={anomalie.description}
                    onChange={(e) => updatePopupAnomalie(editPopup.anomalyDialog.ligneIndex, aIdx, e.target.value)}
                    placeholder="Décrire l'anomalie..."
                  />
                </div>
              </div>
            ))}
            {editPopup.anomalyDialog.ligneIndex >= 0 && editPopup.lignes[editPopup.anomalyDialog.ligneIndex]?.anomalies.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Aucune anomalie enregistrée.</p>
            )}
          </div>
          <DialogFooter className="flex justify-between sm:justify-between">
            <Button
              variant="outline"
              onClick={() => {
                if (editPopup.anomalyDialog.ligneIndex >= 0) {
                  addPopupAnomalie(editPopup.anomalyDialog.ligneIndex);
                }
              }}
            >
              <Plus className="h-4 w-4 mr-1" />
              Nouvelle anomalie
            </Button>
            <Button onClick={() => setEditPopup(prev => ({ ...prev, anomalyDialog: { open: false, ligneIndex: -1 } }))}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── PRINT CHOICE DIALOG ─────────────────────────────────── */}
      <Dialog open={printDialog.open} onOpenChange={(open) => { if (!open) setPrintDialog({ open: false, rapportId: null }); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Exporter le rapport</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Choisissez le format d'export :</p>
          <div className="flex gap-3 justify-center mt-2">
            <Button variant="outline" className="flex-1" onClick={() => handleHistoryPrint('image')}>
              <ImageIcon className="h-4 w-4 mr-2" />
              Image
            </Button>
            <Button variant="outline" className="flex-1" onClick={() => handleHistoryPrint('pdf')}>
              <FileDown className="h-4 w-4 mr-2" />
              PDF
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── DELETE CONFIRMATION ─────────────────────────────────── */}
      <AlertDialog open={!!deleteRapportId} onOpenChange={(open) => !open && setDeleteRapportId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce rapport ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le rapport et toutes ses lignes seront définitivement supprimés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteRapport} className="bg-red-600 hover:bg-red-700">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default FormChariot;
