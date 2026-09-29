#!/usr/bin/env bash
# Fails when styling under the given paths (default: src) still uses pre-refresh
# colors, casing, fonts or button variants. On master (before the Fleet port)
# it reports many hits: that is the baseline. Allowed shadcn alias names
# (Ruling 2): background, foreground, card, popover, sidebar, border, input, ring,
# destructive, muted-foreground. Append `token-check:allow` to a line
# that legitimately needs a hex value (brand logos, stored data).
set -uo pipefail
cd "$(dirname "$0")/../.."
if [ $# -eq 0 ]; then set -- src; fi
paths=("$@")

fail=0
check() {
  local name=$1 pattern=$2 hits
  hits=$(grep -rnE --include='*.css' --include='*.ts' --include='*.tsx' \
    --exclude-dir=gql --exclude-dir=generated --exclude-dir=__fixtures__ --exclude-dir=__tests__ \
    --exclude=globals.css --exclude=GoogleIcon.tsx `# multi-color brand logo` \
    "$pattern" "${paths[@]}" | grep -v 'token-check:allow')
  if [ -n "$hits" ]; then
    echo "✗ $name ($(echo "$hits" | wc -l | tr -d ' '))"
    echo "$hits" | sed 's/^/    /'
    fail=1
  else
    echo "✓ $name"
  fi
}

check 'hex color literals' '#[0-9A-Fa-f]{3}([0-9A-Fa-f]{3})?([0-9A-Fa-f]{2})?\b'
check 'legacy palette classes' '\b(bg|text|border|border-t|border-b|border-l|border-r|divide|ring|fill|stroke|from|via|to|placeholder|decoration|outline|shadow|accent|caret)-(surface|cta|feedback|text|text-secondary|secondary|grey|dark-grey|dark|primary|primary-[0-9]+|red|gray|slate|zinc|neutral|stone|amber|green|blue|indigo|yellow|orange|emerald|teal|cyan|sky-[0-9]|violet|purple|pink|rose|lime|fuchsia|white|black)\b'
check 'hsl(var(...)) color usages' 'hsl\(var\(--'
check 'forced dark class' '(className|class)=[^>]*[" ]dark[" ]|[" ]dark with-icon|\bdark:'
check 'uppercase / positive tracking' '\buppercase\b|\btracking-(wide|wider|widest|\[0?\.[0-9]+em\]|\[[0-9.]+px\])'
check 'legacy button variants' '\b(primary-outline|white-outline|table-action-button|primary-solid|error-outline|error-simple|secondary-border-color)\b'
check 'removed fonts' 'gtSuper|Universal-Sans|GT-Super'
exit $fail
