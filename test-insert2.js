import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://sfnnqubbnlxroftbicjr.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmbm5xdWJibmx4cm9mdGJpY2pyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1NDkyMDIsImV4cCI6MjA3OTEyNTIwMn0.JXLRGXnErgcBsSxLaDGISUj5eoMgWMOvYdp6yfqyF6I";
const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsert() {
    const { data: clients } = await supabase.from('vrac_clients').select('id').limit(1);
    const clientId = clients[0]?.id;

    if (!clientId) return console.log('No client found');

    const { data, error } = await supabase.from('vrac_demandes_chargement').insert({
        client_id: clientId,
        immatriculation_tracteur: 'TEST-NOCORS',
        immatriculation_citerne: 'TEST-NOCORS',
        nom_chauffeur: 'TESTER',
        statut: 'en_attente'
    }).select();

    if (error) {
        console.error('ERROR OMITTING DATE:', error.message);
    } else {
        console.log('SUCCESS OMITTING DATE:', data[0].date_chargement);
        await supabase.from('vrac_demandes_chargement').delete().eq('id', data[0].id);
    }
}

testInsert();
