# North Haven Radio Voice Demo

Run from this folder:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

The page uses browser `speechSynthesis` voices and Open-Meteo weather data. It includes male/female voice selectors, rate and pitch calibration, current time, current temperature, today's forecast, a four-day forecast, a complete short radio break, and custom lines.

Suggested starting points:

- Male: rate 0.84–0.92, pitch 0.88–0.96
- Female: rate 0.86–0.94, pitch 0.96–1.03

The exact installed voice matters more than the sliders.
