# GIT//LAB 08 — ghid pentru demonstrație (USO, anul I)

> **Timp:** 12 minute pentru demo-ul vizual + opțional 4–6 minute de Git adevărat. Restul laboratorului rămâne pentru studenți. 
>
> **Material sursă:** USO, Laborator 08 — „Dezvoltarea aplicațiilor”, introducere Git/GitHub, primele commit-uri, branch-uri, merge, PR. Materialul OCW original folosește numele `master` și proiectul `array-sorting-algorithms`. Simulatorul folosește `main`, o denumire modernă uzuală. Comenzile sunt echivalente dacă înlocuiești numele branch-ului.

## Lansare în 10 secunde

**Varianta 1, cea mai ușoară:** deschide `GIT-LAB-08-OFFLINE.html` în Chrome / Firefox / Edge. Nu ai nevoie de rețea, Node, Python, extensii sau cont GitHub. Pentru distribuție prin Teams, trimite **doar acest fișier**. Fiecare student are o copie izolată, fără date partajate.

**Varianta 2, cu fișiere sursă:** deschide `index.html` din acest director; `styles.css` și `app.js` trebuie să rămână alături. 

**Varianta 3, demonstrând Git pe bune:** pe Linux, dintr-un terminal:

```bash
bash demo-real.sh
```

Scriptul creează numai un director temporar sub `/tmp/uso-git-real.XXXXXXXX`; folosește `git init`, `git push`, `git clone`, un merge fast-forward și apoi un conflict REAL între două clone. Remote-ul este un repository bare LOCAL, nu un cont GitHub. Nu schimbă configurația globală Git, nu suprascrie fișierele proiectelor existente și nu necesită internet. `--auto` elimină pauzele pentru testare rapidă.

## Scenariu la proiector (12 minute)

| Timp | Ce faci | Ce întrebi sala |
|---|---|---|
| 00:00–00:45 | Deschizi aplicația fullscreen (`⛶`). Introduci ideea: „Git = mașina timpului pentru proiecte”. | „Ați stricat vreodată un fișier și ați vrut versiunea de ieri?” |
| 00:45–03:20 | **01 First commit.** Rulezi comenzile recomandate din coloana Mission Control; arăți cum README trece `untracked → staged → committed → remote`. | „Dacă fac commit, vede colegul? De ce nu?” |
| 03:20–06:15 | **02 Parallel worlds.** Creezi `feature/ignore`, `.gitignore`, commit, revii pe main și dai merge; urmărești graful. | „Am copiat tot proiectul într-un alt folder când am creat branch-ul?” |
| 06:15–09:10 | **03 Pull request.** Un fișier C și README sunt preîncărcate. `git add .`, `commit`, `push`, `pr create`, `pr approve`, `ci run`, `pr merge`, apoi `pull`. | „PR-ul aprobat e deja în calculatorul meu?” |
| 09:10–11:30 | **04 Merge disaster.** `git pull origin main` produce conflict; arăți markerii în editor, rezolvi, `add`, `commit`, `log`. | „Poate Git să ghicească intenția ambilor oameni?” |
| 11:30–12:00 | **★ Boss fight.** Alegi 1–2 întrebări din quiz; restul le rămân studenților pentru Teams. | „Cine are încredere că ia 5/5?” |

**Important:** Misiunile sunt scenarii separate, presetate intenționat. Nu trebuie să termini o misiune ca să treci la următoarea. Butonul `RESET` resetează scenariul curent. Comenzile `pr create`, `pr approve`, `pr merge`, `ci run` și `resolve README.md` sunt inventate pentru simulator — **NU** sunt comenzi Git sau GitHub CLI. În practică PR-urile se gestionează din GitHub sau cu `gh pr ...` după autentificare.

**„CI” din browser este un mock.** Codul verifică prezența README și absența markerului `FAIL_CI`; nu compilează codul, nu rulează teste și nu trimite nimic la GitHub. În demonstrația reală, fișierul `bonus-github-actions/ci.yml` conține un workflow minimal pentru `bubble-sort.c`.

## Demo real în 5 minute (opțional, foarte potrivit după simulator)

Poți rula `bash demo-real.sh` ca demonstrație paralelă: o clonă pentru student, o clonă pentru coleg și un bare remote local. Scriptul face pauze între secvențe atunci când este interactiv. Studenții văd că un conflict real produce aceiași markeri ca în simulator. La final, `git log --oneline --graph --all --decorate` arată un merge commit cu doi părinți.

## Diferențele de comunicat față de OCW-ul original

- Materialul USO folosește implicit `master`; demo-ul folosește `main`. Numele branch-ului e configurabil, iar comenzile lucrează în același mod.
- Materialul arată ieșiri Git și pași UI mai vechi. În terminal contează **ideile și comenzile**, nu textul exact al output-ului sau poziția butoanelor pe GitHub.
- `git pull` înseamnă fetch + integrare, nu „descărcare fără consecințe”. Pentru proiectele actuale, e bine să discuți și despre politica de rebase vs merge, însă nu insista la anul I.
- Aprobarea unui PR și verificările CI nu sunt obligatorii în orice repo GitHub; în simulator le-am făcut obligatorii **ca regulă didactică**, pentru a evidenția rolurile lor. În GitHub real regula poate fi impusă prin branch protection/rulesets.
- Recomandare securitate: studenții nu ar trebui să proiecteze token-uri, parole sau chei pe ecran. Pentru autentificare reală folosește un mecanism acceptat de GitHub (de exemplu credential manager, `gh auth login` sau SSH), fără a insera token-uri în URL-uri distribuite.

## Cum continui laboratorul după demo

După cele 12–18 minute, studenții rezolvă exercițiile OCW pe **repository-uri reale**. Poți trimite `PROVOCARI-STUDENTI.md` împreună cu HTML-ul: este organizat pe dificultăți, are exerciții care se pot face fără GitHub, dar separă explicit provocarea PR care necesită GitHub.

Întrebări rapide de final:

1. Ce diferență este între working tree, staging, local repo și origin?
2. De ce două persoane pot avea istorice diferite după commit, înainte de push/pull?
3. Ce face `git switch -c feature/x` diferit de `git branch feature/x`?
4. Poate un PR să fie aprobat, dar să nu fie integrat? Da.
5. De ce nu ar trebui să urcăm executabile și fișiere `.o` într-un repo sursă?

## Verificări de funcționare

Simulatorul a fost verificat cu 6 teste automate Chromium/Playwright: commit/push, branch/merge, PR + review + CI + pull, conflict, editor/staging și quiz/responsive. `demo-real.sh --auto` a fost rulat cu Git 2.47.3 și a produs un conflict real rezolvat prin merge commit. Fișierul HTML este autonom, fără request-uri către CDN-uri. Dacă vrei să modifici codul, editează `index.html`, `styles.css`, `app.js`; apoi regenerează varianta monolitică HTML.
