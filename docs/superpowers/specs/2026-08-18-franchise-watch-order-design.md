# Franchise watch-order recommendations

## Decisions

- At **3+ personal movies** from a detected franchise keyword (MCU, Star Wars, Wizarding World, Middle-earth, Fast & Furious, James Bond, DC Universe), show a **numbered first-watch path**.
- **Star Wars** and **MCU** use curated movie-only sequences (Star Wars 4–5–6, 1–2–3, 7–8–9; MCU theatrical release).
- Other detected franchises use TMDB keyword discover sorted by release year.
- The path includes **all saga titles**, including ones already on My list or Shared (`On your list`, no add buttons).
- Provider lookups skip titles already on a list.
- Collection leftovers (2+ John Wick, etc.) remain; collections overlapping a watch path are hidden.
- Franchise keyword leftovers at exactly 2 seeds still use the existing grid recs.
- Unlock still requires 10 personal titles.
