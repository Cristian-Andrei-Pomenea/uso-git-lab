# ⌁ GIT//LAB 08 — THE GIT UNIVERSE

**Masterclass Git + GitHub pentru USO (anul I): laborator live, simulare, Git real și quiz multiplayer în stil Kahoot.**

> Din laboratorul [USO 08 — Dezvoltarea aplicațiilor](https://ocw.cs.pub.ro/courses/uso/laboratoare/laborator-08). Exemplul didactic folosește un proiect cu algoritmi de sortare în C. Codul este independent de RONews.

## Intră direct în experiență

| Experiență | Acces | Ce oferă |
| --- | --- | --- |
| **Masterclass** | `http://127.0.0.1:8798/masterclass.html` | 10 capitole animate, predicții, note pentru profesor, shortcut-uri, XP |
| **Git Playground** | `http://127.0.0.1:8798/index.html` | graf de commit-uri animat, terminal **simulat**, stage/commit/branch/merge/PR/conflict |
| **ARENA live / profesor** | `http://127.0.0.1:8798/arena` | PIN, QR, întrebări live, leaderboard și scoring pe server |
| **ARENA / student** | QR afișat de profesor sau `http://<IP-PC>:8798/join` | nickname, răspunsuri mobile, feedback și XP |
| **Git real / Alice & Bob** | `http://127.0.0.1:8766/real-git.html` | `git` autentic, două clone și un remote *bare*, conflict de merge într-un director temporar |
| **Demo offline** | `GIT-LAB-08-OFFLINE.html` | simulator cu patru scenarii + quiz individual, un singur fișier HTML |

### Pornire rapidă, în laborator (Linux, Python 3.10+)

```bash
git clone https://github.com/Cristian-Andrei-Pomenea/uso-git-lab.git
cd uso-git-lab
python3 live_quiz_server.py --host 0.0.0.0 --port 8798
```

Pe laptop deschizi **http://127.0.0.1:8798/arena** și apeși **CREATE LIVE SESSION**. Proiectezi QR-ul. Studenții trebuie să poată ajunge la laptop prin rețeaua Wi-Fi (fără *client isolation*). Dacă QR-ul nu se deschide, verifică adresa/IP-ul afișat în terminal și firewall-ul. **Nu este nevoie de Node, npm sau conturi pentru studenți.** Bibliotecă QR este inclusă, cu licența originală în `vendor/QRCODE-LICENSE.txt`.

Într-un terminal separat, **numai pe laptopul profesorului**:

```bash
python3 real_git_server.py --no-browser
# deschide http://127.0.0.1:8766/real-git.html
```

Serverul de Git real ascultă **exclusiv pe 127.0.0.1**, este separat de quiz și permite doar comenzi selectate într-un sandbox temporar. Nu îl expune la internet.

Dacă ești fără acces la rețea, deschide direct `GIT-LAB-08-OFFLINE.html`; quiz-ul din acel fișier este **individual**, nu multiplayer.

### Cum rulează jocul multiplayer

1. Profesorul alege **10 / 18 întrebări** și **20–45 secunde**; serverul generează un PIN de 6 cifre și un token privat de profesor.
2. Fiecare student intră din QR cu un nickname. Profesorul vede live participanții în lobby.
3. Profesorul lansează întrebarea; răspunsurile sunt validate de server, **un răspuns per participant/întrebare**.
4. Răspunsul corect câștigă aproximativ **500–1000 XP**, în funcție de timpul rămas; greșitul **0 XP**. Întrebarea se încheie la expirarea timpului sau după ce toți jucătorii au răspuns.
5. Profesorul dezvăluie explicația, distribuția răspunsurilor, clasamentul și podiumul. Jocul avansează la comandă.

Nu există conturi și nici bază de date. Sesiunile sunt ținute **în memoria unui singur proces**; repornirea serverului le șterge. Codul întrebărilor este `questions.json` și nu este publicat prin serverul web în timpul jocului.

### Quiz prin internet, din afara rețelei locale

GitHub Pages **nu** poate găzdui backend-ul Python necesar sesiunilor multiplayer. Publică aplicația pe un server Python accesibil prin HTTPS (un singur proces, cu trafic rutat pe portul `PORT`) sau printr-un tunel HTTPS de încredere spre laptop. Exemple de configurare:

```bash
# Exemplu generic de proces pentru un host Python cu HTTPS în față
export PORT=8798
export PUBLIC_URL=https://adresa-ta-publica.example
export ARENA_ADMIN_KEY='o-cheie-lunga-unica-secretă'
python3 live_quiz_server.py --host 0.0.0.0 --port "$PORT" --public-url "$PUBLIC_URL"
```

În dashboard, profesorul introduce `ARENA_ADMIN_KEY` **doar la creare**, într-un câmp de parolă. Nu pune cheia în repository, URL, capturi de ecran sau pe Teams. Pe rețeaua locală, crearea sesiunii de pe `localhost` funcționează fără cheie. Pentru un deploy public, folosește **HTTPS** și o singură instanță (starea este exclusiv în RAM); aplicația este concepută pentru un laborator, nu pentru un serviciu internet comercial. Dacă un host cloud intră în standby/repornește, sesiunile se pierd. Pune la dispoziția studenților **doar linkul de join**, niciodată tokenul profesorului.

## Plan de predare

Vezi **[MASTERCLASS-PROFESOR.md](MASTERCLASS-PROFESOR.md)** pentru trei variante, de 30, 45 și 60 de minute, cu exact ce să demonstrezi și ce să îi întrebi. Alte exerciții: **[PROVOCARI-STUDENTI.md](PROVOCARI-STUDENTI.md)**.

- 10 slide-uri navigabile cu grafuri, exemple, mini-provocări și notițe pentru profesor.
- 4 scenarii interactive cu comandă introdusă în terminalul simulat.
- Experimente real Git cu Alice/Bob și observarea `git status`, `git log --graph` și a conflictului de merge.
- Final „boss fight” în ARENA, cu QR și clasament.

> **Atenție pedagogică:** `pr create`, `pr approve`, `pr merge`, `ci run`, `resolve README.md` din simulator sunt **comenzi inventate pentru interfața educațională**. Git-ul real nu le recunoaște. În practică, PR-urile se fac în GitHub UI sau cu `gh pr create`; CI se configurează prin `.github/workflows/*.yml`. Masterclass-ul indică explicit această diferență.

Materialul OCW prezintă adesea `master`; această versiune folosește `main` (ambele sunt doar nume de branch).

## Calitate și teste

```bash
python3 -m pip install pytest  # doar pentru teste, nu pentru rularea serverelor
python3 -m pytest -q tests/test_arena.py tests/test_demo.py tests/test_real_git.py
bash demo-real.sh --auto
```

Testele de interfață pentru simulator necesită **Playwright + Chromium instalat**; backend-ul, securitatea API și real Git au teste fără browser. CI rulează verificările care nu necesită browser instalat. JavaScript poate fi verificat cu `node --check app.js` etc., dacă ai Node.

Componentele sunt cu funcții distincte: simulatorul nu execută comenzi, sandboxul Git real nu acceptă shell arbitrar, iar serverul ARENA servește exclusiv asset-uri allowlisted.
