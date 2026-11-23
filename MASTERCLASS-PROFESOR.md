# 🎤 GIT//LAB — scenariu de masterclass (USO, anul I)

**Obiectiv:** studenții înțeleg traseul unei schimbări de la fișier la staging, commit și GitHub; înțeleg de ce folosim branch-uri, merge, PR și CI; știu să identifice un conflict și să îl rezolve.

## 30 minute · „spectacol rapid”

| Minut | Unde | Ce arăți / întrebare pentru sală |
|---|---|---|
| 00–03 | Masterclass 01–02 | Git vs GitHub. Cine ține istoricul dacă internetul cade? |
| 03–07 | 03–04 | Working tree → stage → commit. După `git commit`, vede colegul? |
| 07–11 | Playground scena 01 | Rulezi status, add, commit, push; urmărește cele 4 niveluri și graful. |
| 11–15 | Masterclass 06–07 | Branch vs checkout/switch. Fast-forward vs merge commit. |
| 15–19 | Playground scena 02 | `git switch -c` → `.gitignore` → commit → merge. |
| 19–22 | Masterclass 08–09 | PR ≠ merge. CI poate pica; ce citești întâi? |
| 22–25 | Playground scena 04 | Produci conflict, explici markerii și rezolvi. |
| 25–30 | ARENA | Sprint de 10 întrebări, întrebările se încheie la răspunsul tuturor sau după timer; pentru 30 min poți reduce la 5 întrebări prin API/opțiunea configurată. |

## 45 minute · „interactive lab” (recomandat)

| Minut | Unde | Acțiune |
|---|---|---|
| 00–05 | Masterclass 01–03 | Versionare și staging, 3 predicții. |
| 05–12 | Playground scena 01 | Creezi commit și publici. Ce a rămas doar local? |
| 12–17 | Masterclass 05–06 | Remote, push/pull, branch. |
| 17–23 | Playground scena 02 | Creezi branch și `.gitignore`, apoi merge. |
| 23–28 | Masterclass 07–08 | Divergență, PR, code review. |
| 28–34 | Playground scena 03 | PR, approve, CI „green”, merge și pull. |
| 34–38 | Playground scena 04 | Conflict intenționat și rezolvare. |
| 38–45 | ARENA | 10 întrebări; podium. |

## 60 minute · „full masterclass”

| Minut | Unde | Acțiune |
|---|---|---|
| 00–08 | Masterclass 01–04 | Introducere, status, staging, commit; lasă studenții să voteze la fiecare predicție. |
| 08–16 | Playground 01 | Efectuează fiecare comandă în terminalul simulat. |
| 16–23 | Masterclass 05–06 | Remote, branches, HEAD și pointeri. |
| 23–30 | Playground 02 | Branch/merge/.gitignore, inspectare grafului. |
| 30–36 | Masterclass 07–09 | Merge, code review, GitHub Actions; de ce CI nu garantează absența bugurilor. |
| 36–42 | Playground 03 | Simulează PR și checks, apoi sincronizează local. |
| 42–49 | REAL GIT (localhost:8766) | Alice/Bob, două clone; conflict de merge **real** și `git log --graph`. |
| 49–60 | ARENA | 10–18 întrebări cu QR și leaderboard. |

## Trucuri de prezentare

* Deschide proiectorul la rezoluție 1080p, browser fullscreen (`F` în Masterclass). În Masterclass: săgețile ←/→ navighează, `P` ascunde/afișează notițe.
* Nu da comanda înainte de predicție. Întreabă mereu „unde este schimbarea ACUM?” și „de ce ar trebui să avem branch?”.
* Ține **dashboardul ARENA** doar pe proiector; studenții folosesc **/join** pe telefoane. Nu dezvălui linkul de host cu token privat.
* Dacă Wi-Fi izolează dispozitivele, **fallback:** QR nu va funcționa; folosește simularea offline și mini-quiz-ul individual. Poți folosi un host internet HTTPS dacă ai configurat unul din timp.
* Pentru demonstrație complet offline cu Git autentic, `bash demo-real.sh` funcționează și fără browser sau Wi-Fi.
* Reamintește că simulatorul folosește comenzi didactice, nu un shell adevărat; real Git are un server **local-only** separat.

## Rezultate așteptate de la studenți

1. Pot explica diferența dintre `git add`, `git commit` și `git push`.
2. Pot crea un branch cu `git switch -c` și îl pot integra cu `git merge`.
3. Pot explica de ce un PR aprobat nu este automat integrat.
4. Știu de ce GitHub Actions poate compila/testa automat codul C.
5. Înțeleg că un conflict se rezolvă prin alegerea conținutului corect, apoi staging și finalizarea merge-ului.

După demo, trimite pe Teams repo-ul și fișierul offline: pot experimenta individual fără riscul de a modifica un repo real. Exercițiile OCW rămân tema practică principală.
