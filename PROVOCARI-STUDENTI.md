# GIT//LAB 08 — provocări pentru studenți

**Regulă:** În simulator poți strica orice. În Git real, lucrează într-un director nou, nu în proiectele altor colegi.

## LVL 1 · First contact (5 minute) — OFFLINE

1. Deschide `GIT-LAB-08-OFFLINE.html`.
2. Alege „First commit”; rulează `git status`, `git add README.md`, `git commit -m "Add README"` și `git push origin main`.
3. După fiecare comandă identifică în ce zonă a ajuns README: working tree, staging, local repo, remote.
4. Reset, apoi încearcă `git commit -m "Too early"` **înainte de** `git add`. De ce nu reușește?

**Criteriu de succes:** graful arată un commit, iar `main` și `origin/main` indică spre același hash.

## LVL 2 · Branch explorer (8 minute) — OFFLINE

1. Alege „Parallel worlds”; creează branch-ul `feature/ignore`.
2. Adaugă un fișier `.gitignore` cu `*.o` folosind editorul sau `echo "*.o" > .gitignore`.
3. Creează un commit și revino pe `main`.
4. Înainte de merge, dă `git log --oneline --graph --all` și răspunde: unde indică `HEAD`? Apoi fă merge.
5. Încearcă `git branch -d feature/ignore` după merge. Ce a dispărut și ce a rămas în istoric?

**Bonus:** explică ce înseamnă „fast-forward”.

## LVL 3 · Human review (8 minute) — OFFLINE / GITHUB SIMULAT

1. Alege „Pull request”; finalizează misiunea, inclusiv review și CI.
2. Încearcă să faci `pr merge` înainte de `pr approve` și `ci run`. De ce este blocat în acest demo?
3. După merge-ul PR, compară `main` cu `origin/main`. De ce trebuie apoi `git pull`?

**Important:** `pr create`, `pr approve`, `pr merge` și `ci run` sunt comenzi speciale **ale simulatorului**, nu comenzi Git reale. Pentru un PR real folosești interfața GitHub sau GitHub CLI.

## LVL 4 · Fix the universe (8 minute) — OFFLINE

1. Alege „Merge disaster”. Rulează `git pull origin main`.
2. În editorul de fișiere găsește `<<<<<<< HEAD`, `=======`, `>>>>>>> origin/main`.
3. Rescrie README, combinând informația de la ambele persoane; apoi apasă „Salvează”. Alternativ, pentru demonstrație poți rula `resolve README.md` (comandă doar în simulator).
4. Rulează `git add README.md`, apoi `git commit -m "Resolve conflict"`.
5. Uită-te la graful cu doi părinți ai commit-ului de merge.

**Bonus:** reset, declanșează conflictul și încearcă `git merge --abort`. Ce se întâmplă?

## LVL 5 · Repo Git ADEVĂRAT (15–25 minute) — LINUX

1. `mkdir uso-git-experiment && cd uso-git-experiment`
2. `git init -b main` (dacă Git vechi nu suportă `-b`, folosește `git init` + `git branch -M main` după primul commit).
3. Configurează identitatea doar pentru acest repo: `git config user.name "Prenume Nume"` și `git config user.email "student@example.com"`.
4. Creează un README și fișierul `bubble-sort.c` (poți porni din `examples/bubble-sort.c`); fă commit.
5. Creează `feature/ignore`, adaugă `.gitignore`, fă commit, switch pe main și merge.
6. Verifică `git status`, `git log --oneline --graph --all --decorate`, `git diff`.
7. Dacă ai cont GitHub, creează un repo **gol**, conectează-l cu `git remote add origin URL`, apoi publică `main` și `feature` cu `git push -u origin branch`.

**Provocare GitHub (necesită cont + internet):** publică o modificare la Bubble Sort pe un branch nou, deschide un PR real, adaugă o descriere și cere feedback unui coleg înainte de merge. Nu publica token-uri în README, log-uri sau capturi de ecran.

## SUPER BONUS · GitHub Actions (10–15 minute)

Într-un repo real cu `README.md` și `bubble-sort.c` funcțional, pune fișierul `bonus-github-actions/ci.yml` în **`.github/workflows/ci.yml`**. Creează un PR și urmărește job-ul din tab-ul **Actions**. Schimbă temporar numele fișierului C și observă cum build-ul eșuează, apoi repară-l și fă push din nou.

## BOSS FIGHT (2 minute)

Deschide „Boss fight” din simulator și încearcă să obții 5/5. Explică unui coleg, cu cuvintele tale, de ce `commit` nu înseamnă `push`.
