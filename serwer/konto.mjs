// Dodaje albo zmienia konto wspólnika. Hasło czytane ze standardowego wejścia.
// Użycie: printf '%s' "$HASLO" | AM_DANE=/var/lib/amoferty node konto.mjs <login> "<Imię Nazwisko>" [telefon]
// Zmiana hasła istniejącego konta wylogowuje wszystkie jego urządzenia.
process.env.AM_KONTO_CLI = '1';
const { zapiszKonto } = await import('./amoferty.mjs');
const [login, nazwa, telefon] = process.argv.slice(2);
let haslo = '';
for await (const c of process.stdin) haslo += c;
try {
  const r = zapiszKonto(login, nazwa, haslo.replace(/\r?\n$/, ''), telefon || '');
  console.log(r.nowe ? `Konto „${login}” utworzone.` : `Konto „${login}” zaktualizowane (urządzenia tego konta zostały wylogowane).`);
  process.exit(0);
} catch (e) {
  console.error(`Błąd: ${e.message}`);
  process.exit(1);
}
