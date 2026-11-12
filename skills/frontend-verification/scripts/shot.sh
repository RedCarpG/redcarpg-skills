#!/usr/bin/env bash
# shot.sh — headless Chrome: screenshot, DOM dump or PDF of a URL.
#
# usage:
#   shot.sh OUT WxH URL [BUDGET_MS] [--dark|--light] [--lang LOCALE] [--scale N] [--chrome PATH]
#
#   OUT        .png → screenshot   .html/.txt → DOM after scripts ran (--dump-dom)   .pdf → print media
#   WxH        window size in CSS px, e.g. 1440x900 or 375x812
#   URL        http(s):// or file:// URL (a plain file path is turned into a file:// URL)
#   BUDGET_MS  virtual-time budget, default 8000. Chrome fast-forwards timers/network
#              for this long before capturing. Raise it for slow pages or long animations.
#   --dark / --light   force prefers-color-scheme. Default is --light, because without a flag
#                      headless Chrome follows the OS theme and results differ per machine.
#   --lang     navigator.language / Accept-Language, e.g. en-US or zh-TW
#   --scale    device scale factor (default 1; 2 for a retina-like capture)
#   --chrome   path to a Chrome/Chromium/Edge binary (or set $CHROME)
#
# Quirks this script deals with (all verified on Chrome 157, Windows):
#   * headless=new clamps the layout width to >= 500px. For W < 500 the PNG would be a 500px layout
#     cropped to W, which lies. So the page is loaded in a W×H <iframe> inside a wrapper page instead.
#   * the layout viewport is a bit smaller than --window-size (about 18×96 px on Windows); the
#     screenshot still has the requested size. Use shot.mjs when the exact viewport matters.
#   * requestAnimationFrame barely runs under --virtual-time-budget (see SKILL.md).
set -u

die() { echo "shot.sh: $*" >&2; exit 1; }

# ---- args --------------------------------------------------------------
POS=(); SCHEME=light; LANGV=""; SCALE=1; CHROME_BIN="${CHROME:-${CHROME_PATH:-}}"
while [ $# -gt 0 ]; do
  case "$1" in
    --dark) SCHEME=dark ;;
    --light) SCHEME=light ;;
    --lang) LANGV="${2:?--lang needs a value}"; shift ;;
    --scale) SCALE="${2:?--scale needs a value}"; shift ;;
    --chrome) CHROME_BIN="${2:?--chrome needs a path}"; shift ;;
    -h|--help) sed -n '2,26p' "$0"; exit 0 ;;
    --*) die "unknown option $1" ;;
    *) POS+=("$1") ;;
  esac
  shift
done
[ ${#POS[@]} -ge 3 ] || { sed -n '2,10p' "$0" >&2; exit 2; }
OUT="${POS[0]}"; SIZE="${POS[1]}"; URL="${POS[2]}"; BUDGET="${POS[3]:-8000}"
case "$SIZE" in *[0-9]x[0-9]*) ;; *) die "size must look like 1440x900, got '$SIZE'" ;; esac
W="${SIZE%x*}"; H="${SIZE#*x}"
case "$BUDGET" in ''|*[!0-9]*) die "budget must be milliseconds, got '$BUDGET'" ;; esac

# ---- find Chrome -------------------------------------------------------
find_chrome() {
  [ -n "$CHROME_BIN" ] && { [ -x "$CHROME_BIN" ] && { echo "$CHROME_BIN"; return; }; die "chrome not executable: $CHROME_BIN"; }
  local c
  case "$(uname -s 2>/dev/null)" in
    MINGW*|MSYS*|CYGWIN*)   # Git Bash on Windows
      local la=""; [ -n "${LOCALAPPDATA:-}" ] && la="$(cygpath -u "$LOCALAPPDATA" 2>/dev/null)"
      for c in "/c/Program Files/Google/Chrome/Application/chrome.exe" \
               "/c/Program Files (x86)/Google/Chrome/Application/chrome.exe" \
               "$la/Google/Chrome/Application/chrome.exe" \
               "/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" \
               "/c/Program Files/Microsoft/Edge/Application/msedge.exe"; do
        [ -x "$c" ] && { echo "$c"; return; }
      done ;;
    Darwin)
      for c in "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
               "/Applications/Chromium.app/Contents/MacOS/Chromium" \
               "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"; do
        [ -x "$c" ] && { echo "$c"; return; }
      done ;;
    *)
      for c in google-chrome google-chrome-stable chromium chromium-browser chrome microsoft-edge; do
        command -v "$c" >/dev/null 2>&1 && { command -v "$c"; return; }
      done ;;
  esac
  die "no Chrome/Chromium found; pass --chrome PATH or set CHROME"
}
CH="$(find_chrome)"

