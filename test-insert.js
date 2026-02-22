import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsert() {
    const { data: clients } = await supabase.from('vrac_clients').select('id').limit(1);
    const clientId = clients[0].id;

    const { data, error } = await supabase.from('vrac_demandes_chargement').insert({
        client_id: clientId,
        immatriculation_tracteur: 'TEST-NOCORS',
        immatriculation_citerne: 'TEST-NOCORS',
        nom_chauffeur: 'TESTER',
        statut: 'en_attente'
    }).select();

    if (error) {
        console.error('ERROR:', error);
    } else {
        console.log('SUCCESS:', data[0].date_chargement);
        // Clean up test
        await supabase.from('vrac_demandes_chargement').delete().eq('id', data[0].id);
    }
}

testInsert();
