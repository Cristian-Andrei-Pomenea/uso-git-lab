#!/usr/bin/env bash
# GIT//LAB 08: Demonstratie autentica Git, izolata intr-un director temporar.
# Nu modifica fisierele existente si nu contacteaza GitHub.
set -Eeuo pipefail

if ! command -v git >/dev/null 2>&1; then
  printf 'Git nu este instalat. Instaleaza git sau foloseste demo-ul HTML offline.\n' >&2
  exit 1
fi

AUTO=0
if [[ "${1:-}" == '--auto' ]]; then AUTO=1; fi
if [[ -n "${1:-}" && "${1:-}" != '--auto' ]]; then
  printf 'Utilizare: bash demo-real.sh [--auto]\n' >&2
  exit 2
fi

if [[ -t 1 ]]; then
  BOLD=$'\033[1m'; CYAN=$'\033[96m'; PINK=$'\033[95m'; GREEN=$'\033[92m'; NC=$'\033[0m'
else BOLD=''; CYAN=''; PINK=''; GREEN=''; NC=''; fi

pause() {
  if [[ "$AUTO" == 0 && -t 0 ]]; then
    printf '\n%s[ ENTER pentru pasul urmator ]%s ' "$PINK" "$NC"
    read -r _
  fi
}
step() { printf '\n\n%s━━━ %s ━━━%s\n' "$BOLD$CYAN" "$1" "$NC"; pause; }
show() { printf '%s$ %s%s\n' "$GREEN" "$*" "$NC"; }

ROOT=$(mktemp -d "${TMPDIR:-/tmp}/uso-git-real.XXXXXXXX")
LOCAL="$ROOT/student"
REMOTE="$ROOT/origin.git"
COLEAG="$ROOT/coleg"

printf '\n%s ╔══════════════════════════════════════════════════════╗%s\n' "$CYAN" "$NC"
printf '%s ║  GIT//LAB 08 · DEMO CU GIT REAL · FĂRĂ INTERNET     ║%s\n' "$CYAN" "$NC"
printf '%s ╚══════════════════════════════════════════════════════╝%s\n' "$CYAN" "$NC"
printf 'Director temporar: %s\n' "$ROOT"
printf 'Repo-ul remote este un bare repo local; GitHub NU este contactat.\n'

step '1 / INIT — două repository-uri conectate'
show git init --bare --initial-branch=main "$REMOTE"
git init -q --bare --initial-branch=main "$REMOTE"
show git init -b main "$LOCAL"
mkdir -p "$LOCAL"; git -C "$LOCAL" init -q -b main
git -C "$LOCAL" config user.name 'Student USO'
git -C "$LOCAL" config user.email 'student@uso.example'
git -C "$LOCAL" remote add origin "$REMOTE"
printf '# Sorting Algorithms for Beginners\n' > "$LOCAL/README.md"
show git status
(cd "$LOCAL" && git status --short)

step '2 / STAGING vs COMMIT vs PUSH'
show git add README.md
git -C "$LOCAL" add README.md
show git status --short
git -C "$LOCAL" status --short
show git commit -m 'Add README'
git -C "$LOCAL" commit -q -m 'Add README'
show git push -u origin main
git -C "$LOCAL" push -q -u origin main
printf 'HEAD local: '; git -C "$LOCAL" rev-parse --short HEAD
printf 'HEAD remote: '; git --git-dir="$REMOTE" rev-parse --short main

step '3 / BRANCH — dezvoltare separată şi fast-forward merge'
show git switch -c feature/ignore
git -C "$LOCAL" switch -q -c feature/ignore
printf '*.o\nbuild/\n' > "$LOCAL/.gitignore"
show git add .gitignore
git -C "$LOCAL" add .gitignore
show git commit -m 'Ignore generated build artifacts'
git -C "$LOCAL" commit -q -m 'Ignore generated build artifacts'
show git switch main
git -C "$LOCAL" switch -q main
show git merge feature/ignore
git -C "$LOCAL" merge --ff-only feature/ignore
show git push origin main
git -C "$LOCAL" push -q origin main
show git log --oneline --graph --all --decorate
git -C "$LOCAL" --no-pager log --oneline --graph --all --decorate -5

step '4 / COLABORARE — un al doilea calculator'
show git clone "$REMOTE" "$COLEAG"
git clone -q "$REMOTE" "$COLEAG"
git -C "$COLEAG" config user.name 'Colega USO'
git -C "$COLEAG" config user.email 'colega@uso.example'
printf '# Sorting Algorithms for Beginners\n\nVersiunea COLEGEI: exemple vizuale.\n' > "$COLEAG/README.md"
show git commit -am 'Explain algorithms - teammate'
git -C "$COLEAG" commit -q -am 'Explain algorithms - teammate'
show git push origin main
git -C "$COLEAG" push -q origin main
printf 'Coleg a publicat între timp, dar studentul încă nu a făcut pull.\n'

step '5 / CONFLICT — amândoi schimbă aceeași parte'
printf '# Sorting Algorithms for Beginners\n\nVersiunea STUDENTULUI: exemple de cod C.\n' > "$LOCAL/README.md"
show git add README.md
git -C "$LOCAL" add README.md
show git commit -m 'Explain algorithms - student'
git -C "$LOCAL" commit -q -m 'Explain algorithms - student'
show git pull --no-rebase origin main
set +e
GIT_MERGE_AUTOEDIT=no git -C "$LOCAL" pull --no-rebase origin main
rc=$?
set -e
if [[ $rc -eq 0 ]] || ! grep -q '^<<<<<<<' "$LOCAL/README.md"; then
  printf 'Nu a fost produs conflictul așteptat. Verifică versiunea de Git.\n' >&2
  exit 1
fi
printf '\n%sConținutul conflictului real:%s\n' "$PINK" "$NC"
cat "$LOCAL/README.md"

step '6 / REZOLVARE — Git are nevoie de decizia omului'
printf '# Sorting Algorithms for Beginners\n\nExemple vizuale și exemple de cod C, îmbinate de echipă.\n' > "$LOCAL/README.md"
show git add README.md
git -C "$LOCAL" add README.md
show git commit -m 'Resolve README merge conflict'
git -C "$LOCAL" commit -q -m 'Resolve README merge conflict'
show git push origin main
git -C "$LOCAL" push -q origin main
show git log --oneline --graph --all --decorate
git -C "$LOCAL" --no-pager log --oneline --graph --all --decorate -9
printf '\n%s✓ DEMO COMPLET — istoric real, merge commit cu doi părinți.%s\n' "$GREEN" "$NC"
printf 'Fișierele se află NUMAI în directorul temporar: %s\n' "$ROOT"
printf 'Le poți inspecta; le poți șterge ulterior când nu mai ai nevoie.\n'
