<script lang="ts">
  import { amOid, amZapisz, adresRzutu } from '$lib/services/amMost';
  const oid = amOid();
  let trwa = $state(false);
  let blad = $state('');
  async function zapisz() {
    trwa = true; blad = '';
    try { await amZapisz(); } catch (e) { blad = (e as Error).message || 'Nie udało się zapisać rzutu.'; trwa = false; }
  }
</script>

{#if oid}
  <div class="am-most" role="region" aria-label="AM Oferty">
    <a class="am-wroc" href={adresRzutu(oid)} title="Wróć do rzutu bez zmian z tego edytora">‹ Rzut</a>
    <button class="am-zapisz" onclick={zapisz} disabled={trwa}>{trwa ? 'Przenoszę…' : 'Gotowe'}</button>
    {#if blad}<span class="am-blad" role="alert">{blad}</span>{/if}
  </div>
{/if}

<style>
  .am-most { position: fixed; right: 12px; bottom: calc(env(safe-area-inset-bottom, 0px) + 96px); z-index: 120; display: flex; align-items: center; gap: 4px; padding: 5px; border-radius: 16px; background: rgba(18, 17, 15, .92); border: 1px solid rgba(212, 178, 102, .5); box-shadow: 0 10px 30px rgba(0, 0, 0, .35); font: 600 15px/1 system-ui, -apple-system, sans-serif; max-width: calc(100vw - 24px); flex-wrap: nowrap; white-space: nowrap; }
  .am-wroc { color: #E6CE94; text-decoration: none; padding: 12px 14px; border-radius: 12px; }
  .am-zapisz { border: 0; border-radius: 12px; padding: 12px 18px; color: #1A1408; background: linear-gradient(180deg, #F4E3B2 0%, #E2C47E 38%, #C9A24F 72%, #A9832F 100%); font: inherit; cursor: pointer; }
  .am-zapisz:disabled { opacity: .6; }
  .am-blad { position: absolute; right: 0; bottom: calc(100% + 8px); background: rgba(18, 17, 15, .95); border: 1px solid rgba(233, 144, 127, .5); border-radius: 10px; padding: 8px 10px; white-space: normal; width: max-content; max-width: calc(100vw - 24px); color: #F2B4A8; font-weight: 500; font-size: 13px; line-height: 1.35; }
</style>
