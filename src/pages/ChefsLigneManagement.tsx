import { useState, useEffect } from "react";
import { Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { ChefLigneForm } from "@/components/ChefLigneForm";
import { ChefsLigneList } from "@/components/ChefsLigneList";
import { ChefLigne } from "@/types/production";

const ChefsLigneManagement = () => {
  const [loading, setLoading] = useState(false);
  // Auth disabled for dev
  const [isAdmin, setIsAdmin] = useState(true);
  const [checkingAuth, setCheckingAuth] = useState(false);
  const [chefs, setChefs] = useState<ChefLigne[]>([]);
  const [editingChef, setEditingChef] = useState<ChefLigne | undefined>();

  useEffect(() => {
    // checkAdminRole();
    loadChefs();
  }, []);

  // useEffect(() => {
  //   if (isAdmin) {
  //     loadChefs();
  //   }
  // }, [isAdmin]);

  const checkAdminRole = async () => {
    // Disabled
    setIsAdmin(true);
    setCheckingAuth(false);
  };

  const loadChefs = async () => {
    const { data, error } = await (supabase as any)
      .from('chefs_ligne')
      .select('*')
      .order('nom');

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les chefs de ligne",
        variant: "destructive"
      });
      return;
    }

    setChefs(data || []);
  };

  const handleSubmit = async (data: Omit<ChefLigne, 'id'>) => {
    setLoading(true);

    try {
      if (editingChef) {
        const { error } = await (supabase as any)
          .from('chefs_ligne')
          .update(data)
          .eq('id', editingChef.id);

        if (error) throw error;

        toast({
          title: "Succès",
          description: "Chef de ligne modifié avec succès"
        });
      } else {
        const { error } = await (supabase as any)
          .from('chefs_ligne')
          .insert(data);

        if (error) throw error;

        toast({
          title: "Succès",
          description: "Chef de ligne ajouté avec succès"
        });
      }

      await loadChefs();
      setEditingChef(undefined);
    } catch (error: any) {
      console.error('Error saving chef de ligne:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'enregistrer le chef de ligne",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (chef: ChefLigne) => {
    setEditingChef(chef);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    setLoading(true);

    try {
      const { error } = await (supabase as any)
        .from('chefs_ligne')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Chef de ligne supprimé avec succès"
      });

      await loadChefs();
    } catch (error: any) {
      console.error('Error deleting chef de ligne:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de supprimer le chef de ligne",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setEditingChef(undefined);
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-12 w-12 mx-auto text-muted-foreground animate-pulse" />
          <p className="mt-4 text-muted-foreground">Vérification des permissions...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Shield className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Gestion des Chefs de Ligne</h1>
              <p className="text-sm text-muted-foreground">
                Administration - Réservé aux administrateurs
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-6">
          <ChefLigneForm
            chef={editingChef}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            loading={loading}
          />

          <ChefsLigneList
            chefs={chefs}
            onEdit={handleEdit}
            onDelete={handleDelete}
            loading={loading}
          />
        </div>
      </main>
    </div>
  );
};

export default ChefsLigneManagement;
