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
# 4) granica pomieszczeń: linia dzieląca pomieszczenie bez ściany (np. przedpokój otwarty na salon)
#    ściana z polem granica: true — dzieli pomieszczenia i metraże, na rzucie przerywana, w 3D niewidoczna
GR = "(w as unknown as { granica?: boolean }).granica"
zamien('src/lib/utils/canvasRenderer.ts', "  const thickness = wallThicknessScreen(w, zoom);\n\n  if (w.curvePoint) {",
  "  const thickness = wallThicknessScreen(w, zoom);\n\n  if (" + GR + ") { // AM Oferty: granica pomieszczeń\n    ctx.save(); ctx.strokeStyle = selected ? '#3b82f6' : '#8a7444'; ctx.lineWidth = Math.max(1.5, 2.5 * zoom); ctx.setLineDash([Math.max(6, 14 * zoom), Math.max(4, 9 * zoom)]);\n    ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(e.x, e.y); ctx.stroke(); ctx.restore(); return;\n  }\n\n  if (w.curvePoint) {")
zamien('src/lib/utils/canvasRenderer.ts', "  for (const w of floor.walls) {\n    const sel = w.id === selId;", "  for (const w of floor.walls) {\n    if (" + GR + ") continue;\n    const sel = w.id === selId;")
zamien('src/lib/utils/export.ts', "      for (const wall of visibility.walls ? floor.walls : []) {\n        ctx.lineWidth = wall.thickness;",
  "      for (const wall of visibility.walls ? floor.walls : []) {\n        if ((wall as unknown as { granica?: boolean }).granica) { // AM Oferty: granica pomieszczeń — przerywana, bez wymiaru\n          ctx.save(); ctx.lineWidth = 2.5; ctx.strokeStyle = '#8a7444'; ctx.setLineDash([14, 9]); ctx.lineCap = 'butt'; ctx.beginPath();\n          ctx.moveTo(wall.start.x - minX + pad, wall.start.y - minY + pad); ctx.lineTo(wall.end.x - minX + pad, wall.end.y - minY + pad); ctx.stroke(); ctx.restore(); continue;\n        }\n        ctx.lineWidth = wall.thickness;")
zamien('src/lib/components/viewer3d/ThreeViewer.svelte', "    for (const wall of floor.walls) {\n      // Resolve per-side materials", "    for (const wall of floor.walls) {\n      if ((wall as unknown as { granica?: boolean }).granica) continue; // AM Oferty: granica pomieszczeń nie jest ścianą\n      // Resolve per-side materials")
zamien('src/lib/components/sidebar/PropertiesPanel.svelte', """        <input type="number" value={displayValue(selectedWall.thickness)} oninput={onWallThickness} onblur={onWallThickness} step="any" class="w-full px-2 py-1 border border-gray-200 rounded text-sm" />
      </label>""", """        <input type="number" value={displayValue(selectedWall.thickness)} oninput={onWallThickness} onblur={onWallThickness} step="any" class="w-full px-2 py-1 border border-gray-200 rounded text-sm" />
      </label>
      <label class="flex items-start gap-2 text-sm py-1">
        <input type="checkbox" class="mt-1" checked={!!(selectedWall as unknown as { granica?: boolean }).granica} onchange={(e) => updateWall(selectedWall!.id, (e.currentTarget.checked ? { granica: true, thickness: 1 } : { granica: false, thickness: 12 }) as unknown as Parameters<typeof updateWall>[1])} />
        <span><b>Granica pomieszczeń (bez ściany)</b><br><span class="text-xs text-gray-500">Dzieli np. przedpokój i salon w otwartej przestrzeni. Na rzucie przerywana linia, nie liczy się jako ściana.</span></span>
      </label>""")
# 5) domyślne nazwy po polsku (widać je na obrazie rzutu w ogłoszeniu)
for f in ['src/lib/utils/floors.ts', 'src/lib/utils/planStatistics.ts', 'src/lib/utils/projectPackageBridge.ts', 'src/lib/utils/houseTemplates.ts', 'src/lib/utils/projectValidation.ts', 'src/lib/utils/roomplanImport.ts']:
    t = czytaj(f); assert "'Ground Floor'" in t, f
    t = t.replace("'Ground Floor'", "'Parter'").replace("`Floor ${level}`", "`Piętro ${level}`").replace("`Floor ${index}`", "`Piętro ${index}`").replace("'Basement'", "'Piwnica'").replace("`Basement ${-level}`", "`Piwnica ${-level}`")
    pisz(f, t)
zamien('src/lib/utils/roomDetection.ts', "name: `Room ${roomCount}`,", "name: `Pomieszczenie ${roomCount}`,")
print('Łatki nałożone.')
