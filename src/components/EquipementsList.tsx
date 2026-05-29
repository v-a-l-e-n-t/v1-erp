import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, Wrench } from "lucide-react";
import type { EquipementWithLignes } from "@/types/equipement";

interface EquipementsListProps {
  equipements: EquipementWithLignes[];
  onEdit: (e: EquipementWithLignes) => void;
  onDelete: (id: string) => void;
  loading?: boolean;
}

export const EquipementsList = ({ equipements, onEdit, onDelete, loading }: EquipementsListProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Wrench className="h-5 w-5 text-primary" />
          Catalogue ({equipements.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {equipements.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6 italic">
            Aucun équipement enregistré. Ajoutez-en un avec le formulaire ci-dessus.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Lignes affectées</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {equipements.map((e) => {
                  const lignesActives = e.lignes.filter(l => l.actif).map(l => l.numero_ligne).sort((a, b) => a - b);
                  const lignesInactives = e.lignes.filter(l => !l.actif).map(l => l.numero_ligne).sort((a, b) => a - b);
                  return (
                    <TableRow key={e.id}>
                      <TableCell className="font-medium">{e.nom}</TableCell>
                      <TableCell className="text-muted-foreground">{e.code || '—'}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {lignesActives.length === 0 && lignesInactives.length === 0 && (
                            <span className="text-xs text-muted-foreground italic">Aucune</span>
                          )}
                          {lignesActives.map(n => (
                            <Badge key={`a-${n}`} variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-100">
                              L{n}
                            </Badge>
                          ))}
                          {lignesInactives.map(n => (
                            <Badge key={`i-${n}`} variant="outline" className="border-amber-400 text-amber-700 line-through">
                              L{n}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onEdit(e)}
                            disabled={loading}
                            aria-label="Modifier"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              if (confirm(`Supprimer l'équipement "${e.nom}" et toutes ses affectations ?`)) {
                                onDelete(e.id);
                              }
                            }}
                            disabled={loading}
                            className="text-destructive hover:text-destructive"
                            aria-label="Supprimer"
                          >
                            <Trash2 className="h-4 w-4" />
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
      </CardContent>
    </Card>
  );
};
