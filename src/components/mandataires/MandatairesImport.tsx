import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Upload, FileSpreadsheet, AlertTriangle, Check, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import * as XLSX from "xlsx";

interface ParsedVente {
  date: Date;
  mandataire: string;
  camion: string;
  client: string;
  numeroBonSortie: string;
  destination?: string;
  r_b6: number;
  r_b12: number;
  r_b28: number;
  r_b38: number;
  r_b11_carbu: number;
  c_b6: number;
  c_b12: number;
  c_b28: number;
  c_b38: number;
  c_b11_carbu: number;
  isDuplicate?: boolean;
  existingId?: string;
}

interface DuplicateInfo {
  vente: ParsedVente;
  index: number;
}

interface MandatairesImportProps {
  onImportSuccess: () => void;
}

const MandatairesImport = ({ onImportSuccess }: MandatairesImportProps) => {
  const [productionFile, setProductionFile] = useState<File | null>(null);
  const [destinationsFile, setDestinationsFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedVente[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [duplicates, setDuplicates] = useState<DuplicateInfo[]>([]);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [currentDuplicateIndex, setCurrentDuplicateIndex] = useState(0);

  const parseDate = (dateValue: any): Date | null => {
    if (!dateValue) return null;
    
    // If it's a number (Excel serial date)
    if (typeof dateValue === 'number') {
      // Excel serial date: days since 1899-12-30
      const excelEpoch = new Date(1899, 11, 30);
      const date = new Date(excelEpoch.getTime() + dateValue * 24 * 60 * 60 * 1000);
      return date;
    }
    
    // If it's a Date object
    if (dateValue instanceof Date) {
      return dateValue;
    }
    
    // If it's a string, try to parse it
    const dateStr = String(dateValue).trim();
    if (!dateStr) return null;
    
    // Format JJ/MM/AA ou JJ/MM/AAAA
    const parts = dateStr.split("/");
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      let year = parseInt(parts[2], 10);
      
      // Gérer les années sur 2 chiffres
      if (year < 100) {
        year += 2000;
      }
      
      if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
        return new Date(year, month, day);
      }
    }
    
    // Try standard Date parsing as fallback
    const parsed = new Date(dateStr);
    return isNaN(parsed.getTime()) ? null : parsed;
  };

  const parseNumber = (value: any): number => {
    if (value === null || value === undefined || value === "") return 0;
    if (typeof value === 'number') return Math.round(value);
    const num = parseInt(String(value), 10);
    return isNaN(num) ? 0 : num;
  };

  // Helper to find column value with normalized keys (trims whitespace)
  const findColumn = (row: any, ...names: string[]): any => {
    // First try exact match
    for (const name of names) {
      if (row[name] !== undefined) return row[name];
    }
    // Then try with trimmed keys
    const trimmedRow: Record<string, any> = {};
    for (const key of Object.keys(row)) {
      trimmedRow[key.trim()] = row[key];
    }
    for (const name of names) {
      if (trimmedRow[name] !== undefined) return trimmedRow[name];
      if (trimmedRow[name.trim()] !== undefined) return trimmedRow[name.trim()];
    }
    return undefined;
  };

  const handleFileParse = useCallback(async () => {
    if (!productionFile) {
      toast.error("Veuillez sélectionner le fichier Production");
      return;
    }

    setIsParsing(true);
    try {
      // Parse production file
      const productionData = await parseExcelFile(productionFile);
      console.log("Production data rows:", productionData.length);
      if (productionData.length > 0) {
        console.log("First row keys:", Object.keys(productionData[0]));
        console.log("First row sample:", productionData[0]);
      }
      
      // Parse destinations file if provided
      let destinationsMap: Record<string, string> = {};
      if (destinationsFile) {
        const destinationsData = await parseExcelFile(destinationsFile);
        console.log("Destinations data rows:", destinationsData.length);
        destinationsData.forEach((row: any) => {
          const bonSortie = String(findColumn(row, "N° BON SORTIE", "N°BON SORTIE", "N° BON DE SORTIE") || "").trim();
          if (bonSortie) {
            destinationsMap[bonSortie] = String(findColumn(row, "DESTINATION", "Destination") || "").trim();
          }
        });
      }

      // Merge data
      const ventesMap: Record<string, ParsedVente> = {};
      let skippedNoBon = 0;
      let skippedNoDate = 0;
      let skippedNoMandataire = 0;
      
      productionData.forEach((row: any) => {
        const bonSortie = String(findColumn(row, "N° BON SORTIE", "N°BON SORTIE", "N° BON DE SORTIE") || "").trim();
        if (!bonSortie) {
          skippedNoBon++;
          return;
        }

        const dateValue = findColumn(row, "Date", "DATE");
        const parsedDate = parseDate(dateValue);
        if (!parsedDate) {
          console.log("Failed to parse date:", dateValue, "type:", typeof dateValue);
          skippedNoDate++;
          return;
        }

        const mandataire = String(findColumn(row, "MANDATAIRE", "Mandataire") || "").trim();
        if (!mandataire) {
          skippedNoMandataire++;
          return;
        }

        // Colonnes exactes du fichier Excel production_par_mandataire.xlsx
        const r_b6 = parseNumber(findColumn(row, "R_B6"));
        const r_b12 = parseNumber(findColumn(row, "R_B12"));
        const r_b28 = parseNumber(findColumn(row, "R_B 28"));
        const r_b38 = parseNumber(findColumn(row, "R_B 38"));
        const r_b11_carbu = parseNumber(findColumn(row, "R_Carburation B12"));
        
        const c_b6 = parseNumber(findColumn(row, "C_B6"));
        const c_b12 = parseNumber(findColumn(row, "C_B12"));
        const c_b28 = parseNumber(findColumn(row, "C_B 28"));
        const c_b38 = parseNumber(findColumn(row, "C_B 38"));
        const c_b11_carbu = parseNumber(findColumn(row, "C_Carburation B11"));

        ventesMap[bonSortie] = {
          date: parsedDate,
          mandataire,
          camion: String(row["CAMION"] || row["Camion"] || "").trim(),
          client: String(row["CLIENT"] || row["Client"] || "").trim(),
          numeroBonSortie: bonSortie,
          destination: destinationsMap[bonSortie] || "",
          r_b6,
          r_b12,
          r_b28,
          r_b38,
          r_b11_carbu,
          c_b6,
          c_b12,
          c_b28,
          c_b38,
          c_b11_carbu,
        };
      });

      console.log(`Skipped - No bon sortie: ${skippedNoBon}, No date: ${skippedNoDate}, No mandataire: ${skippedNoMandataire}`);

      const ventes = Object.values(ventesMap);
      console.log("Ventes parsed:", ventes.length);

      // Check for duplicates in database
      const bonsSortie = ventes.map(v => v.numeroBonSortie);
      const { data: existingVentes } = await supabase
        .from("ventes_mandataires")
        .select("id, numero_bon_sortie")
        .in("numero_bon_sortie", bonsSortie);

      const existingMap = new Map(
        (existingVentes || []).map(v => [v.numero_bon_sortie, v.id])
      );

      const duplicatesFound: DuplicateInfo[] = [];
      ventes.forEach((vente, index) => {
        if (existingMap.has(vente.numeroBonSortie)) {
          vente.isDuplicate = true;
          vente.existingId = existingMap.get(vente.numeroBonSortie);
          duplicatesFound.push({ vente, index });
        }
      });

      setParsedData(ventes);
      setDuplicates(duplicatesFound);

      if (duplicatesFound.length > 0) {
        toast.warning(`${duplicatesFound.length} doublon(s) détecté(s)`);
      } else {
        toast.success(`${ventes.length} ventes prêtes à importer`);
      }
    } catch (error) {
      console.error("Parse error:", error);
      toast.error("Erreur lors de l'analyse des fichiers");
    } finally {
      setIsParsing(false);
    }
  }, [productionFile, destinationsFile]);

  const parseExcelFile = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(firstSheet);
          resolve(jsonData);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };

  const handleDuplicateChoice = (action: "skip" | "replace") => {
    if (currentDuplicateIndex >= duplicates.length) return;

    const updated = [...parsedData];
    const dupIndex = duplicates[currentDuplicateIndex].index;

    if (action === "skip") {
      // Mark as skipped - will be filtered out during import
      updated[dupIndex] = { ...updated[dupIndex], isDuplicate: true };
    } else {
      // Mark for replacement
      updated[dupIndex] = { ...updated[dupIndex], isDuplicate: false };
    }

    setParsedData(updated);

    if (currentDuplicateIndex < duplicates.length - 1) {
      setCurrentDuplicateIndex(currentDuplicateIndex + 1);
    } else {
      setShowDuplicateDialog(false);
      setCurrentDuplicateIndex(0);
    }
  };

  const handleImport = async () => {
    if (duplicates.length > 0 && parsedData.some(v => v.isDuplicate && !v.existingId)) {
      setShowDuplicateDialog(true);
      return;
    }

    setIsImporting(true);
    try {
      // Get or create mandataires
      const uniqueMandataires = [...new Set(parsedData.map(v => v.mandataire))];
      
      const { data: existingMandataires } = await supabase
        .from("mandataires")
        .select("id, nom")
        .in("nom", uniqueMandataires);

      const existingMandatairesMap = new Map(
        (existingMandataires || []).map(m => [m.nom, m.id])
      );

      // Create missing mandataires
      const newMandataires = uniqueMandataires.filter(m => !existingMandatairesMap.has(m));
      let createdCount = 0;

      if (newMandataires.length > 0) {
        const { data: created, error: createError } = await supabase
          .from("mandataires")
          .insert(newMandataires.map(nom => ({ nom })))
          .select("id, nom");

        if (createError) throw createError;
        
        (created || []).forEach(m => existingMandatairesMap.set(m.nom, m.id));
        createdCount = created?.length || 0;
      }

      // Filter ventes to import (skip marked duplicates)
      const ventesToImport = parsedData.filter(v => !v.isDuplicate);
      const ventesToUpdate = parsedData.filter(v => v.isDuplicate && v.existingId && !parsedData.find(p => p.numeroBonSortie === v.numeroBonSortie && !p.isDuplicate));

      // Insert new ventes
      if (ventesToImport.length > 0) {
        const insertData = ventesToImport.map(v => ({
          date: v.date.toISOString().split("T")[0],
          mandataire_id: existingMandatairesMap.get(v.mandataire)!,
          camion: v.camion,
          client: v.client,
          numero_bon_sortie: v.numeroBonSortie,
          destination: v.destination || null,
          r_b6: v.r_b6,
          r_b12: v.r_b12,
          r_b28: v.r_b28,
          r_b38: v.r_b38,
          r_b11_carbu: v.r_b11_carbu,
          c_b6: v.c_b6,
          c_b12: v.c_b12,
          c_b28: v.c_b28,
          c_b38: v.c_b38,
          c_b11_carbu: v.c_b11_carbu,
        }));

        const { error: insertError } = await supabase
          .from("ventes_mandataires")
          .insert(insertData);

        if (insertError) throw insertError;
      }

      // Update existing ventes marked for replacement
      for (const vente of parsedData.filter(v => !v.isDuplicate && v.existingId)) {
        await supabase
          .from("ventes_mandataires")
          .update({
            date: vente.date.toISOString().split("T")[0],
            mandataire_id: existingMandatairesMap.get(vente.mandataire)!,
            camion: vente.camion,
            client: vente.client,
            destination: vente.destination || null,
            r_b6: vente.r_b6,
            r_b12: vente.r_b12,
            r_b28: vente.r_b28,
            r_b38: vente.r_b38,
            r_b11_carbu: vente.r_b11_carbu,
            c_b6: vente.c_b6,
            c_b12: vente.c_b12,
            c_b28: vente.c_b28,
            c_b38: vente.c_b38,
            c_b11_carbu: vente.c_b11_carbu,
          })
          .eq("id", vente.existingId);
      }

      const skipped = parsedData.filter(v => v.isDuplicate && !parsedData.find(p => p.numeroBonSortie === v.numeroBonSortie && !p.isDuplicate)).length;

      toast.success(
        `Import réussi : ${ventesToImport.length} ventes importées` +
        (createdCount > 0 ? `, ${createdCount} mandataires créés` : "") +
        (skipped > 0 ? `, ${skipped} doublons ignorés` : "")
      );

      // Reset state
      setProductionFile(null);
      setDestinationsFile(null);
      setParsedData([]);
      setDuplicates([]);
      onImportSuccess();
    } catch (error: any) {
      console.error("Import error:", error);
      toast.error(`Erreur lors de l'import: ${error.message}`);
    } finally {
      setIsImporting(false);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("fr-FR");
  };

  const currentDuplicate = duplicates[currentDuplicateIndex];

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
              Fichier Production
            </CardTitle>
            <CardDescription>
              Fichier Excel contenant les données de production par mandataire
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="production-file">Sélectionner le fichier</Label>
              <Input
                id="production-file"
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => setProductionFile(e.target.files?.[0] || null)}
              />
              {productionFile && (
                <Badge variant="secondary" className="mt-2">
                  {productionFile.name}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
              Fichier Destinations
            </CardTitle>
            <CardDescription>
              Fichier Excel contenant les destinations (optionnel)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="destinations-file">Sélectionner le fichier</Label>
              <Input
                id="destinations-file"
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => setDestinationsFile(e.target.files?.[0] || null)}
              />
              {destinationsFile && (
                <Badge variant="secondary" className="mt-2">
                  {destinationsFile.name}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Parse Button */}
      <div className="flex justify-center">
        <Button
          onClick={handleFileParse}
          disabled={!productionFile || isParsing}
          size="lg"
          className="gap-2"
        >
          <Upload className="h-4 w-4" />
          {isParsing ? "Analyse en cours..." : "Analyser les fichiers"}
        </Button>
      </div>

      {/* Preview Section */}
      {parsedData.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Prévisualisation</CardTitle>
                <CardDescription>
                  {parsedData.length} ventes détectées
                  {duplicates.length > 0 && (
                    <span className="text-destructive ml-2">
                      ({duplicates.length} doublons)
                    </span>
                  )}
                </CardDescription>
              </div>
              <Button
                onClick={handleImport}
                disabled={isImporting}
                className="gap-2"
              >
                <Check className="h-4 w-4" />
                {isImporting ? "Import en cours..." : "Importer"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Mandataire</TableHead>
                    <TableHead>Camion</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>N° Bon</TableHead>
                    <TableHead>Destination</TableHead>
                    <TableHead className="text-right text-xs">R.B6</TableHead>
                    <TableHead className="text-right text-xs">R.B12</TableHead>
                    <TableHead className="text-right text-xs">R.B28</TableHead>
                    <TableHead className="text-right text-xs">R.B38</TableHead>
                    <TableHead className="text-right text-xs">R_Carb_B12</TableHead>
                    <TableHead className="text-right text-xs">C.B6</TableHead>
                    <TableHead className="text-right text-xs">C.B12</TableHead>
                    <TableHead className="text-right text-xs">C.B28</TableHead>
                    <TableHead className="text-right text-xs">C.B38</TableHead>
                    <TableHead className="text-right text-xs">C_Carb_B11</TableHead>
                    <TableHead>Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedData.slice(0, 100).map((vente, index) => (
                    <TableRow key={index} className={vente.isDuplicate ? "bg-destructive/10" : ""}>
                      <TableCell>{formatDate(vente.date)}</TableCell>
                      <TableCell className="font-medium">{vente.mandataire}</TableCell>
                      <TableCell>{vente.camion}</TableCell>
                      <TableCell>{vente.client}</TableCell>
                      <TableCell>{vente.numeroBonSortie}</TableCell>
                      <TableCell>{vente.destination || "-"}</TableCell>
                      <TableCell className="text-right">{vente.r_b6 || "-"}</TableCell>
                      <TableCell className="text-right">{vente.r_b12 || "-"}</TableCell>
                      <TableCell className="text-right">{vente.r_b28 || "-"}</TableCell>
                      <TableCell className="text-right">{vente.r_b38 || "-"}</TableCell>
                      <TableCell className="text-right">{vente.r_b11_carbu || "-"}</TableCell>
                      <TableCell className="text-right">{vente.c_b6 || "-"}</TableCell>
                      <TableCell className="text-right">{vente.c_b12 || "-"}</TableCell>
                      <TableCell className="text-right">{vente.c_b28 || "-"}</TableCell>
                      <TableCell className="text-right">{vente.c_b38 || "-"}</TableCell>
                      <TableCell className="text-right">{vente.c_b11_carbu || "-"}</TableCell>
                      <TableCell>
                        {vente.isDuplicate ? (
                          <Badge variant="destructive" className="gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Doublon
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="gap-1">
                            <Check className="h-3 w-3" />
                            OK
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {parsedData.length > 100 && (
                <p className="text-center text-muted-foreground mt-4">
                  ... et {parsedData.length - 100} autres ventes
                </p>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Duplicate Dialog */}
      <AlertDialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Doublon détecté ({currentDuplicateIndex + 1}/{duplicates.length})
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>Le bon de sortie <strong>{currentDuplicate?.vente.numeroBonSortie}</strong> existe déjà.</p>
                <div className="bg-muted p-3 rounded-md text-sm">
                  <p><strong>Date:</strong> {currentDuplicate && formatDate(currentDuplicate.vente.date)}</p>
                  <p><strong>Mandataire:</strong> {currentDuplicate?.vente.mandataire}</p>
                  <p><strong>Client:</strong> {currentDuplicate?.vente.client}</p>
                </div>
                <p>Que voulez-vous faire ?</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => handleDuplicateChoice("skip")}>
              <X className="h-4 w-4 mr-2" />
              Ignorer
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => handleDuplicateChoice("replace")}>
              <Check className="h-4 w-4 mr-2" />
              Remplacer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MandatairesImport;
