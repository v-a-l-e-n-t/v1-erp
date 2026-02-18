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
import { CalendarIcon, Plus, Trash2, Save, List, FilePlus, Edit, AlertTriangle, X, FileDown, ImageIcon, RotateCcw } from 'lucide-react';
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

const createInitialLignes = (): RapportChariotLigne[] =>
  Array.from({ length: 8 }, () => createEmptyLigne());

// ─── History filter types ───────────────────────────────────────────

type DatePeriodType = 'all' | 'year' | 'month' | 'period' | 'day';

interface HistoryFilters {
  datePeriod: DatePeriodType;
  dateYear: number;
  dateMonth: number; // 0-11
  dateFrom: Date | undefined;
  dateTo: Date | undefined;
  dateDay: Date | undefined;
  chariotNom: string;
  etat: string;
  numeroDi: string;
  numeroPermis: string;
}

const currentYear = new Date().getFullYear();

const emptyFilters: HistoryFilters = {
  datePeriod: 'all',
  dateYear: currentYear,
  dateMonth: new Date().getMonth(),
  dateFrom: undefined,
  dateTo: undefined,
  dateDay: undefined,
  chariotNom: '',
  etat: 'tous',
  numeroDi: '',
  numeroPermis: '',
};

interface RapportHistorique extends RapportChariot {
  lignes: {
    chariot_nom: string;
    etat: string | null;
    compteur_horaire: number | null;
    horaire_prochaine_vidange: number | null;
    ecart: number | null;
    numero_di: string | null;
    gasoil: number | null;
    temps_arret: number | null;
    numero_permis: string | null;
  }[];
}

// ─── Component ──────────────────────────────────────────────────────

