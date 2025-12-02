import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export const UpdateAgents = () => {
    const [status, setStatus] = useState('Idle');

    const runUpdate = async () => {
        setStatus('Running...');
        try {
            // 1. Add OUATTARA FATOUMATA
            const { error: err1 } = await supabase.from('chefs_ligne').insert([
                { nom: 'OUATTARA', prenom: 'FATOUMATA' }
            ]);
            if (err1) console.error('Error adding OUATTARA:', err1);

            // 2. Add ADOU MARCEL
            const { error: err2 } = await supabase.from('chefs_ligne').insert([
                { nom: 'ADOU', prenom: 'MARCEL' }
            ]);
            if (err2) console.error('Error adding ADOU:', err2);

            // 3. Rename ALEXANDRE LEGNAKOU -> EGNAKOU ALEXANDRE
            // First find the ID
            const { data: agents } = await supabase
                .from('chefs_ligne')
                .select('id')
                .ilike('nom', '%LEGNAKOU%')
                .ilike('prenom', '%ALEXANDRE%');

            if (agents && agents.length > 0) {
                const { error: err3 } = await supabase
                    .from('chefs_ligne')
                    .update({ nom: 'EGNAKOU', prenom: 'ALEXANDRE' })
                    .eq('id', agents[0].id);

                if (err3) console.error('Error renaming:', err3);
            } else {
                // Try searching reversed just in case
                const { data: agentsRev } = await supabase
                    .from('chefs_ligne')
                    .select('id')
                    .ilike('nom', '%ALEXANDRE%')
                    .ilike('prenom', '%LEGNAKOU%');

                if (agentsRev && agentsRev.length > 0) {
                    const { error: err4 } = await supabase
                        .from('chefs_ligne')
                        .update({ nom: 'EGNAKOU', prenom: 'ALEXANDRE' })
                        .eq('id', agentsRev[0].id);
                    if (err4) console.error('Error renaming (rev):', err4);
                }
            }

            setStatus('Done! Check console for any errors.');
            toast.success('Mise à jour des agents terminée !');

        } catch (error) {
            console.error('Global error:', error);
            setStatus('Error');
            toast.error('Erreur lors de la mise à jour');
        }
    };

    return (
        <div className="fixed bottom-4 right-4 z-50 p-4 bg-white shadow-lg rounded-lg border">
            <h3 className="font-bold mb-2">Admin: Update Agents</h3>
            <p className="text-sm mb-2">Status: {status}</p>
            <Button onClick={runUpdate}>Run Update Script</Button>
        </div>
    );
};
