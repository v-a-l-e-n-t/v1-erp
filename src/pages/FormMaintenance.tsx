import { useState, useEffect, useCallback, useRef } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
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
import {
  CalendarIcon, Save, List, FilePlus, FileDown, ImageIcon,
  RotateCcw, Trash2, Eye, ArrowLeft, ChevronRight, Plus, CheckCircle, Pencil, AlertTriangle,
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// ─── Zone / Equipment defaults ──────────────────────────────────────

interface ZoneEquipement {
  nom: string;
  total: number; // parsed from "Sur XX"
}

interface ZoneConfig {
  nom: string;
  equipements: ZoneEquipement[];
}

const SPHERE_EQUIPEMENTS: ZoneEquipement[] = [
  { nom: 'VANNES MANUELLES', total: 3 },
  { nom: 'VANNES AUTOMATIQUES', total: 4 },
  { nom: 'FIN DE COURSE', total: 4 },
  { nom: 'TUYAUTERIE AIR COMPRIME', total: 0 },
];

const DEFAULT_ZONES: ZoneConfig[] = [
  { nom: 'SPHERE 01', equipements: [...SPHERE_EQUIPEMENTS] },
  { nom: 'SPHERE 02', equipements: [...SPHERE_EQUIPEMENTS] },
  { nom: 'SPHERE 03', equipements: [...SPHERE_EQUIPEMENTS] },
  {
    nom: 'UTILITES',
    equipements: [
      { nom: 'COMPRESSEUR A AIR', total: 2 },
      { nom: 'SECHEUR D\'AIR', total: 2 },
      { nom: 'GROUPE ELECTROGENE', total: 1 },
      { nom: 'TUYAUTERIE AIR COMPRIME', total: 1 },
    ],
  },
  {
    nom: 'LOCAL LPP ET POMPE HYDRAULIQUE',
    equipements: [
      { nom: 'POMPES GPL CENTRE EMPLISSEUR', total: 3 },
      { nom: 'POMPES GPL DEPOT VRAC', total: 3 },
      { nom: 'FIN DE COURSE', total: 12 },
      { nom: 'CENTRALE HYDRAULIQUE (CLAPET)', total: 3 },
    ],
  },
];

// ─── Types ──────────────────────────────────────────────────────────

interface MaintenanceLigne {
  zone: string;
  equipement: string;
  total: number;
  disponible: number | null;
}

interface MaintenanceAnomalie {
  id: string;
  zone: string;
  equipement: string;
  description: string;
  numero_di: string;
  numero_permis: string;
  date_constatation: string;
  date_resolution: string | null;
}

interface RapportHistorique {
  id: string;
  date_rapport: string;
  created_at: string;
  updated_at: string;
  lignes: MaintenanceLigne[];
}

// ─── History filter types ───────────────────────────────────────────

type DatePeriodType = 'all' | 'year' | 'month' | 'period' | 'day';

interface HistoryFilters {
  datePeriod: DatePeriodType;
  dateYear: number;
  dateMonth: number;
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

// ─── Helpers ────────────────────────────────────────────────────────

const createInitialLignes = (): MaintenanceLigne[] =>
  DEFAULT_ZONES.flatMap(zone =>
    zone.equipements.map(eq => ({
      zone: zone.nom,
      equipement: eq.nom,
      total: eq.total,
      disponible: null,
    }))
  );

const groupByZone = (lignes: MaintenanceLigne[]): Map<string, MaintenanceLigne[]> => {
  const map = new Map<string, MaintenanceLigne[]>();
  for (const l of lignes) {
    if (!map.has(l.zone)) map.set(l.zone, []);
    map.get(l.zone)!.push(l);
  }
  return map;
};

const daysSince = (dateStr: string): number =>
  Math.max(0, Math.ceil((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24)));

const daysBetween = (from: string, to: string): number =>
  Math.max(0, Math.ceil((new Date(to).getTime() - new Date(from).getTime()) / (1000 * 60 * 60 * 24)));

// ─── Component ──────────────────────────────────────────────────────

const FormMaintenance = () => {
  // Form state
  const [date, setDate] = useState<Date>(new Date());
  const [timeValue, setTimeValue] = useState(format(new Date(), 'HH:mm'));
  const [lignes, setLignes] = useState<MaintenanceLigne[]>(createInitialLignes);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('new');

  // Anomalies (persistent)
  const [anomalies, setAnomalies] = useState<MaintenanceAnomalie[]>([]);
  const [anomalyDialog, setAnomalyDialog] = useState<{
    open: boolean;
    editId: string | null;
    zone: string;
    equipement: string;
    description: string;
    numero_di: string;
    numero_permis: string;
    date_constatation: Date;
  }>({ open: false, editId: null, zone: '', equipement: '', description: '', numero_di: '', numero_permis: '', date_constatation: new Date() });
  const [deleteAnomalyId, setDeleteAnomalyId] = useState<string | null>(null);
  const [resolveDialog, setResolveDialog] = useState<{
    open: boolean;
    anomalyId: string | null;
    useToday: boolean;
    customDate: Date;
  }>({ open: false, anomalyId: null, useToday: true, customDate: new Date() });

  // Export choice dialog
  const [exportChoiceDialog, setExportChoiceDialog] = useState<{
    open: boolean;
    type: 'pdf' | 'image';
    context: 'new' | 'popup';
  }>({ open: false, type: 'image', context: 'new' });

  // Export refs
  const exportRef = useRef<HTMLDivElement>(null);
  const popupExportRef = useRef<HTMLDivElement>(null);

  // History
  const [rapports, setRapports] = useState<RapportHistorique[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [filters, setFilters] = useState<HistoryFilters>({ ...emptyFilters });

  // Delete confirmation
  const [deleteRapportId, setDeleteRapportId] = useState<string | null>(null);

  // Suivi anomalie filters
  const [suiviFilters, setSuiviFilters] = useState<{
    statut: 'all' | 'open' | 'resolved';
    zone: string;
    datePeriod: DatePeriodType;
    dateYear: number;
    dateMonth: number;
    dateFrom: Date | undefined;
    dateTo: Date | undefined;
    dateDay: Date | undefined;
  }>({
    statut: 'all',
    zone: 'all',
    datePeriod: 'all',
    dateYear: currentYear,
    dateMonth: new Date().getMonth(),
    dateFrom: undefined,
    dateTo: undefined,
    dateDay: undefined,
  });

  // Edit inline state
  const [editPopup, setEditPopup] = useState<{
    open: boolean;
    rapportId: string | null;
    date: Date;
    timeValue: string;
    lignes: MaintenanceLigne[];
    saving: boolean;
  }>({
    open: false,
    rapportId: null,
    date: new Date(),
    timeValue: '',
    lignes: [],
    saving: false,
  });

  // Print choice dialog
  const [printDialog, setPrintDialog] = useState<{ open: boolean; rapportId: string | null }>({ open: false, rapportId: null });

  // ─── Load anomalies ──────────────────────────────────────────────
  const loadAnomalies = useCallback(async () => {
    const { data } = await supabase
      .from('maintenance_anomalies')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) {
      setAnomalies(data.map(a => ({
        id: a.id,
        zone: a.zone as string,
        equipement: a.equipement as string,
        description: (a.description as string) || '',
        numero_di: (a.numero_di as string) || '',
        numero_permis: (a.numero_permis as string) || '',
        date_constatation: a.date_constatation as string,
        date_resolution: a.date_resolution as string | null,
      })));
    }
  }, []);

  useEffect(() => {
    loadAnomalies();
  }, [loadAnomalies]);

  // Get open anomalies for a specific zone + equipement
  const getOpenAnomalies = (zone: string, equipement: string) =>
    anomalies.filter(a => a.zone === zone && a.equipement === equipement && !a.date_resolution);

  // ─── Add / Edit anomaly ──────────────────────────────────────────
  const handleSaveAnomaly = async () => {
    const { editId, zone, equipement, description, numero_di, numero_permis, date_constatation } = anomalyDialog;
    if (!description.trim()) {
      toast.error('Saisissez une description');
      return;
    }

    const dateStr = format(date_constatation, 'yyyy-MM-dd');

    if (editId) {
      // Update existing
      const { error } = await supabase
        .from('maintenance_anomalies')
        .update({
          description: description.trim(),
          numero_di: numero_di.trim(),
          numero_permis: numero_permis.trim(),
          date_constatation: dateStr,
        })
        .eq('id', editId);

      if (error) {
        toast.error('Erreur: ' + (error.message || JSON.stringify(error)));
        return;
      }
      toast.success('Anomalie modifiée');
    } else {
      // Insert new
      const { error } = await supabase
        .from('maintenance_anomalies')
        .insert({
          zone,
          equipement,
          description: description.trim(),
          numero_di: numero_di.trim(),
          numero_permis: numero_permis.trim(),
          date_constatation: dateStr,
        });

      if (error) {
        toast.error('Erreur: ' + (error.message || JSON.stringify(error)));
        return;
      }
      toast.success('Anomalie ajoutée');
    }

    setAnomalyDialog({ open: false, editId: null, zone: '', equipement: '', description: '', numero_di: '', numero_permis: '', date_constatation: new Date() });
    loadAnomalies();
  };

  // ─── Delete anomaly ────────────────────────────────────────────
  const handleDeleteAnomaly = async () => {
    if (!deleteAnomalyId) return;

    const { error } = await supabase
      .from('maintenance_anomalies')
      .delete()
      .eq('id', deleteAnomalyId);

    if (error) {
      toast.error('Erreur: ' + (error.message || JSON.stringify(error)));
    } else {
      toast.success('Anomalie supprimée');
      loadAnomalies();
    }
    setDeleteAnomalyId(null);
  };

  // ─── Resolve anomaly ─────────────────────────────────────────────
  const handleResolveAnomaly = async () => {
    if (!resolveDialog.anomalyId) return;

    const dateRes = resolveDialog.useToday
      ? format(new Date(), 'yyyy-MM-dd')
      : format(resolveDialog.customDate, 'yyyy-MM-dd');

    const { error } = await supabase
      .from('maintenance_anomalies')
      .update({ date_resolution: dateRes })
      .eq('id', resolveDialog.anomalyId);

    if (error) {
      toast.error('Erreur: ' + (error.message || JSON.stringify(error)));
      return;
    }

    toast.success('Anomalie résolue');
    setResolveDialog({ open: false, anomalyId: null, useToday: true, customDate: new Date() });
    loadAnomalies();
  };

  // ─── Load history ─────────────────────────────────────────────────
  const historyLoaded = useRef(false);
  const loadHistory = useCallback(async (force = false) => {
    if (historyLoaded.current && !force) return;
    setLoadingHistory(true);

    // Single query with joined lignes
    const { data, error } = await supabase
      .from('rapports_maintenance')
      .select('*, rapport_maintenance_lignes(zone, equipement, total, disponible, ordre)')
      .order('date_rapport', { ascending: false });

    if (error || !data) {
      setRapports([]);
      setLoadingHistory(false);
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rapportsWithLignes: RapportHistorique[] = data.map((r: any) => ({
      id: r.id,
      date_rapport: r.date_rapport,
      created_at: r.created_at,
      updated_at: r.updated_at,
      lignes: (r.rapport_maintenance_lignes || [])
        .sort((a: { ordre: number }, b: { ordre: number }) => a.ordre - b.ordre)
        .map((l: { zone: string; equipement: string; total: number; disponible: number | null }) => ({
          zone: l.zone,
          equipement: l.equipement,
          total: l.total,
          disponible: l.disponible,
        })),
    }));

    setRapports(rapportsWithLignes);
    historyLoaded.current = true;
    setLoadingHistory(false);
  }, []);

  // Pre-load history on mount so it's ready when user clicks the tab
  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    if (activeTab === 'suivi') {
      loadAnomalies();
    }
  }, [activeTab, loadAnomalies]);

  // ─── Filter history ───────────────────────────────────────────────
  const filteredRapports = rapports.filter(r => {
    const rapportDate = new Date(r.date_rapport);

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

  // ─── Update ligne field ──────────────────────────────────────────
  const updateLigne = (globalIndex: number, field: keyof MaintenanceLigne, value: number | null) => {
    setLignes(prev => prev.map((l, i) => (i === globalIndex ? { ...l, [field]: value } : l)));
  };

  const updatePopupLigne = (globalIndex: number, field: keyof MaintenanceLigne, value: number | null) => {
    setEditPopup(prev => ({
      ...prev,
      lignes: prev.lignes.map((l, i) => (i === globalIndex ? { ...l, [field]: value } : l)),
    }));
  };

  // ─── Save rapport ────────────────────────────────────────────────
  const handleSave = async () => {
    const validLignes = lignes.filter(l => l.equipement.trim() !== '');
    if (validLignes.length === 0) {
      toast.error('Aucune ligne à sauvegarder');
      return;
    }

    setSaving(true);

    try {
      const [hours, minutes] = timeValue.split(':').map(Number);
      const dateRapport = new Date(date);
      dateRapport.setHours(hours, minutes, 0, 0);

      const { data, error } = await supabase
        .from('rapports_maintenance')
        .insert({ date_rapport: dateRapport.toISOString() })
        .select('id')
        .single();
      if (error) throw error;
      const rapportId = data.id;

      const lignesInsert = validLignes.map((l, idx) => ({
        rapport_id: rapportId,
        zone: l.zone,
        equipement: l.equipement,
        total: l.total,
        disponible: l.disponible,
        ordre: idx,
      }));

      const { error: lignesError } = await supabase
        .from('rapport_maintenance_lignes')
        .insert(lignesInsert);
      if (lignesError) throw lignesError;

      toast.success('Rapport sauvegardé avec succès');
      setLignes(createInitialLignes());
      setDate(new Date());
      setTimeValue(format(new Date(), 'HH:mm'));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : (err as Record<string, string>)?.message || JSON.stringify(err);
      toast.error('Erreur lors de la sauvegarde: ' + msg);
    } finally {
      setSaving(false);
    }
  };

  // ─── Open rapport in inline edit ─────────────────────────────────
  const openEditPopup = async (rapportId: string) => {
    const { data: rapport } = await supabase
      .from('rapports_maintenance')
      .select('*')
      .eq('id', rapportId)
      .single();

    if (!rapport) return;

    const rapportDate = new Date(rapport.date_rapport);

    const { data: lignesData } = await supabase
      .from('rapport_maintenance_lignes')
      .select('*')
      .eq('rapport_id', rapportId)
      .order('ordre');

    const lignesLoaded: MaintenanceLigne[] = (lignesData || []).map(l => ({
      zone: l.zone as string,
      equipement: l.equipement as string,
      total: l.total as number,
      disponible: l.disponible as number | null,
    }));

    setEditPopup({
      open: true,
      rapportId,
      date: rapportDate,
      timeValue: format(rapportDate, 'HH:mm'),
      lignes: lignesLoaded,
      saving: false,
    });
  };

  // ─── Save edit popup ─────────────────────────────────────────────
  const handleSavePopup = async () => {
    const validLignes = editPopup.lignes.filter(l => l.equipement.trim() !== '');
    if (validLignes.length === 0) {
      toast.error('Aucune ligne à sauvegarder');
      return;
    }

    setEditPopup(prev => ({ ...prev, saving: true }));

    try {
      const [hours, minutes] = editPopup.timeValue.split(':').map(Number);
      const dateRapport = new Date(editPopup.date);
      dateRapport.setHours(hours, minutes, 0, 0);

      const rapportId = editPopup.rapportId!;

      const { error } = await supabase
        .from('rapports_maintenance')
        .update({
          date_rapport: dateRapport.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', rapportId);
      if (error) throw error;

      const { error: delError } = await supabase
        .from('rapport_maintenance_lignes')
        .delete()
        .eq('rapport_id', rapportId);
      if (delError) throw delError;

      const lignesInsert = validLignes.map((l, idx) => ({
        rapport_id: rapportId,
        zone: l.zone,
        equipement: l.equipement,
        total: l.total,
        disponible: l.disponible,
        ordre: idx,
      }));

      const { error: lignesError } = await supabase
        .from('rapport_maintenance_lignes')
        .insert(lignesInsert);
      if (lignesError) throw lignesError;

      toast.success('Rapport mis à jour avec succès');
      setEditPopup(prev => ({ ...prev, open: false }));
      loadHistory(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : (err as Record<string, string>)?.message || JSON.stringify(err);
      toast.error('Erreur lors de la sauvegarde: ' + msg);
    } finally {
      setEditPopup(prev => ({ ...prev, saving: false }));
    }
  };

  // ─── Delete rapport ──────────────────────────────────────────────
  const handleDeleteRapport = async () => {
    if (!deleteRapportId) return;

    const { error } = await supabase
      .from('rapports_maintenance')
      .delete()
      .eq('id', deleteRapportId);

    if (error) {
      toast.error('Erreur lors de la suppression');
    } else {
      toast.success('Rapport supprimé');
      loadHistory(true);
    }
    setDeleteRapportId(null);
  };

  // ─── Clone cleanup helper ────────────────────────────────────────
  const cleanupClone = (container: Element, clonedDoc: Document) => {
    // With forceMount, content is always in DOM but hidden via data-[state=closed]:hidden
    // Change all data-state="closed" to "open" so CSS shows them
    container.querySelectorAll('[data-state="closed"]').forEach(el => {
      el.setAttribute('data-state', 'open');
      (el as HTMLElement).classList.remove('hidden');
      (el as HTMLElement).style.display = '';
    });

    // Also remove hidden from any remaining hidden elements
    container.querySelectorAll('[hidden]').forEach(el => {
      el.removeAttribute('hidden');
    });

    container.querySelectorAll('.export-hide').forEach(el => {
      (el as HTMLElement).style.display = 'none';
    });

    container.querySelectorAll('input').forEach(input => {
      const span = clonedDoc.createElement('span');
      span.textContent = input.value || input.placeholder || '';
      span.style.cssText = `display:flex;align-items:center;font-size:14px;padding:4px 8px;min-height:36px;color:${input.value ? '#111' : '#999'};`;
      input.parentNode?.replaceChild(span, input);
    });

    container.querySelectorAll('table button').forEach(btn => {
      const htmlBtn = btn as HTMLButtonElement;
      if (htmlBtn.classList.contains('export-hide') || htmlBtn.closest('.export-hide')) return;
      const span = clonedDoc.createElement('span');
      span.textContent = htmlBtn.textContent || '';
      const computed = window.getComputedStyle(htmlBtn);
      span.style.cssText = `display:inline-flex;align-items:center;justify-content:center;font-size:${computed.fontSize};font-weight:${computed.fontWeight};color:${computed.color};background-color:${computed.backgroundColor};border:${computed.border};border-radius:${computed.borderRadius};padding:${computed.padding};height:${computed.height};min-width:${computed.width};`;
      htmlBtn.parentNode?.replaceChild(span, htmlBtn);
    });
  };

  const saveCanvas = (canvas: HTMLCanvasElement, type: 'pdf' | 'image', filename: string) => {
    if (type === 'image') {
      const link = document.createElement('a');
      link.download = `${filename}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } else {
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const imgWidth = 287;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 5, 5, imgWidth, imgHeight);
      pdf.save(`${filename}.pdf`);
    }
  };

  // ─── Grouped export (all zones open in one file) ───────────────
  const doGroupedExport = async (type: 'pdf' | 'image', ref: React.RefObject<HTMLDivElement | null>, exportDate: Date) => {
    if (!ref.current) return;
    toast.info('Export groupé en cours...');

    try {
      const canvas = await html2canvas(ref.current, {
        scale: 2, backgroundColor: '#ffffff', useCORS: true, allowTaint: true, logging: false,
        onclone: (clonedDoc: Document) => {
          const container = clonedDoc.querySelector('[data-export-ref]');
          if (!container) return;
          cleanupClone(container, clonedDoc);
        },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      saveCanvas(canvas, type, `fiche_check_installations_${format(exportDate, 'yyyyMMdd_HHmm')}`);
      toast.success('Export groupé terminé');
    } catch (error: unknown) {
      toast.error("Erreur lors de l'export: " + (error instanceof Error ? error.message : String(error)));
    }
  };

  // ─── Individual export (one file per zone) ─────────────────────
  const doIndividualExport = async (type: 'pdf' | 'image', ref: React.RefObject<HTMLDivElement | null>, exportDate: Date, zoneNames: string[]) => {
    if (!ref.current) return;
    toast.info(`Export individuel de ${zoneNames.length} zones en cours...`);

    for (let zi = 0; zi < zoneNames.length; zi++) {
      const zoneName = zoneNames[zi];
      try {
        const canvas = await html2canvas(ref.current, {
          scale: 2, backgroundColor: '#ffffff', useCORS: true, allowTaint: true, logging: false,
          onclone: (clonedDoc: Document) => {
            const container = clonedDoc.querySelector('[data-export-ref]');
            if (!container) return;
            cleanupClone(container, clonedDoc);

            // Hide all zones except the current one
            container.querySelectorAll('[data-zone-name]').forEach(zc => {
              if ((zc as HTMLElement).getAttribute('data-zone-name') !== zoneName) {
                (zc as HTMLElement).style.display = 'none';
              }
            });
          },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any);

        const safeZoneName = zoneName.replace(/\s+/g, '_').toLowerCase();
        saveCanvas(canvas, type, `fiche_check_${safeZoneName}_${format(exportDate, 'yyyyMMdd_HHmm')}`);
        await new Promise(resolve => setTimeout(resolve, 400));
      } catch (error: unknown) {
        toast.error(`Erreur export ${zoneName}: ` + (error instanceof Error ? error.message : String(error)));
      }
    }
    toast.success(`${zoneNames.length} fichiers exportés avec succès`);
  };

  // ─── Export handlers ───────────────────────────────────────────
  const handleExport = (type: 'pdf' | 'image') => {
    setExportChoiceDialog({ open: true, type, context: 'new' });
  };
  const handlePopupExport = (type: 'pdf' | 'image') => {
    setExportChoiceDialog({ open: true, type, context: 'popup' });
  };
  const handleExportChoice = async (mode: 'grouped' | 'individual') => {
    const { type, context } = exportChoiceDialog;
    setExportChoiceDialog(prev => ({ ...prev, open: false }));

    const ref = context === 'new' ? exportRef : popupExportRef;
    const exportDate = context === 'new' ? date : editPopup.date;
    const groups = context === 'new' ? zoneGroups : editZoneGroups;

    if (mode === 'grouped') {
      await doGroupedExport(type, ref, exportDate);
    } else {
      await doIndividualExport(type, ref, exportDate, Array.from(groups.keys()));
    }
  };

  // ─── Print from history ──────────────────────────────────────────
  const pendingPrint = useRef<{ type: 'pdf' | 'image'; date: Date } | null>(null);

  const handleHistoryPrint = async (type: 'pdf' | 'image') => {
    const rapportId = printDialog.rapportId;
    if (!rapportId) return;
    setPrintDialog({ open: false, rapportId: null });

    const { data: rapport } = await supabase
      .from('rapports_maintenance')
      .select('date_rapport')
      .eq('id', rapportId)
      .single();

    const rapportDate = rapport ? new Date(rapport.date_rapport) : new Date();
    pendingPrint.current = { type, date: rapportDate };

    await openEditPopup(rapportId);
  };

  useEffect(() => {
    if (editPopup.open && pendingPrint.current) {
      const { type, date: exportDate } = pendingPrint.current;
      pendingPrint.current = null;
      const timer = setTimeout(() => {
        doGroupedExport(type, popupExportRef, exportDate);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [editPopup.open]);

  // ─── Render zone table ───────────────────────────────────────────
  const renderZoneTable = (
    zoneName: string,
    zoneLignes: MaintenanceLigne[],
    globalStartIndex: number,
    onUpdate: (globalIndex: number, field: keyof MaintenanceLigne, value: number | null) => void,
    isPopup?: boolean,
  ) => {
    const openAnoms = anomalies.filter(a => a.zone === zoneName && !a.date_resolution);
    const totalEquip = zoneLignes.reduce((s, l) => s + l.total, 0);
    const totalDispo = zoneLignes.reduce((s, l) => s + (l.disponible ?? 0), 0);

    return (
      <div key={zoneName} data-zone-name={zoneName}>
      <Collapsible defaultOpen={false} className="group/zone">
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between px-4 py-3 rounded-xl border border-slate-200 bg-white hover:border-orange-300 hover:shadow-sm transition-all duration-200 cursor-pointer group-data-[state=open]/zone:rounded-b-none group-data-[state=open]/zone:border-orange-300 group-data-[state=open]/zone:bg-orange-50/50">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-orange-100 text-orange-600 group-data-[state=open]/zone:bg-orange-500 group-data-[state=open]/zone:text-white transition-colors">
                <ChevronRight className="h-4 w-4 transition-transform duration-200 group-data-[state=open]/zone:rotate-90" />
              </div>
              <span className="text-sm font-bold uppercase tracking-wide text-slate-700 group-data-[state=open]/zone:text-orange-700">
                {zoneName}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {totalEquip > 0 && (
                <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                  {totalDispo}/{totalEquip}
                </span>
              )}
              {openAnoms.length > 0 && (
                <span className="text-xs font-semibold bg-red-100 text-red-700 px-2.5 py-1 rounded-full">
                  {openAnoms.length} anomalie{openAnoms.length > 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent forceMount className="data-[state=closed]:hidden">
          <div className="border border-t-0 border-slate-200 rounded-b-xl overflow-hidden bg-white group-data-[state=open]/zone:border-orange-300">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/80">
                    <TableHead className="w-10 text-center text-xs font-semibold text-slate-500">N°</TableHead>
                    <TableHead className="min-w-[200px] text-xs font-semibold text-slate-500">Equipements</TableHead>
                    <TableHead className="min-w-[120px] text-center text-xs font-semibold text-slate-500">Disponible</TableHead>
                    <TableHead className="min-w-[250px] text-xs font-semibold text-slate-500">Anomalie</TableHead>
                    <TableHead className="min-w-[100px] text-xs font-semibold text-slate-500">N° DI</TableHead>
                    <TableHead className="min-w-[100px] text-xs font-semibold text-slate-500">N° Permis</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {zoneLignes.map((ligne, localIdx) => {
                    const globalIdx = globalStartIndex + localIdx;
                    const eqAnomalies = getOpenAnomalies(zoneName, ligne.equipement);

                    return (
                      <TableRow key={globalIdx} className="hover:bg-slate-50/50">
                        <TableCell className="text-center font-semibold text-slate-400 text-sm">
                          {localIdx + 1}
                        </TableCell>
                        <TableCell className="font-medium text-sm text-slate-700 uppercase">
                          {ligne.equipement || '—'}
                        </TableCell>
                        <TableCell className="text-center">
                          {ligne.total > 0 ? (
                            <div className="flex items-center justify-center gap-1.5">
                              <Input
                                type="number"
                                min="0"
                                max={ligne.total}
                                value={ligne.disponible ?? ''}
                                onChange={e =>
                                  onUpdate(globalIdx, 'disponible', e.target.value ? parseInt(e.target.value) : null)
                                }
                                className="w-14 h-8 text-center text-sm rounded-lg border-slate-200 focus:border-orange-400 focus:ring-orange-400"
                              />
                              <span className="text-sm font-medium text-slate-400">
                                / {String(ligne.total).padStart(2, '0')}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-300 text-sm">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1.5">
                            {eqAnomalies.map((a, aIdx) => {
                              const days = daysSince(a.date_constatation);
                              return (
                                <div key={a.id} className="flex items-center gap-1.5 text-xs bg-slate-50 rounded-lg px-2 py-1.5">
                                  <span className="font-bold text-slate-500 shrink-0">{aIdx + 1}.</span>
                                  <div className="flex-1 min-w-0">
                                    <span className="text-slate-700">{a.description}</span>
                                    <span className={`ml-1.5 inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                                      days > 7 ? 'bg-red-100 text-red-700' : days > 3 ? 'bg-orange-100 text-orange-700' : 'bg-amber-100 text-amber-700'
                                    }`}>
                                      {days}j
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0 export-hide">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-full"
                                      onClick={() =>
                                        setAnomalyDialog({
                                          open: true,
                                          editId: a.id,
                                          zone: a.zone,
                                          equipement: a.equipement,
                                          description: a.description,
                                          numero_di: a.numero_di,
                                          numero_permis: a.numero_permis,
                                          date_constatation: new Date(a.date_constatation),
                                        })
                                      }
                                      title="Modifier"
                                    >
                                      <Pencil className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full"
                                      onClick={() => setDeleteAnomalyId(a.id)}
                                      title="Supprimer"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                    <button
                                      type="button"
                                      className="flex items-center gap-1 px-2 py-1 rounded-md border border-red-300 bg-red-50 text-red-600 hover:bg-emerald-50 hover:border-emerald-400 hover:text-emerald-600 transition-colors text-[10px] font-medium"
                                      onClick={() => setResolveDialog({ open: true, anomalyId: a.id, useToday: true, customDate: new Date() })}
                                      title="Cocher si problème résolu"
                                    >
                                      <CheckCircle className="h-3 w-3" />
                                      Résolu ?
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                            {ligne.equipement && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs rounded-lg border-dashed border-slate-300 text-slate-500 hover:text-orange-600 hover:border-orange-300 hover:bg-orange-50/50 export-hide"
                                onClick={() =>
                                  setAnomalyDialog({
                                    open: true,
                                    editId: null,
                                    zone: zoneName,
                                    equipement: ligne.equipement,
                                    description: '',
                                    numero_di: '',
                                    numero_permis: '',
                                    date_constatation: new Date(),
                                  })
                                }
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                Ajouter
                              </Button>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {eqAnomalies.length > 0 ? (
                            <div className="text-xs space-y-1.5">
                              {eqAnomalies.map((a, aIdx) => (
                                <div key={a.id} className="text-slate-600 leading-tight h-[30px] flex items-center">
                                  <span className="font-bold text-slate-400">{aIdx + 1}.</span>{' '}
                                  <span className="font-semibold ml-1">{a.numero_di || '—'}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-300 text-xs">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {eqAnomalies.length > 0 ? (
                            <div className="text-xs space-y-1.5">
                              {eqAnomalies.map((a, aIdx) => (
                                <div key={a.id} className="text-slate-600 leading-tight h-[30px] flex items-center">
                                  <span className="font-bold text-slate-400">{aIdx + 1}.</span>{' '}
                                  <span className="font-semibold ml-1">{a.numero_permis || '—'}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-300 text-xs">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
      </div>
    );
  };

  // Build grouped data
  const zoneGroups = groupByZone(lignes);
  const editZoneGroups = groupByZone(editPopup.lignes);

  // ─── Render ───────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50/50 p-4 md:p-6">
      <div className="max-w-[1600px] mx-auto space-y-5">
        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-800 tracking-tight">
              Fiche de Check des Installations
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">Suivi de disponibilité et anomalies</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-white border shadow-sm rounded-xl h-11 p-1">
            <TabsTrigger value="new" className="rounded-lg data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=active]:shadow-sm px-4">
              <FilePlus className="h-4 w-4 mr-1.5" />
              Nouveau
            </TabsTrigger>
            <TabsTrigger value="history" className="rounded-lg data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=active]:shadow-sm px-4">
              <List className="h-4 w-4 mr-1.5" />
              Historique
            </TabsTrigger>
            <TabsTrigger value="suivi" className="rounded-lg data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=active]:shadow-sm px-4">
              <AlertTriangle className="h-4 w-4 mr-1.5" />
              Suivi Anomalie
            </TabsTrigger>
          </TabsList>

          {/* ─── NEW TAB ────────────────────────────────────────── */}
          <TabsContent value="new" className="mt-4">
            <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="bg-white border-b border-slate-100 pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Label className="text-sm font-semibold text-slate-600">Date :</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="justify-start text-left font-normal rounded-lg h-9 text-sm border-slate-200">
                            <CalendarIcon className="mr-2 h-4 w-4 text-slate-400" />
                            {format(date, 'PPP', { locale: fr })}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={date}
                            onSelect={d => d && setDate(d)}
                            locale={fr}
                          />
                        </PopoverContent>
                      </Popover>
                      <Input
                        type="time"
                        value={timeValue}
                        onChange={e => setTimeValue(e.target.value)}
                        className="w-28 h-9 rounded-lg border-slate-200"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button variant="outline" onClick={() => handleExport('image')} className="rounded-lg h-9 text-sm border-slate-200">
                      <ImageIcon className="h-4 w-4 mr-1.5" />
                      Image
                    </Button>
                    <Button variant="outline" onClick={() => handleExport('pdf')} className="rounded-lg h-9 text-sm border-slate-200">
                      <FileDown className="h-4 w-4 mr-1.5" />
                      PDF
                    </Button>
                    <Button onClick={handleSave} disabled={saving} className="rounded-lg h-9 text-sm bg-orange-500 hover:bg-orange-600">
                      <Save className="h-4 w-4 mr-1.5" />
                      {saving ? 'Sauvegarde...' : 'Sauvegarder'}
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-4 md:p-6">
                <div ref={exportRef} data-export-ref className="bg-white">
                  {/* Title for export */}
                  <h2 className="text-lg md:text-xl font-bold text-center uppercase tracking-wide text-slate-800 mb-6">
                    FICHE DE CHECK DES INSTALLATIONS
                  </h2>

                  {/* Zone tables */}
                  <div className="space-y-3">
                    {(() => {
                      let globalIdx = 0;
                      return Array.from(zoneGroups.entries()).map(([zoneName, zoneLignes]) => {
                        const startIdx = globalIdx;
                        globalIdx += zoneLignes.length;
                        return renderZoneTable(zoneName, zoneLignes, startIdx, updateLigne);
                      });
                    })()}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── HISTORY TAB ──────────────────────────────────── */}
          <TabsContent value="history" className="mt-4">
            {editPopup.open ? (
              /* ── Inline edit view ─────────────────────────────── */
              <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden">
                <CardHeader className="bg-white border-b border-slate-100 pb-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <Button
                      variant="outline"
                      onClick={() => setEditPopup(prev => ({ ...prev, open: false }))}
                      className="rounded-lg h-9 text-sm border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
                    >
                      <ArrowLeft className="h-4 w-4 mr-1.5" />
                      Retour
                    </Button>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Button variant="outline" onClick={() => handlePopupExport('image')} className="rounded-lg h-9 text-sm border-slate-200">
                        <ImageIcon className="h-4 w-4 mr-1.5" />
                        Image
                      </Button>
                      <Button variant="outline" onClick={() => handlePopupExport('pdf')} className="rounded-lg h-9 text-sm border-slate-200">
                        <FileDown className="h-4 w-4 mr-1.5" />
                        PDF
                      </Button>
                      <Button onClick={handleSavePopup} disabled={editPopup.saving} className="rounded-lg h-9 text-sm bg-orange-500 hover:bg-orange-600">
                        <Save className="h-4 w-4 mr-1.5" />
                        {editPopup.saving ? 'Sauvegarde...' : 'Sauvegarder'}
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-4 md:p-6">
                  <div ref={popupExportRef} data-export-ref className="bg-white">
                    <h2 className="text-lg md:text-xl font-bold text-center uppercase tracking-wide text-slate-800 mb-6">
                      FICHE DE CHECK DES INSTALLATIONS
                    </h2>

                    <div className="flex flex-wrap items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <Label className="text-sm font-semibold text-slate-600">Date :</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="justify-start text-left font-normal rounded-lg h-9 text-sm border-slate-200">
                              <CalendarIcon className="mr-2 h-4 w-4 text-slate-400" />
                              {format(editPopup.date, 'PPP', { locale: fr })}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={editPopup.date}
                              onSelect={d => d && setEditPopup(prev => ({ ...prev, date: d }))}
                              locale={fr}
                            />
                          </PopoverContent>
                        </Popover>
                        <Input
                          type="time"
                          value={editPopup.timeValue}
                          onChange={e => setEditPopup(prev => ({ ...prev, timeValue: e.target.value }))}
                          className="w-28 h-9 rounded-lg border-slate-200"
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      {(() => {
                        let globalIdx = 0;
                        return Array.from(editZoneGroups.entries()).map(([zoneName, zoneLignes]) => {
                          const startIdx = globalIdx;
                          globalIdx += zoneLignes.length;
                          return renderZoneTable(zoneName, zoneLignes, startIdx, updatePopupLigne, true);
                        });
                      })()}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              /* ── History list view ────────────────────────────── */
              <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden">
                <CardHeader className="bg-white border-b border-slate-100">
                  <div className="flex flex-col md:flex-row md:items-center gap-3 flex-wrap">
                    <Select
                      value={filters.datePeriod}
                      onValueChange={v => setFilters(prev => ({ ...prev, datePeriod: v as DatePeriodType }))}
                    >
                      <SelectTrigger className="w-44">
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

                    {filters.datePeriod === 'year' && (
                      <Select
                        value={String(filters.dateYear)}
                        onValueChange={v => setFilters(prev => ({ ...prev, dateYear: Number(v) }))}
                      >
                        <SelectTrigger className="w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 5 }, (_, i) => currentYear - i).map(y => (
                            <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}

                    {filters.datePeriod === 'month' && (
                      <>
                        <Select
                          value={String(filters.dateYear)}
                          onValueChange={v => setFilters(prev => ({ ...prev, dateYear: Number(v) }))}
                        >
                          <SelectTrigger className="w-28">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 5 }, (_, i) => currentYear - i).map(y => (
                              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select
                          value={String(filters.dateMonth)}
                          onValueChange={v => setFilters(prev => ({ ...prev, dateMonth: Number(v) }))}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 12 }, (_, i) => (
                              <SelectItem key={i} value={String(i)}>
                                {format(new Date(2024, i, 1), 'MMMM', { locale: fr })}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </>
                    )}

                    {filters.datePeriod === 'period' && (
                      <>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="justify-start text-left font-normal text-sm">
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {filters.dateFrom ? format(filters.dateFrom, 'dd/MM/yyyy') : 'Du'}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={filters.dateFrom}
                              onSelect={d => setFilters(prev => ({ ...prev, dateFrom: d || undefined }))}
                              locale={fr}
                            />
                          </PopoverContent>
                        </Popover>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="justify-start text-left font-normal text-sm">
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {filters.dateTo ? format(filters.dateTo, 'dd/MM/yyyy') : 'Au'}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={filters.dateTo}
                              onSelect={d => setFilters(prev => ({ ...prev, dateTo: d || undefined }))}
                              locale={fr}
                            />
                          </PopoverContent>
                        </Popover>
                      </>
                    )}

                    {filters.datePeriod === 'day' && (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="justify-start text-left font-normal text-sm">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {filters.dateDay ? format(filters.dateDay, 'dd/MM/yyyy') : 'Choisir un jour'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={filters.dateDay}
                            onSelect={d => setFilters(prev => ({ ...prev, dateDay: d || undefined }))}
                            locale={fr}
                          />
                        </PopoverContent>
                      </Popover>
                    )}

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setFilters({ ...emptyFilters })}
                      className="text-muted-foreground"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>

                <CardContent>
                  {loadingHistory ? (
                    <div className="flex justify-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
                    </div>
                  ) : filteredRapports.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">Aucun rapport trouvé.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date et Heure</TableHead>
                          <TableHead className="text-center">Equipements</TableHead>
                          <TableHead className="text-center">Anomalies</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredRapports.map(rapport => {
                          const rapportDate = new Date(rapport.date_rapport);
                          const rapportDateStr = format(rapportDate, 'yyyy-MM-dd');
                          const totalDispo = rapport.lignes.reduce((s, l) => s + (l.disponible ?? 0), 0);
                          const totalEquip = rapport.lignes.reduce((s, l) => s + l.total, 0);
                          const totalHS = totalEquip - totalDispo;
                          // Anomalies open at that date
                          const anomCount = anomalies.filter(a =>
                            a.date_constatation <= rapportDateStr &&
                            (!a.date_resolution || a.date_resolution > rapportDateStr)
                          ).length;
                          return (
                            <TableRow key={rapport.id}>
                              <TableCell className="text-sm">
                                {format(rapportDate, 'dd MMM yyyy HH:mm', { locale: fr })}
                              </TableCell>
                              <TableCell className="text-center">
                                <div className="flex items-center justify-center gap-2">
                                  {totalDispo > 0 && (
                                    <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-green-100 text-green-700">
                                      {totalDispo} Dispo
                                    </span>
                                  )}
                                  {totalHS > 0 && (
                                    <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-red-100 text-red-700">
                                      {totalHS} HS
                                    </span>
                                  )}
                                  {totalEquip === 0 && (
                                    <span className="text-xs text-gray-400">—</span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                {anomCount > 0 ? (
                                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                                    {anomCount}
                                  </span>
                                ) : (
                                  <span className="text-xs text-gray-400">0</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-xs"
                                    onClick={() => openEditPopup(rapport.id)}
                                  >
                                    <Eye className="h-3 w-3 mr-1" />
                                    Voir
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-xs"
                                    onClick={() => setPrintDialog({ open: true, rapportId: rapport.id })}
                                  >
                                    <FileDown className="h-3 w-3 mr-1" />
                                    Imprimer
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-xs text-red-600 hover:bg-red-50"
                                    onClick={() => setDeleteRapportId(rapport.id)}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ─── SUIVI ANOMALIE TAB ──────────────────────────────── */}
          <TabsContent value="suivi" className="mt-4">
            <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="bg-white border-b border-slate-100 pb-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-800">Suivi des Anomalies</h3>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-50 text-red-700 font-semibold">
                      {anomalies.filter(a => !a.date_resolution).length} En cours
                    </span>
                    <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-50 text-green-700 font-semibold">
                      {anomalies.filter(a => !!a.date_resolution).length} Résolues
                    </span>
                  </div>
                </div>

                {/* ── Filtres avancés ──────────────────────────────── */}
                <div className="flex flex-col md:flex-row md:items-center gap-3 flex-wrap">
                  {/* Statut */}
                  <Select
                    value={suiviFilters.statut}
                    onValueChange={v => setSuiviFilters(prev => ({ ...prev, statut: v as 'all' | 'open' | 'resolved' }))}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les statuts</SelectItem>
                      <SelectItem value="open">En cours</SelectItem>
                      <SelectItem value="resolved">Résolues</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Zone */}
                  <Select
                    value={suiviFilters.zone}
                    onValueChange={v => setSuiviFilters(prev => ({ ...prev, zone: v }))}
                  >
                    <SelectTrigger className="w-52">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes les zones</SelectItem>
                      {DEFAULT_ZONES.map(z => (
                        <SelectItem key={z.nom} value={z.nom}>{z.nom}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Période */}
                  <Select
                    value={suiviFilters.datePeriod}
                    onValueChange={v => setSuiviFilters(prev => ({ ...prev, datePeriod: v as DatePeriodType }))}
                  >
                    <SelectTrigger className="w-44">
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

                  {suiviFilters.datePeriod === 'year' && (
                    <Select
                      value={String(suiviFilters.dateYear)}
                      onValueChange={v => setSuiviFilters(prev => ({ ...prev, dateYear: Number(v) }))}
                    >
                      <SelectTrigger className="w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 5 }, (_, i) => currentYear - i).map(y => (
                          <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {suiviFilters.datePeriod === 'month' && (
                    <>
                      <Select
                        value={String(suiviFilters.dateYear)}
                        onValueChange={v => setSuiviFilters(prev => ({ ...prev, dateYear: Number(v) }))}
                      >
                        <SelectTrigger className="w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 5 }, (_, i) => currentYear - i).map(y => (
                            <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select
                        value={String(suiviFilters.dateMonth)}
                        onValueChange={v => setSuiviFilters(prev => ({ ...prev, dateMonth: Number(v) }))}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 12 }, (_, i) => (
                            <SelectItem key={i} value={String(i)}>
                              {format(new Date(2024, i, 1), 'MMMM', { locale: fr })}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </>
                  )}

                  {suiviFilters.datePeriod === 'period' && (
                    <>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="justify-start text-left font-normal text-sm">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {suiviFilters.dateFrom ? format(suiviFilters.dateFrom, 'dd/MM/yyyy') : 'Du'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={suiviFilters.dateFrom}
                            onSelect={d => setSuiviFilters(prev => ({ ...prev, dateFrom: d || undefined }))}
                            locale={fr}
                          />
                        </PopoverContent>
                      </Popover>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="justify-start text-left font-normal text-sm">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {suiviFilters.dateTo ? format(suiviFilters.dateTo, 'dd/MM/yyyy') : 'Au'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={suiviFilters.dateTo}
                            onSelect={d => setSuiviFilters(prev => ({ ...prev, dateTo: d || undefined }))}
                            locale={fr}
                          />
                        </PopoverContent>
                      </Popover>
                    </>
                  )}

                  {suiviFilters.datePeriod === 'day' && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="justify-start text-left font-normal text-sm">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {suiviFilters.dateDay ? format(suiviFilters.dateDay, 'dd/MM/yyyy') : 'Choisir un jour'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={suiviFilters.dateDay}
                          onSelect={d => setSuiviFilters(prev => ({ ...prev, dateDay: d || undefined }))}
                          locale={fr}
                        />
                      </PopoverContent>
                    </Popover>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSuiviFilters({
                      statut: 'all', zone: 'all', datePeriod: 'all',
                      dateYear: currentYear, dateMonth: new Date().getMonth(),
                      dateFrom: undefined, dateTo: undefined, dateDay: undefined,
                    })}
                    className="text-muted-foreground"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {(() => {
                  // Apply filters
                  const filtered = anomalies.filter(a => {
                    // Statut
                    if (suiviFilters.statut === 'open' && a.date_resolution) return false;
                    if (suiviFilters.statut === 'resolved' && !a.date_resolution) return false;
                    // Zone
                    if (suiviFilters.zone !== 'all' && a.zone !== suiviFilters.zone) return false;
                    // Date (based on date_constatation)
                    const aDate = new Date(a.date_constatation);
                    if (suiviFilters.datePeriod === 'year') {
                      if (aDate.getFullYear() !== suiviFilters.dateYear) return false;
                    } else if (suiviFilters.datePeriod === 'month') {
                      if (aDate.getFullYear() !== suiviFilters.dateYear || aDate.getMonth() !== suiviFilters.dateMonth) return false;
                    } else if (suiviFilters.datePeriod === 'period') {
                      if (suiviFilters.dateFrom && aDate < suiviFilters.dateFrom) return false;
                      if (suiviFilters.dateTo) {
                        const end = new Date(suiviFilters.dateTo);
                        end.setHours(23, 59, 59, 999);
                        if (aDate > end) return false;
                      }
                    } else if (suiviFilters.datePeriod === 'day') {
                      if (suiviFilters.dateDay) {
                        const ds = new Date(suiviFilters.dateDay); ds.setHours(0, 0, 0, 0);
                        const de = new Date(suiviFilters.dateDay); de.setHours(23, 59, 59, 999);
                        if (aDate < ds || aDate > de) return false;
                      }
                    }
                    return true;
                  });

                  if (filtered.length === 0) {
                    return <p className="text-center text-muted-foreground py-12">Aucune anomalie correspondante.</p>;
                  }

                  return (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-50/80">
                            <TableHead className="text-xs font-semibold text-slate-500 w-10 text-center">N°</TableHead>
                            <TableHead className="text-xs font-semibold text-slate-500">Zone</TableHead>
                            <TableHead className="text-xs font-semibold text-slate-500">Equipement</TableHead>
                            <TableHead className="text-xs font-semibold text-slate-500">Description</TableHead>
                            <TableHead className="text-xs font-semibold text-slate-500 text-center">Date Constat.</TableHead>
                            <TableHead className="text-xs font-semibold text-slate-500 text-center">Date Résolution</TableHead>
                            <TableHead className="text-xs font-semibold text-slate-500 text-center">Durée</TableHead>
                            <TableHead className="text-xs font-semibold text-slate-500 text-center">N° DI</TableHead>
                            <TableHead className="text-xs font-semibold text-slate-500 text-center">N° Permis</TableHead>
                            <TableHead className="text-xs font-semibold text-slate-500 text-center">Statut</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filtered.map((a, idx) => {
                            const isResolved = !!a.date_resolution;
                            const duration = isResolved
                              ? daysBetween(a.date_constatation, a.date_resolution!)
                              : daysSince(a.date_constatation);
                            return (
                              <TableRow key={a.id} className={isResolved ? 'bg-green-50/30' : 'hover:bg-slate-50/50'}>
                                <TableCell className="text-center text-sm font-semibold text-slate-400">
                                  {idx + 1}
                                </TableCell>
                                <TableCell className="text-sm font-medium text-slate-700 uppercase">
                                  {a.zone}
                                </TableCell>
                                <TableCell className="text-sm text-slate-600">
                                  {a.equipement}
                                </TableCell>
                                <TableCell className="text-sm text-slate-700 max-w-[200px] truncate">
                                  {a.description}
                                </TableCell>
                                <TableCell className="text-center text-sm text-slate-600">
                                  {format(new Date(a.date_constatation), 'dd/MM/yyyy')}
                                </TableCell>
                                <TableCell className="text-center text-sm">
                                  {isResolved ? (
                                    <span className="text-green-700">{format(new Date(a.date_resolution!), 'dd/MM/yyyy')}</span>
                                  ) : (
                                    <span className="text-slate-400">—</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-center">
                                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                    isResolved
                                      ? 'bg-green-100 text-green-700'
                                      : duration > 7
                                        ? 'bg-red-100 text-red-700'
                                        : duration > 3
                                          ? 'bg-orange-100 text-orange-700'
                                          : 'bg-amber-100 text-amber-700'
                                  }`}>
                                    {duration}j
                                  </span>
                                </TableCell>
                                <TableCell className="text-center text-sm font-medium text-slate-600">
                                  {a.numero_di || '—'}
                                </TableCell>
                                <TableCell className="text-center text-sm font-medium text-slate-600">
                                  {a.numero_permis || '—'}
                                </TableCell>
                                <TableCell className="text-center">
                                  {isResolved ? (
                                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 text-green-700">
                                      Résolu
                                    </span>
                                  ) : (
                                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-red-100 text-red-700">
                                      En cours
                                    </span>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* ─── Anomaly dialog (add / edit) ────────────────────────── */}
        <Dialog
          open={anomalyDialog.open}
          onOpenChange={open => !open && setAnomalyDialog(prev => ({ ...prev, open: false }))}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{anomalyDialog.editId ? 'Modifier l\'anomalie' : 'Nouvelle anomalie'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">
                <span className="font-medium">{anomalyDialog.zone}</span> — {anomalyDialog.equipement}
              </div>
              <div>
                <Label className="text-sm">Description</Label>
                <Input
                  value={anomalyDialog.description}
                  onChange={e => setAnomalyDialog(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Description de l'anomalie"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm">N° DI</Label>
                  <Input
                    value={anomalyDialog.numero_di}
                    onChange={e => setAnomalyDialog(prev => ({ ...prev, numero_di: e.target.value }))}
                    placeholder=""
                  />
                </div>
                <div>
                  <Label className="text-sm">N° Permis</Label>
                  <Input
                    value={anomalyDialog.numero_permis}
                    onChange={e => setAnomalyDialog(prev => ({ ...prev, numero_permis: e.target.value }))}
                    placeholder=""
                  />
                </div>
              </div>
              <div>
                <Label className="text-sm">Date de constatation</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal rounded-lg h-9 text-sm border-slate-200 mt-1">
                      <CalendarIcon className="mr-2 h-4 w-4 text-slate-400" />
                      {format(anomalyDialog.date_constatation, 'dd/MM/yyyy')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={anomalyDialog.date_constatation}
                      onSelect={d => d && setAnomalyDialog(prev => ({ ...prev, date_constatation: d }))}
                      locale={fr}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAnomalyDialog(prev => ({ ...prev, open: false }))}>
                Annuler
              </Button>
              <Button onClick={handleSaveAnomaly} className="bg-orange-500 hover:bg-orange-600">
                {anomalyDialog.editId ? (
                  <>
                    <Save className="h-4 w-4 mr-1" />
                    Enregistrer
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-1" />
                    Ajouter
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ─── Delete anomaly confirmation ─────────────────────────── */}
        <AlertDialog open={!!deleteAnomalyId} onOpenChange={open => !open && setDeleteAnomalyId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer cette anomalie ?</AlertDialogTitle>
              <AlertDialogDescription>
                Cette action est irréversible. L'anomalie sera définitivement supprimée.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteAnomaly} className="bg-red-600 hover:bg-red-700">
                Supprimer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* ─── Resolve anomaly dialog ─────────────────────────────── */}
        <Dialog
          open={resolveDialog.open}
          onOpenChange={open => !open && setResolveDialog(prev => ({ ...prev, open: false }))}
        >
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Résolution de l'anomalie</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-slate-600">Le problème a-t-il été résolu aujourd'hui ?</p>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-left ${
                    resolveDialog.useToday
                      ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                  onClick={() => setResolveDialog(prev => ({ ...prev, useToday: true }))}
                >
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 ${
                    resolveDialog.useToday ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300'
                  }`}>
                    {resolveDialog.useToday && <CheckCircle className="h-3.5 w-3.5 text-white" />}
                  </div>
                  <div>
                    <span className="text-sm font-semibold">Oui, aujourd'hui</span>
                    <span className="text-xs text-slate-500 ml-2">({format(new Date(), 'dd/MM/yyyy')})</span>
                  </div>
                </button>
                <button
                  type="button"
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-left ${
                    !resolveDialog.useToday
                      ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                  onClick={() => setResolveDialog(prev => ({ ...prev, useToday: false }))}
                >
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 ${
                    !resolveDialog.useToday ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300'
                  }`}>
                    {!resolveDialog.useToday && <CheckCircle className="h-3.5 w-3.5 text-white" />}
                  </div>
                  <span className="text-sm font-semibold">Non, choisir une date</span>
                </button>
              </div>
              {!resolveDialog.useToday && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal rounded-lg h-9 text-sm border-slate-200">
                      <CalendarIcon className="mr-2 h-4 w-4 text-slate-400" />
                      {format(resolveDialog.customDate, 'dd/MM/yyyy')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={resolveDialog.customDate}
                      onSelect={d => d && setResolveDialog(prev => ({ ...prev, customDate: d }))}
                      locale={fr}
                    />
                  </PopoverContent>
                </Popover>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setResolveDialog(prev => ({ ...prev, open: false }))}>
                Annuler
              </Button>
              <Button onClick={handleResolveAnomaly} className="bg-emerald-500 hover:bg-emerald-600">
                <CheckCircle className="h-4 w-4 mr-1" />
                Confirmer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ─── Delete confirmation ───────────────────────────────── */}
        <AlertDialog open={!!deleteRapportId} onOpenChange={open => !open && setDeleteRapportId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer ce rapport ?</AlertDialogTitle>
              <AlertDialogDescription>
                Cette action est irréversible. Toutes les données de ce rapport seront supprimées.
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

        {/* ─── Export choice dialog (grouped vs individual) ────── */}
        <Dialog
          open={exportChoiceDialog.open}
          onOpenChange={open => !open && setExportChoiceDialog(prev => ({ ...prev, open: false }))}
        >
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Mode d'export</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-slate-600">
              Comment souhaitez-vous exporter les zones ?
            </p>
            <div className="flex flex-col gap-2 mt-2">
              <button
                type="button"
                className="flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-slate-200 bg-white text-slate-700 hover:border-orange-300 hover:bg-orange-50 transition-all text-left"
                onClick={() => handleExportChoice('grouped')}
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-orange-100 text-orange-600 shrink-0">
                  <FileDown className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-sm font-semibold block">Groupé</span>
                  <span className="text-xs text-slate-500">Toutes les zones dans un seul fichier</span>
                </div>
              </button>
              <button
                type="button"
                className="flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-slate-200 bg-white text-slate-700 hover:border-orange-300 hover:bg-orange-50 transition-all text-left"
                onClick={() => handleExportChoice('individual')}
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-orange-100 text-orange-600 shrink-0">
                  <List className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-sm font-semibold block">Individuel</span>
                  <span className="text-xs text-slate-500">Un fichier par zone (5 fichiers)</span>
                </div>
              </button>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setExportChoiceDialog(prev => ({ ...prev, open: false }))}>
                Annuler
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ─── Print choice dialog ──────────────────────────────── */}
        <AlertDialog open={printDialog.open} onOpenChange={open => !open && setPrintDialog({ open: false, rapportId: null })}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Format d'export</AlertDialogTitle>
              <AlertDialogDescription>
                Choisissez le format d'export pour ce rapport.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={() => handleHistoryPrint('image')}>
                <ImageIcon className="h-4 w-4 mr-1" />
                Image
              </AlertDialogAction>
              <AlertDialogAction onClick={() => handleHistoryPrint('pdf')}>
                <FileDown className="h-4 w-4 mr-1" />
                PDF
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

export default FormMaintenance;
