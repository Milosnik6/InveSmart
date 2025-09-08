import React, { useEffect, useMemo, useState } from "react";
import styles from "./Pointers.module.css";

/** Jeśli nie używasz proxy Vite, wstaw pełny adres backendu */
const API_BASE = "http://localhost:5000";

/** Bezpieczne pobranie serii */
async function fetchSeries(symbol, range, interval) {
  const params = new URLSearchParams({ symbol, range, interval });
  const res = await fetch(`${API_BASE}/api/yf/chart?${params.toString()}`);
  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("application/json"))
    throw new Error("API zwróciło nie-JSON");
  const json = await res.json();
  return Array.isArray(json) ? json : [];
}

/** złączenie po czasie (tylko wspólne punkty) */
function mergeEqualWeight(seriesMap) {
  // mapy: symbol -> Map(time -> close)
  const maps = {};
  const timeCount = new Map();

  Object.entries(seriesMap).forEach(([sym, arr]) => {
    const m = new Map();
    (arr || []).forEach((p) => {
      if (p && typeof p.time === "number" && typeof p.close === "number") {
        m.set(p.time, p.close);
        timeCount.set(p.time, (timeCount.get(p.time) || 0) + 1);
      }
    });
    maps[sym] = m;
  });

  const symbols = Object.keys(maps);
  if (symbols.length === 0) return [];

  // tylko czasy, gdzie mamy dane dla wszystkich symboli (equal-weight)
  const times = Array.from(timeCount.entries())
    .filter(([, cnt]) => cnt === symbols.length)
    .map(([t]) => t)
    .sort((a, b) => a - b);

  return times.map((t) => {
    const row = { time: t };
    let sum = 0;
    symbols.forEach((sym) => {
      sum += maps[sym].get(t);
    });
    row.close = sum / symbols.length; // średnia cena jako proxy portfela równoważonego
    return row;
  });
}

/** obliczenie metryk: zwrot skumulowany, ryzyko (σ), Sharpe */
function computeMetrics(series) {
  if (!Array.isArray(series) || series.length < 2) {
    return { ret: 0, risk: 0, sharpe: 0 };
  }
  // proste stopy zwrotu z cen portfela
  const rets = [];
  for (let i = 1; i < series.length; i++) {
    const p0 = series[i - 1].close;
    const p1 = series[i].close;
    if (p0 > 0 && Number.isFinite(p0) && Number.isFinite(p1)) {
      rets.push(p1 / p0 - 1);
    }
  }
  if (rets.length === 0) return { ret: 0, risk: 0, sharpe: 0 };

  const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
  const variance =
    rets.reduce((s, r) => s + Math.pow(r - mean, 2), 0) /
    (rets.length - 1 || 1);
  const stdev = Math.sqrt(variance);

  const cumulative = series.at(-1).close / series[0].close - 1;

  // Sharpe z Rf = 0 w jednostce interwału (bez annualizacji)
  const sharpe = stdev > 0 ? mean / stdev : 0;

  return { ret: cumulative, risk: stdev, sharpe };
}

export default function Pointers({ range = "5d", interval = "1d" }) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [metrics, setMetrics] = useState({ ret: 0, risk: 0, sharpe: 0 });
  const [symbols, setSymbol] = useState(["AAPL"]);
  const [time, setTime] = useState("5d");
  const titleRange = useMemo(() => `${time} / ${interval}`, [time, interval]);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        setErr("");
        setLoading(true);
        const map = {};
        // pobierz serie równolegle
        await Promise.all(
          (symbols || []).map(async (s) => {
            try {
              map[s] = await fetchSeries(s, time, interval);
            } catch (e) {
              map[s] = [];
              if (!err) setErr(`${s}: ${e.message || e}`);
            }
          })
        );
        if (cancel) return;
        const portfolio = mergeEqualWeight(map);
        setMetrics(computeMetrics(portfolio));
      } catch (e) {
        if (!cancel) setErr(e.message || String(e));
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [symbols, time, interval]); // odśwież przy zmianie

  const pct = (x) => `${(x * 100).toFixed(2)}%`;

  window.addEventListener("getCurrentPointer", function () {
    setSymbol([localStorage.getItem("currentPointer")]);
    setTime(localStorage.getItem("timelaps"));
    console.log(localStorage.getItem("timelaps"));
  });

  return (
    <div className={styles.wrap}>
      <h3 className={styles.h3}>Wskaźniki portfela (equal-weight)</h3>
      <div className={styles.caption}>
        Zakres: <b>{titleRange}</b> &nbsp;|&nbsp; Tickers:{" "}
        <b>{symbols.join(", ") || "—"}</b>
      </div>

      {err && <div className={styles.error}>Błąd: {err}</div>}
      {loading && <div className={styles.muted}>Liczenie…</div>}

      <div className={styles.cards}>
        <div className={styles.card}>
          <div className={styles.label}>Zwrot</div>
          <div className={styles.value}>{pct(metrics.ret)}</div>
        </div>
        <div className={styles.card}>
          <div className={styles.label}>Ryzyko (σ)</div>
          <div className={styles.value}>{pct(metrics.risk)}</div>
        </div>
        <div className={styles.card}>
          <div className={styles.label}>Sharpe</div>
          <div className={styles.value}>{metrics.sharpe.toFixed(2)}</div>
        </div>
      </div>

      <div className={styles.explainer}>
        <p>
          <b>Zwrot</b> — skumulowana stopa zwrotu portfela równoważonego z
          wybranych akcji w analizowanym okresie (ostatnia cena / pierwsza − 1).
        </p>
        <p>
          <b>Ryzyko (σ)</b> — odchylenie standardowe szeregu stóp zwrotu
          (zmienność) obliczanych z kolejnych punktów czasowych.
        </p>
        <p>
          <b>Sharpe</b> — średnia stopa zwrotu podzielona przez zmienność (σ),
          liczona w tej samej częstotliwości co dane (tu przyjęto stopę wolną od
          ryzyka Rf=0).
        </p>
        <p className={styles.note}>
          Uwaga: do portfela stosujemy wagi równe. Dla długich zakresów Yahoo
          zwykle zwraca dane dzienne — wtedy Sharpe dotyczy „dziennych” stóp
          zwrotu; dla intraday (1d/5d) jest liczony w częstotliwości intraday.
        </p>
      </div>
    </div>
  );
}
