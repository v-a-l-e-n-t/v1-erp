#!/usr/bin/env node
// Rotate app_users codes (fuites dans 20260429000000_app_auth_and_stock_sphere_history.sql)
//
// Usage:
//   1. Renseigner SUPABASE_DB_URL dans .env.local (NE PAS COMMITTER) :
//        SUPABASE_DB_URL=postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres
//      (URL "Connection string" depuis Project Settings > Database)
//   2. node scripts/security/rotate_admin_codes.mjs
//   3. Le script genere 3 nouveaux codes, les UPDATE en bcrypt, et imprime
//      les nouveaux codes en clair UNE SEULE FOIS dans le terminal.
//   4. Communiquez-les hors-bande (signal/whatsapp en personne) aux operateurs,
//      videz l'historique du terminal apres lecture.

import { readFileSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';
import { randomBytes } from 'node:crypto';
import { stdin, stdout } from 'node:process';
import pg from 'pg';

function loadEnvFile(path) {
  try {
    const raw = readFileSync(path, 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) {
        let value = m[2];
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        process.env[m[1]] = value;
      }
    }
  } catch {}
}

loadEnvFile('.env.local');
loadEnvFile('.env');

const DB_URL = process.env.SUPABASE_DB_URL;
if (!DB_URL) {
  console.error('SUPABASE_DB_URL manquante. Voir l\'en-tete de ce script.');
  process.exit(1);
}

function generateCode() {
  // 12 caracteres alphanumeriques sans confusion (0/O, 1/I/l)
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const bytes = randomBytes(12);
  let out = '';
  for (let i = 0; i < 12; i++) {
    out += alphabet[bytes[i] % alphabet.length];
  }
  return out;
}

async function main() {
  const client = new pg.Client({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();

  const { rows: users } = await client.query(
    "SELECT id, full_name FROM public.app_users WHERE is_active ORDER BY full_name"
  );

  if (users.length === 0) {
    console.error('Aucun app_users actif trouve.');
    await client.end();
    process.exit(1);
  }

  console.log('Utilisateurs admin actifs :');
  users.forEach((u, i) => console.log(`  ${i + 1}. ${u.full_name} (${u.id})`));

  const rl = createInterface({ input: stdin, output: stdout });
  const answer = (await rl.question('\nGenerer de nouveaux codes pour TOUS ces utilisateurs ? [oui/non] ')).trim().toLowerCase();
  rl.close();
  if (answer !== 'oui' && answer !== 'o' && answer !== 'yes' && answer !== 'y') {
    console.log('Annule.');
    await client.end();
    process.exit(0);
  }

  console.log('\n=== NOUVEAUX CODES (a communiquer hors-bande, puis vider l\'historique du terminal) ===\n');

  for (const u of users) {
    const newCode = generateCode();
    await client.query(
      "UPDATE public.app_users SET code_hash = extensions.crypt($1, extensions.gen_salt('bf', 10)), updated_at = now() WHERE id = $2",
      [newCode, u.id]
    );
    console.log(`  ${u.full_name.padEnd(24)} : ${newCode}`);
  }

  console.log('\nRotation terminee. Les anciens codes ne fonctionnent plus.');
  await client.end();
}

main().catch((err) => {
  console.error('Erreur :', err);
  process.exit(1);
});
