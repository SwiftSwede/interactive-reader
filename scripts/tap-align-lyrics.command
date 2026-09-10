#!/bin/bash
# Alineador de letras (karaoke de canciones) — Profe Kyle
# Doble clic para abrir.
# Must be http://localhost (not file://, not 127.0.0.1):
#   file://        → YouTube Error 153
#   127.0.0.1      → "Video unavailable"
# Si macOS pregunta la primera vez: clic derecho → Abrir → Abrir.
DIR="$(cd "$(dirname "$0")" && pwd)"
PORT=8765
URL="http://localhost:${PORT}/tap-align-lyrics.html"

already_up() {
  curl -s -o /dev/null --max-time 1 "$URL"
}

if ! already_up; then
  cd "$DIR" || exit 1
  python3 -m http.server "$PORT" --bind 127.0.0.1 >/tmp/tap-align-lyrics.log 2>&1 &
  for _ in 1 2 3 4 5 6 7 8 9 10; do
    if already_up; then
      break
    fi
    sleep 0.2
  done
fi

if already_up; then
  open "$URL"
else
  osascript -e 'display dialog "No pude arrancar el servidor local (puerto 8765). Abre en Terminal:\n\ncd ~/Desktop/WebDev/interactive-reader/scripts\npython3 -m http.server 8765 --bind 127.0.0.1\n\nluego http://localhost:8765/tap-align-lyrics.html\n\nNo uses 127.0.0.1 en el navegador: YouTube lo marca Video unavailable." buttons {"OK"} default button 1 with title "Alineador de letras"'
fi
