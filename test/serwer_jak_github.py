# Serwer testowy zachowujący się jak GitHub Pages dla repo „ogloszenia”:
# /ogloszenia/... → katalog repozytorium, adres bez rozszerzenia → plik .html, brak SPA-fallbacku w podkatalogach.
# python3 test/serwer_jak_github.py  (port 8767)
import http.server, os, functools, tempfile
KORZEN = tempfile.mkdtemp()
os.symlink(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), os.path.join(KORZEN, 'ogloszenia'))
class H(http.server.SimpleHTTPRequestHandler):
    def send_head(self):
        sciezka = self.path.split('?')[0]
        p = self.translate_path(sciezka)
        if not os.path.exists(p) and os.path.exists(p + '.html'):
            self.path = sciezka + '.html' + (self.path[len(sciezka):])
        return super().send_head()
    def log_message(self, *a): pass
http.server.ThreadingHTTPServer(('127.0.0.1', 8767), functools.partial(H, directory=KORZEN)).serve_forever()
