# Service Order — Songs Dashboard

This workspace includes a simple extractor and a static dashboard to analyze songs used in Sunday services.

How to use the dashboard with the provided CSV data:

1. Open `service-order.html` in a browser.

2. If your browser blocks local CSV fetches, serve the folder from a local web server, for example:

```powershell
python -m http.server 8000
```

3. Visit `http://localhost:8000/service-order.html`.

Notes

- The dashboard now loads `song_occurrences.csv` and `unique_songs.csv` directly.
- Hymnal metadata is derived from `unique_songs.csv`: songs with a hymnal number are treated as hymnal, and songs marked as Majesty hymns are treated as `other_book`.