# ---- paths (Windows binaries want C:/… paths, not /c/…) ----------------
if command -v cygpath >/dev/null 2>&1; then native() { cygpath -m "$1"; }; else native() { echo "$1"; }; fi
mkdir -p "$(dirname "$OUT")" || die "cannot create output directory"
OUT_ABS="$(cd "$(dirname "$OUT")" && pwd)/$(basename "$OUT")"
OUT_N="$(native "$OUT_ABS")"
TMP="$(mktemp -d)"; TMP_N="$(native "$TMP")"
cleanup() { sleep 1; rm -rf "$TMP" 2>/dev/null || true; }
trap cleanup EXIT

case "$URL" in
  http://*|https://*|file://*|data:*|about:*) ;;
  *) [ -e "$URL" ] || die "not a URL and not an existing file: $URL"
     URL="file:///$(native "$(cd "$(dirname "$URL")" && pwd)/$(basename "$URL")" | sed 's#^/##')" ;;
esac

# ---- mode from the output extension -----------------------------------
case "$OUT" in
  *.png) MODE=png ;;
  *.pdf) MODE=pdf ;;
  *.html|*.htm|*.txt|*.dom) MODE=dom ;;
  *) die "OUT must end in .png, .pdf or .html/.txt" ;;
esac

# ---- narrow widths: Chrome clamps the window to 500px → use an iframe wrapper ----
WIN_W="$W"; WIN_H="$H"
if [ "$MODE" = png ] && [ "$W" -lt 500 ]; then
  echo "shot.sh: width $W < 500, Chrome would clamp the layout; framing the page in a ${W}x${H} iframe" >&2
  cat > "$TMP/wrap.html" <<HTML
<!doctype html><meta charset="utf-8"><style>html,body{margin:0;background:#808080}iframe{border:0;display:block;width:${W}px;height:${H}px;background:#fff}</style><iframe src="$URL"></iframe>
HTML
  URL="file:///$(native "$TMP/wrap.html" | sed 's#^/##')"
  WIN_W=500   # screenshot is 500 wide; the framed page occupies the left W px, the rest is grey
fi

# ---- run ---------------------------------------------------------------
FLAGS=(--headless=new --hide-scrollbars --disable-gpu --no-first-run --no-default-browser-check
       --force-device-scale-factor="$SCALE" --window-size="$WIN_W,$WIN_H"
       --virtual-time-budget="$BUDGET" --user-data-dir="$TMP_N")
[ "$SCHEME" = dark ] && FLAGS+=(--blink-settings=preferredColorScheme=0) || FLAGS+=(--blink-settings=preferredColorScheme=1)   # enum is dark=0, light=1
[ -n "$LANGV" ] && FLAGS+=(--lang="$LANGV" --accept-lang="$LANGV")
RUN=(); command -v timeout >/dev/null 2>&1 && RUN=(timeout 120)

rm -f "$OUT_ABS"
case "$MODE" in
  png) "${RUN[@]}" "$CH" "${FLAGS[@]}" --screenshot="$OUT_N" "$URL" >/dev/null 2>"$TMP/err" ;;
  pdf) "${RUN[@]}" "$CH" "${FLAGS[@]}" --no-pdf-header-footer --print-to-pdf="$OUT_N" "$URL" >/dev/null 2>"$TMP/err" ;;
  dom) "${RUN[@]}" "$CH" "${FLAGS[@]}" --dump-dom "$URL" >"$OUT_ABS" 2>"$TMP/err" ;;
esac

[ -s "$OUT_ABS" ] || { echo "shot.sh: no output produced. Last Chrome messages:" >&2; tail -5 "$TMP/err" >&2; exit 1; }

# ---- report (what the file actually is, not what was asked for) --------
bytes=$(wc -c < "$OUT_ABS" | tr -d ' ')
if [ "$MODE" = png ]; then
  set -- $(od -An -tu1 -j16 -N8 "$OUT_ABS")
  echo "$OUT $((($1<<24)+($2<<16)+($3<<8)+$4))x$((($5<<24)+($6<<16)+($7<<8)+$8)) ${bytes}B ($SCHEME)"
else
  echo "$OUT ${bytes}B ($MODE, $SCHEME)"
fi
