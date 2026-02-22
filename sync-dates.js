import { createClient } from '@supabase/supabase-js';
import { formatInTimeZone } from 'date-fns-tz';

const supabaseUrl = "https://sfnnqubbnlxroftbicjr.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmbm5xdWJibmx4cm9mdGJpY2pyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1NDkyMDIsImV4cCI6MjA3OTEyNTIwMn0.JXLRGXnErgcBsSxLaDGISUj5eoMgWMOvYdp6yfqyF6I";
const supabase = createClient(supabaseUrl, supabaseKey);

async function synchronizeDates() {
    const { data: demandes, error } = await supabase.from('vrac_demandes_chargement').select('id, created_at, date_chargement');

    if (error) {
        console.error('Failed to fetch:', error);
        return;
    }

    let updatedRows = 0;
    console.log(`Checking ${demandes.length} requests for inconsistencies...`);

    for (const d of demandes) {
        const trueDateStr = formatInTimeZone(new Date(d.created_at), 'Africa/Abidjan', 'yyyy-MM-dd');
        if (d.date_chargement !== trueDateStr) {
            console.log(`Fixing row ${d.id}: ${d.date_chargement} -> ${trueDateStr}`);
            const { error: updateErr } = await supabase.from('vrac_demandes_chargement')
                .update({ date_chargement: trueDateStr })
                .eq('id', d.id);

            if (updateErr) console.error('Error updating row:', updateErr);
            else updatedRows++;
        }
    }

    console.log(`Synchronization complete. Updated ${updatedRows} records.`);
}

synchronizeDates();