const FormChariot = () => {
  // Form state
  const [date, setDate] = useState<Date>(new Date());
  const [timeValue, setTimeValue] = useState(format(new Date(), 'HH:mm'));
  const [lignes, setLignes] = useState<RapportChariotLigne[]>(createInitialLignes);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('new');

  // Export ref
  const exportRef = useRef<HTMLDivElement>(null);

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
  const [editingRapportId, setEditingRapportId] = useState<string | null>(null);
  const [filters, setFilters] = useState<HistoryFilters>({ ...emptyFilters });

  // Delete confirmation
  const [deleteRapportId, setDeleteRapportId] = useState<string | null>(null);

  // Anomaly dialog
  const [anomalyDialog, setAnomalyDialog] = useState<{
    open: boolean;
    ligneIndex: number;
  }>({ open: false, ligneIndex: -1 });

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

    if (data) {
      const rapportsWithLignes: RapportHistorique[] = [];
      for (const r of data) {
        const { data: lignesData } = await supabase
          .from('rapport_chariot_lignes')
          .select('*, chariot_id')
          .eq('rapport_id', r.id);

        const lignes = (lignesData || []).map((l: any) => {
          const chariot = allChariots.find(c => c.id === l.chariot_id);
          return {
            chariot_nom: chariot?.nom || 'Inconnu',
            etat: l.etat,
            compteur_horaire: l.compteur_horaire,
            horaire_prochaine_vidange: l.horaire_prochaine_vidange,
            ecart: l.ecart,
            numero_di: l.numero_di,
            gasoil: l.gasoil,
            temps_arret: l.temps_arret,
            numero_permis: l.numero_permis,
          };
        });

        rapportsWithLignes.push({ ...r, lignes });
      }
      setRapports(rapportsWithLignes);
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

    if (filters.chariotNom.trim()) {
      const search = filters.chariotNom.toLowerCase();
      if (!r.lignes.some(l => l.chariot_nom.toLowerCase().includes(search))) return false;
    }

    if (filters.etat !== 'tous') {
      if (!r.lignes.some(l => l.etat === filters.etat)) return false;
    }

    if (filters.numeroDi.trim()) {
      const search = filters.numeroDi.toLowerCase();
      if (!r.lignes.some(l => l.numero_di?.toLowerCase().includes(search))) return false;
    }

    if (filters.numeroPermis.trim()) {
      const search = filters.numeroPermis.toLowerCase();
      if (!r.lignes.some(l => l.numero_permis?.toLowerCase().includes(search))) return false;
    }

    return true;
  });

  // ─── Load rapport for editing ─────────────────────────────────────
  const loadRapport = async (rapportId: string) => {
    const { data: rapport } = await supabase
      .from('rapports_chariots')
      .select('*')
      .eq('id', rapportId)
      .single();

    if (!rapport) return;

    const rapportDate = new Date(rapport.date_rapport);
    setDate(rapportDate);
    setTimeValue(format(rapportDate, 'HH:mm'));
    setEditingRapportId(rapportId);

    const { data: lignesData } = await supabase
      .from('rapport_chariot_lignes')
      .select('*')
      .eq('rapport_id', rapportId);

    if (!lignesData) return;

    const lignesWithAnomalies: RapportChariotLigne[] = [];
    for (const l of lignesData) {
      const { data: anomalies } = await supabase
        .from('rapport_chariot_anomalies')
        .select('*')
        .eq('ligne_id', l.id)
        .order('ordre');

      const chariot = allChariots.find(c => c.id === l.chariot_id);

      lignesWithAnomalies.push({
        id: l.id,
        rapport_id: l.rapport_id,
        chariot_id: l.chariot_id,
        chariot_nom: chariot?.nom || 'Inconnu',
        etat: l.etat as 'marche' | 'arret' | null,
        compteur_horaire: l.compteur_horaire,
        horaire_prochaine_vidange: l.horaire_prochaine_vidange,
        ecart: l.ecart,
        anomalies: (anomalies || []).map(a => ({ id: a.id, description: a.description })),
        numero_di: l.numero_di || '',
        gasoil: l.gasoil,
        temps_arret: l.temps_arret,
        numero_permis: l.numero_permis || '',
      });
    }

    setLignes(lignesWithAnomalies);
    setActiveTab('new');
  };

  // ─── Update ligne field ──────────────────────────────────────────
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

      // Check alert for écart ≤ 72h after modification
      if (field === 'compteur_horaire' || field === 'horaire_prochaine_vidange') {
        const alertChariots = updated
          .filter(l => l.ecart !== null && l.ecart <= 72 && l.chariot_nom.trim())
          .map(l => l.chariot_nom);

        if (alertChariots.length > 0) {
          setTimeout(() => {
            setAlertVidange({ show: true, chariots: alertChariots });
          }, 100);
        }
      }

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
          ? { ...l, anomalies: [...l.anomalies, { description: '' }] }
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

      let rapportId = editingRapportId;

      if (rapportId) {
        const { error } = await supabase
          .from('rapports_chariots')
          .update({ date_rapport: dateRapport.toISOString(), updated_at: new Date().toISOString() })
          .eq('id', rapportId);
        if (error) throw error;

        await supabase.from('rapport_chariot_lignes').delete().eq('rapport_id', rapportId);
      } else {
        const { data, error } = await supabase
          .from('rapports_chariots')
          .insert({ date_rapport: dateRapport.toISOString() })
          .select('id')
          .single();
        if (error) throw error;
        rapportId = data.id;
      }

      for (const ligne of validLignes) {
        // Resolve chariot_id (create if new)
        const chariotId = await resolveChariotId(ligne.chariot_nom);
        if (!chariotId) {
          throw new Error(`Impossible de créer le chariot "${ligne.chariot_nom}"`);
        }

        const { data: ligneData, error: ligneError } = await supabase
          .from('rapport_chariot_lignes')
          .insert({
            rapport_id: rapportId,
            chariot_id: chariotId,
            etat: ligne.etat,
            compteur_horaire: ligne.compteur_horaire,
            horaire_prochaine_vidange: ligne.horaire_prochaine_vidange,
            numero_di: ligne.numero_di || null,
            gasoil: ligne.gasoil,
            temps_arret: ligne.temps_arret,
            numero_permis: ligne.numero_permis || null,
          })
          .select('id')
          .single();

        if (ligneError) throw ligneError;

        const anomaliesToInsert = ligne.anomalies
          .filter(a => a.description.trim() !== '')
          .map((a, idx) => ({
            ligne_id: ligneData.id,
            description: a.description.trim(),
            ordre: idx,
          }));

        if (anomaliesToInsert.length > 0) {
          const { error: anomError } = await supabase
            .from('rapport_chariot_anomalies')
            .insert(anomaliesToInsert);
          if (anomError) throw anomError;
        }
      }

      toast.success(editingRapportId ? 'Rapport mis à jour avec succès' : 'Rapport sauvegardé avec succès');

      if (!editingRapportId) {
        setLignes(createInitialLignes());
        setDate(new Date());
        setTimeValue(format(new Date(), 'HH:mm'));
      }
      setEditingRapportId(rapportId);
    } catch (error: any) {
      toast.error('Erreur lors de la sauvegarde: ' + error.message);
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

  // ─── New rapport ─────────────────────────────────────────────────
  const handleNewRapport = () => {
    setLignes(createInitialLignes());
    setDate(new Date());
    setTimeValue(format(new Date(), 'HH:mm'));
    setEditingRapportId(null);
    setActiveTab('new');
  };

  // ─── Export functions ─────────────────────────────────────────────
  const handleExport = async (type: 'pdf' | 'image') => {
    if (!exportRef.current) return;

    toast.info('Export en cours...');

    try {
      const canvas = await html2canvas(exportRef.current, {
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
      } as any);

      const timestamp = format(date, 'yyyyMMdd_HHmm');

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

        const imgWidth = 287; // A4 landscape with margins
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        const imgData = canvas.toDataURL('image/png');

        pdf.addImage(imgData, 'PNG', 5, 5, imgWidth, imgHeight);
        pdf.save(`rapport_chariots_${timestamp}.pdf`);
        toast.success('PDF exporté avec succès');
      }
    } catch (error: any) {
      toast.error("Erreur lors de l'export: " + error.message);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-[1600px] mx-auto space-y-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="new">
              <FilePlus className="h-4 w-4 mr-1" />
              {editingRapportId ? 'Modifier' : 'Nouveau'}
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
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Left: Nouveau button (only when editing) */}
                  <div>
                    {editingRapportId && (
                      <Button variant="outline" onClick={handleNewRapport}>
                        <Plus className="h-4 w-4 mr-1" />
                        Nouveau
                      </Button>
                    )}
                  </div>

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

                    <div className="hidden md:block w-48" />
                  </div>

                  {/* Table */}
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="min-w-[130px]">Chariot</TableHead>
                          <TableHead className="min-w-[180px] text-center">État</TableHead>
                          <TableHead className="min-w-[120px]">Compteur horaire (h)</TableHead>
                          <TableHead className="min-w-[140px]">Horaire proch. vidange (h)</TableHead>
                          <TableHead className="min-w-[90px]">Écart (h)</TableHead>
                          <TableHead className="min-w-[200px]">Anomalie</TableHead>
                          <TableHead className="min-w-[100px]">N° DI</TableHead>
                          <TableHead className="min-w-[90px]">Gasoil</TableHead>
                          <TableHead className="min-w-[110px]">Temps d'arrêt (min)</TableHead>
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
                              {/* Chariot name — input direct */}
                              <TableCell className="font-medium">
                                <Input
                                  placeholder="Nom du chariot"
                                  value={ligne.chariot_nom}
                                  onChange={(e) => updateLigne(index, 'chariot_nom', e.target.value)}
                                  className="w-28"
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
                                  className="w-28"
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

                              {/* N° DI */}
                              <TableCell>
                                <Input
                                  value={ligne.numero_di}
                                  onChange={(e) => updateLigne(index, 'numero_di', e.target.value)}
                                  className="w-24"
                                />
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
                {/* Filters */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 p-4 bg-gray-50 rounded-lg border">
                  {/* Date period selector */}
                  <div>
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
                  <div>
                    {filters.datePeriod === 'year' && (
                      <>
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
                      </>
                    )}

                    {filters.datePeriod === 'month' && (
                      <>
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
                      </>
                    )}

                    {filters.datePeriod === 'period' && (
                      <>
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
                      </>
                    )}

                    {filters.datePeriod === 'day' && (
                      <>
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
                      </>
                    )}
                  </div>

                  {/* Month selector (only for 'month' period) OR Date fin (for 'period') */}
                  <div>
                    {filters.datePeriod === 'month' && (
                      <>
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
                      </>
                    )}

                    {filters.datePeriod === 'period' && (
                      <>
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
                      </>
                    )}
                  </div>

                  <div>
                    <Label className="text-xs mb-1 block">Chariot</Label>
                    <Input
                      placeholder="Nom..."
                      value={filters.chariotNom}
                      onChange={(e) => setFilters(f => ({ ...f, chariotNom: e.target.value }))}
                      className="h-8 text-xs"
                    />
                  </div>

                  <div>
                    <Label className="text-xs mb-1 block">État</Label>
                    <Select
                      value={filters.etat}
                      onValueChange={(v) => setFilters(f => ({ ...f, etat: v }))}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="tous">Tous</SelectItem>
                        <SelectItem value="marche">Marche</SelectItem>
                        <SelectItem value="arret">Arrêt</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs mb-1 block">N° DI</Label>
                    <Input
                      placeholder="N° DI..."
                      value={filters.numeroDi}
                      onChange={(e) => setFilters(f => ({ ...f, numeroDi: e.target.value }))}
                      className="h-8 text-xs"
                    />
                  </div>

                  <div>
                    <Label className="text-xs mb-1 block">N° Permis</Label>
                    <div className="flex gap-1">
                      <Input
                        placeholder="N° Permis..."
                        value={filters.numeroPermis}
                        onChange={(e) => setFilters(f => ({ ...f, numeroPermis: e.target.value }))}
                        className="h-8 text-xs"
                      />
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
                  </div>
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
                          <TableHead>Date & Heure</TableHead>
                          <TableHead>Chariots</TableHead>
                          <TableHead>États</TableHead>
                          <TableHead>N° DI</TableHead>
                          <TableHead>N° Permis</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredRapports.map((rapport) => (
                          <TableRow key={rapport.id}>
                            <TableCell className="whitespace-nowrap">
                              {format(new Date(rapport.date_rapport), 'PPP HH:mm', { locale: fr })}
                            </TableCell>
                            <TableCell>
                              <div className="space-y-0.5">
                                {rapport.lignes.map((l, i) => (
                                  <div key={i} className="text-xs">{l.chariot_nom}</div>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-0.5">
                                {rapport.lignes.map((l, i) => (
                                  <div key={i}>
                                    <span
                                      className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                                        l.etat === 'marche'
                                          ? 'bg-green-100 text-green-700'
                                          : l.etat === 'arret'
                                          ? 'bg-red-100 text-red-700'
                                          : 'text-gray-400'
                                      }`}
                                    >
                                      {l.etat === 'marche' ? 'Marche' : l.etat === 'arret' ? 'Arrêt' : '—'}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-0.5">
                                {rapport.lignes.map((l, i) => (
                                  <div key={i} className="text-xs">{l.numero_di || '—'}</div>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-0.5">
                                {rapport.lignes.map((l, i) => (
                                  <div key={i} className="text-xs">{l.numero_permis || '—'}</div>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => loadRapport(rapport.id)}
                                >
                                  <Edit className="h-3 w-3 mr-1" />
                                  Modifier
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
                        ))}
                      </TableBody>
                    </Table>
                  </div>
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
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {anomalyDialog.ligneIndex >= 0 && lignes[anomalyDialog.ligneIndex]?.anomalies.map((anomalie, aIdx) => (
              <div key={aIdx} className="flex gap-2 items-start">
                <span className="text-xs font-bold text-muted-foreground mt-2 shrink-0 w-5">{aIdx + 1}.</span>
                <textarea
                  className="flex-1 min-h-[60px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={anomalie.description}
                  onChange={(e) => updateAnomalie(anomalyDialog.ligneIndex, aIdx, e.target.value)}
                  placeholder="Décrire l'anomalie..."
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-red-500 hover:text-red-700 mt-1"
                  onClick={() => removeAnomalie(anomalyDialog.ligneIndex, aIdx)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
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
