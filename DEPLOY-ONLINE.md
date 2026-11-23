# ARENA online — ghid de publicare pentru laborator

**Masterclass + Playground + quiz multiplayer funcționează deja cu serverul Python local.**
Pentru ca studenții să se conecteze direct de pe date mobile, ai nevoie de un server HTTPS public.
GitHub Pages nu poate găzdui singur backend-ul multiplayer.

## Calea A — în aceeași rețea Wi-Fi (imediat)

```bash
python3 live_quiz_server.py --host 0.0.0.0 --port 8798
```

Profesor: `http://127.0.0.1:8798/arena` — aici creezi PIN-ul și QR-ul.
Student: scanează QR-ul; telefonul trebuie să ajungă la IP-ul laptopului pe portul 8798.
Dacă Wi-Fi-ul universității izolează clienții sau firewall-ul blochează portul, folosește calea B.

## Calea B — public, HTTPS, fără laptop ca server (Render)

1. Conectează GitHub în [Render Dashboard](https://dashboard.render.com/).
2. Alege **New → Blueprint** și repository-ul `Cristian-Andrei-Pomenea/uso-git-lab`.
3. Confirmă serviciul definit în `render.yaml`: `runtime: docker`, regiunea Frankfurt, un singur proces.
4. Render generează secretul **ARENA_ADMIN_KEY**. Deschide variabila în dashboard și folosește-o în formularul de profesor. **Nu distribui această cheie studenților.**
5. Deschide `https://<numele-serviciului>.onrender.com/arena`, creează sesiunea și verifică QR-ul pe un telefon cu *date mobile*.
6. Trimite studenților numai linkul `/join?pin=...` sau QR-ul. Poți distribui separat `/masterclass.html` și `/index.html` pentru explorare individuală.

Render expune automat `RENDER_EXTERNAL_HOSTNAME`; serverul îl transformă în adresa HTTPS folosită în QR. Dacă folosești un domeniu personalizat, setează `PUBLIC_URL=https://domeniul-tau` în variabilele serviciului.

**Limitări importante:** planul gratuit se poate opri după 15 minute fără trafic; la repornire se pierd sesiunea și scorurile fiindcă sunt păstrate doar în RAM. Pentru o sesiune de laborator, deschide profesorul înainte de intrarea studenților. Nu rula mai multe instanțe ale serverului fără stocare partajată. Nu publica niciodată serverul separat `real_git_server.py` pe internet.

## Test rapid după deploy

- `/api/health` trebuie să întoarcă `{"ok":true,...}`.
- `/arena` trebuie să creeze o sesiune folosind cheia admin.
- Linkul din QR trebuie să fie HTTPS, cu domeniul Render, nu `localhost`/IP privat.
- De pe două dispozitive, răspunsurile trebuie să modifice clasamentul profesorului.

## Calea C — tunel HTTPS către laptop

Poți folosi un tunel HTTPS de încredere. Pornește serverul cu
`PUBLIC_URL=https://adresa-publica-a-tunelului` pentru a genera QR corect.
Setează și `ARENA_ADMIN_KEY` dacă profesorul creează sesiuni prin domeniul public, din alt dispozitiv.
Nu expune endpoint-ul de Git real pe tunel.
