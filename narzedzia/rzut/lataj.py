# Nakłada zmiany AM Oferty na kod openPlan3D (katalog podany jako argument).
import sys, os, re, json, shutil
R = sys.argv[1]; T = os.path.dirname(os.path.abspath(__file__))
def plik(p): return os.path.join(R, p)
def czytaj(p): return open(plik(p), encoding='utf-8').read()
def pisz(p, s): open(plik(p), 'w', encoding='utf-8').write(s)
def zamien(p, a, b, ile=1):
    s = czytaj(p)
    if a not in s: raise SystemExit(f'Nie pasuje łatka w {p}: {a[:70]!r}')
    pisz(p, s.replace(a, b, ile))

# 1) statyczna strona pod /ogloszenia/rzut, bez serwera
pisz('svelte.config.js', """import adapter from '@sveltejs/adapter-static';

/** AM Oferty: statyczna kopia edytora pod /ogloszenia/rzut, bez serwera i chmury */
const config = {
\tkit: {
\t\tadapter: adapter({ fallback: '404.html', strict: false }),
\t\tpaths: { base: '/ogloszenia/rzut', relative: false },
\t\tprerender: { entries: [], handleHttpError: 'ignore' }
\t}
};

export default config;
""")
for d in ['src/routes/mcp', 'src/routes/agent-bridge', 'src/routes/api', 'src/routes/render-lab']:
    shutil.rmtree(plik(d), ignore_errors=True)
pisz('src/lib/firebase.ts', "// AM Oferty: bez Firebase i bez analityki\nexport const app = null;\nexport const analytics = Promise.resolve(null);\n")
s = czytaj('src/routes/+layout.ts')
pisz('src/routes/+layout.ts', "export const ssr = false;\nexport const prerender = false;\n" + re.sub(r'export const (ssr|prerender)[^\n]*\n', '', s))

# 2) język polski (domyślny)
shutil.copy(os.path.join(T, 'pliki/pl.ts'), plik('src/lib/i18n/locales/pl.ts'))
p = 'src/lib/i18n/index.ts'
zamien(p, "import { pt } from './locales/pt';", "import { pt } from './locales/pt';\nimport { pl } from './locales/pl';")
zamien(p, "export type Locale = 'en' | 'pt';", "export type Locale = 'en' | 'pt' | 'pl';")
zamien(p, "= { en, pt };", "= { en, pt, pl };")
zamien(p, "writable<Locale>('en');", "writable<Locale>('pl');")
zamien(p, "value === 'en' || value === 'pt';", "value === 'en' || value === 'pt' || value === 'pl';")
zamien(p, "locale.set(isLocale(saved) ? saved : 'en');", "locale.set(isLocale(saved) ? saved : 'pl'); // AM Oferty: domyślnie polski")
mb = dict(x.split('=', 1) for x in open(os.path.join(T, 'pliki/meble-pl.txt'), encoding='utf-8').read().strip().split('; '))
p = 'src/lib/i18n/furnitureNames.ts'
zamien(p, "export function furnitureName(", "export const polishFurnitureNames: Readonly<Record<string, string>> = " + json.dumps(mb, ensure_ascii=False, indent=2) + ";\n\nexport function furnitureName(")
zamien(p, "return language === 'pt' ? portugueseFurnitureNames[id] ?? item.name : item.name;", "return language === 'pt' ? portugueseFurnitureNames[id] ?? item.name : language === 'pl' ? polishFurnitureNames[id] ?? item.name : item.name;")
for f in ['src/lib/components/editor/UndoHistoryPanel.svelte', 'src/lib/components/toolbar/VersionHistoryPanel.svelte', 'src/lib/utils/scaledPrint.ts', 'src/routes/+page.svelte']:
    s = czytaj(f); pisz(f, s.replace("language === 'pt' ? 'pt-BR' : 'en'", "language === 'pt' ? 'pt-BR' : language === 'pl' ? 'pl-PL' : 'en'"))
zamien('src/lib/utils/export.ts', "language === 'pt' ? 'pt-BR' : 'en-US'", "language === 'pt' ? 'pt-BR' : language === 'pl' ? 'pl-PL' : 'en-US'")
zamien('src/lib/components/toolbar/SettingsDialog.svelte', '<option value="pt" lang="pt">Português</option>', '<option value="pt" lang="pt">Português</option>\n              <option value="pl" lang="pl">Polski</option>')
zamien('src/lib/i18n/projectServiceMessages.ts', "(['en', 'pt'] as const)", "(['en', 'pt', 'pl'] as const)")

# 3) most z ofertą
shutil.copy(os.path.join(T, 'pliki/amMost.ts'), plik('src/lib/services/amMost.ts'))
shutil.copy(os.path.join(T, 'pliki/AmMost.svelte'), plik('src/lib/components/AmMost.svelte'))
zamien('src/lib/utils/export.ts', "function download(blob: Blob, filename: string) {\n", "function download(blob: Blob, filename: string) {\n  // AM Oferty: przy zapisie do oferty obraz trafia do mostu zamiast na dysk\n  const am = (globalThis as unknown as { __amPobranie?: (b: Blob, n: string) => void }).__amPobranie;\n  if (am) { am(blob, filename); return; }\n")
p = 'src/routes/editor/+page.svelte'
zamien(p, "  import { startAgentBridge } from '$lib/services/agentBridge';", "  import { startAgentBridge } from '$lib/services/agentBridge';\n  import { amOtworz } from '$lib/services/amMost';\n  import AmMost from '$lib/components/AmMost.svelte';")
zamien(p, "      const url = new URL(window.location.href);\n\n      // iOS capture handoff: ?import=CODE", "      const url = new URL(window.location.href);\n\n      // AM Oferty: rzut oferty (?am=<id oferty>)\n      if (await amOtworz()) { ready = true; return; }\n\n      // iOS capture handoff: ?import=CODE")
zamien(p, "<!-- iOS capture import error toast -->", "<AmMost />\n\n<!-- iOS capture import error toast -->")
print('Łatki nałożone.')
