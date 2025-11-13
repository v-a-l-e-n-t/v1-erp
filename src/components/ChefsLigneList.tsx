import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pencil, Trash2 } from "lucide-react";
import { ChefLigne } from "@/types/production";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState } from "react";

interface ChefsLigneListProps {
  chefs: ChefLigne[];
  onEdit: (chef: ChefLigne) => void;
  onDelete: (id: string) => Promise<void>;
  loading: boolean;
}

export const ChefsLigneList = ({ chefs, onEdit, onDelete, loading }: ChefsLigneListProps) => {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedChef, setSelectedChef] = useState<ChefLigne | null>(null);

  const handleDeleteClick = (chef: ChefLigne) => {
    setSelectedChef(chef);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (selectedChef) {
      await onDelete(selectedChef.id);
      setDeleteDialogOpen(false);
      setSelectedChef(null);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Liste des chefs de ligne</CardTitle>
          <CardDescription>
            {chefs.length} chef{chefs.length > 1 ? 's' : ''} de ligne enregistré{chefs.length > 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {chefs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Aucun chef de ligne enregistré. Ajoutez-en un pour commencer.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Prénom</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {chefs.map((chef) => (
                  <TableRow key={chef.id}>
                    <TableCell className="font-medium">{chef.nom}</TableCell>
                    <TableCell>{chef.prenom}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onEdit(chef)}
                          disabled={loading}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteClick(chef)}
                          disabled={loading}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer {selectedChef?.prenom} {selectedChef?.nom} ?
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
