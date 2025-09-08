import React, {
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
} from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import styles from "./YahooFinanceFinal.module.css";
import { IoMdClose } from "react-icons/io";


const API_BASE = "http://localhost:5000"; 
const DEFAULT_SYMBOLS = ["AAPL", "MSFT", "^GSPC", "^WIG20"];
const DEFAULT_RANGE = "5d";
const DEFAULT_INTERVAL = "5m";
const REFRESH_MS = 60_000;

function useDebounced(value, delay = 250) {
  const [v, setV] = React.useState(value);
  React.useEffect(() => {
    const id = setTimeout(() => setV(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return v;
}
const ALLOWED_INTERVALS = {
  "1d": ["1m", "2m", "5m", "15m"],
  "5d": ["1m", "2m", "5m", "15m"],
  "1mo": ["5m", "15m", "1d"],
  "3mo": ["5m", "15m", "1d"],
  "6mo": ["5m", "15m", "1d"],
  "1y": ["15m", "1d"],
};

const COLORS = [
  "#2563eb",
  "#16a34a",
  "#ef4444",
  "#a855f7",
  "#f59e0b",
  "#06b6d4",
  "#0ea5e9",
  "#10b981",
];

async function fetchChart(symbol, range, interval) {
  const params = new URLSearchParams({ symbol, range, interval });
  const res = await fetch(`${API_BASE}/api/yf/chart?${params.toString()}`);
  let json = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }

  if (!res.ok) {
    const msg =
      json && json.error ? json.error : `Błąd pobierania (${res.status})`;
    throw new Error(msg);
  }
  return Array.isArray(json) ? json : [];
}


function mergeByTime(seriesMap) {
  const timeSet = new Set();
  const maps = {};

  for (const [sym, arrRaw] of Object.entries(seriesMap || {})) {
    const arr = Array.isArray(arrRaw) ? arrRaw : [];
    const m = new Map();
    for (const p of arr) {
      if (p && typeof p.time === "number") {
        timeSet.add(p.time);
        m.set(p.time, p);
      }
    }
    maps[sym] = m;
  }

  const times = Array.from(timeSet).sort((a, b) => a - b);
  return times.map((t) => {
    const row = { time: t };
    for (const sym of Object.keys(maps)) {
      const p = maps[sym].get(t);
      if (p && typeof p.close === "number") row[sym] = p.close;
      else row[sym] = row[sym] ?? null;
    }
    return row;
  });
}

export default function YahooFinanceFinal() {
  const [symbols, setSymbols] = useState(DEFAULT_SYMBOLS);
  const [range, setRange] = useState(DEFAULT_RANGE);
  const [interval, setIntervalVal] = useState(DEFAULT_INTERVAL);
  const [data, setData] = useState([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState("");

  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [sLoading, setSLoading] = useState(false);
  const [sErr, setSErr] = useState("");
  const [highlight, setHighlight] = useState(-1);
  const debouncedQ = useDebounced(input, 250);
  const boxRef = useRef(null);
  const inputRef = useRef(null);

  
  useEffect(() => {
    const allowed =
      ALLOWED_INTERVALS[range] || ALLOWED_INTERVALS[DEFAULT_RANGE];
    if (!allowed.includes(interval)) setIntervalVal(allowed[0]);
  }, [range]); 

  const popular = useMemo(
    () => [
      {
        symbol: "AAPL",
        name: "Apple Inc.",
        exchange: "NASDAQ",
        type: "Equity",
      },
      {
        symbol: "MSFT",
        name: "Microsoft Corporation",
        exchange: "NASDAQ",
        type: "Equity",
      },
      {
        symbol: "TSLA",
        name: "Tesla, Inc.",
        exchange: "NASDAQ",
        type: "Equity",
      },
      { symbol: "^GSPC", name: "S&P 500", exchange: "INDEX", type: "Index" },
      { symbol: "^WIG20", name: "WIG20", exchange: "GPW", type: "Index" },
    ],
    []
  );
  useEffect(() => {
    function onDocClick(e) {
      if (!boxRef.current) return;
      if (!boxRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);
  const lines = useMemo(() => symbols.map((s) => ({ key: s })), [symbols]);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const q = debouncedQ.trim();
      if (!q) {
        setSuggestions(popular);
        return;
      }
      setSErr("");
      setSLoading(true);
      try {
        const res = await fetch(
          `${API_BASE}/api/yf/search?q=${encodeURIComponent(q)}`
        );
        const ct = res.headers.get("content-type") || "";
        if (!ct.includes("application/json")) throw new Error("Nie-JSON z API");
        const json = await res.json();
        setSuggestions(Array.isArray(json) ? json : []);
      } catch (e) {
        setSErr(e.message || String(e));
        setSuggestions([]);
      } finally {
        setSLoading(false);
      }
    })();
  }, [debouncedQ, open, popular]);

  const selectSymbol = (sym) => {
    if (!sym) return;
    setSymbols((prev) => (prev.includes(sym) ? prev : [...prev, sym]));
    setInput("");
    setOpen(false);
   
  };
  const onInputKeyDown = (e) => {
    if (!open && (e.key === "ArrowDown" || e.key === "Enter")) setOpen(true);
    if (!open) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, (suggestions?.length || 1) - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = suggestions[highlight] || suggestions[0];
      if (item) selectSymbol(item.symbol);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const add1 = () => {
    const s = input.trim().toUpperCase();
    if (s) selectSymbol(s);
  };

  const refresh = useCallback(async () => {
    setErr("");
    setLoading(true);
    const map = {};
    await Promise.all(
      symbols.map(async (s) => {
        try {
          const series = await fetchChart(s, range, interval);
          map[s] = Array.isArray(series) ? series : [];
        } catch (e) {
          setErr((prev) => prev || `${s}: ${e.message || e}`);
          map[s] = [];
        }
      })
    );
    const merged = mergeByTime(map);
    setData(merged);
    setLoading(false);
  }, [symbols, range, interval]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, REFRESH_MS);
    return () => clearInterval(id);
  }, [refresh]);

  const add = () => {
    const s = input.trim().toUpperCase();
    if (s && !symbols.includes(s)) setSymbols((prev) => [...prev, s]);
    setInput("");
  };
  const remove = (s) => setSymbols((prev) => prev.filter((x) => x !== s));

  const allowed = ALLOWED_INTERVALS[range] || ALLOWED_INTERVALS[DEFAULT_RANGE];

  return (
    <section>
      <div className={styles.controls}>
        <div className={styles.addBox} ref={boxRef}>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setHighlight(-1);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onInputKeyDown}
            placeholder="Dodaj ticker (np. TSLA, ^WIG20)"
            className={styles.input}
            autoComplete="off"
          />
          <button onClick={add1} className={styles.button} disabled={loading}>
            Dodaj
          </button>

          {open && (
            <div className={styles.dropdown}>
              {sLoading && (
                <div className={styles.dropdownRowMuted}>Szukam…</div>
              )}
              {sErr && (
                <div className={styles.dropdownRowError}>Błąd: {sErr}</div>
              )}
              {!sLoading && !sErr && suggestions.length === 0 && (
                <div className={styles.dropdownRowMuted}>Brak wyników</div>
              )}
              {!sLoading &&
                !sErr &&
                suggestions.map((it, idx) => (
                  <div
                    key={`${it.symbol}-${idx}`}
                    className={`${styles.dropdownRow} ${
                      idx === highlight ? styles.active : ""
                    }`}
                    onMouseDown={(e) => e.preventDefault()} // żeby blur inputu nie zamknął za wcześnie
                    onClick={() => selectSymbol(it.symbol)}
                    onMouseEnter={() => setHighlight(idx)}
                    title={`${it.name || ""} • ${it.exchange || ""} • ${
                      it.type || ""
                    }`}
                  >
                    <span className={styles.sym}>{it.symbol}</span>
                    <span className={styles.meta}>
                      {it.name || it.symbol}
                      {it.exchange ? ` • ${it.exchange}` : ""}
                      {it.type ? ` • ${it.type}` : ""}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </div>
        <div className={styles.symbols}>
          {symbols.map((s) => (
            <span
              key={s}
              className={styles.symbolTag}
              onClick={(e) => {
                e.target.classList.toggle(styles.green);

                const elements = document.querySelectorAll(
                  `.${styles.symbolTag}`
                );
                const timelaps = document.querySelector("#time").value;
                localStorage.setItem(
                  "currentPointer",
                  e.currentTarget.textContent
                );
                localStorage.setItem("timelaps", timelaps);

                window.dispatchEvent(new Event("getCurrentPointer"));

                elements.forEach((el) => {
                  if (!(el.textContent === e.target.textContent)) {
                    el.classList.remove(styles.green);
                  }
                });
              }}
            >
              {s}
              <button
                onClick={() => remove(s)}
                className={styles.removeBtn}
                title="Usuń"
              >
                <IoMdClose />
              </button>
            </span>
          ))}
        </div>
        <div className={styles.selects}>
          <select
            value={range}
            onChange={(e) => setRange(e.target.value)}
            className={styles.select}
            disabled={loading}
            id="time"
          >
            <option value="1d">1d</option>
            <option value="5d">5d</option>
            <option value="1mo">1mo</option>
            <option value="3mo">3mo</option>
            <option value="6mo">6mo</option>
            <option value="1y">1y</option>
          </select>
        </div>
      </div>

      <div className={styles.chartBox}>
        <ResponsiveContainer width="100%" height={420}>
          <LineChart
            data={data}
            margin={{ top: 8, right: 16, bottom: 8, left: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="time"
              type="number"
              scale="time"
              domain={["dataMin", "dataMax"]}
              tickFormatter={(t) =>
                new Date(t).toLocaleString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  month: "2-digit",
                  day: "2-digit",
                })
              }
            />
            <YAxis
              width={70}
              tickFormatter={(v) => (v ?? 0).toFixed?.(2) || v}
            />
            <Tooltip
              labelFormatter={(t) =>
                new Date(t).toLocaleString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  month: "2-digit",
                  day: "2-digit",
                })
              }
            />
            <Legend />
            {lines.map((l, i) => (
              <Line
                key={l.key}
                dataKey={l.key}
                type="monotone"
                dot={false}
                strokeWidth={2}
                connectNulls
                stroke={COLORS[i % COLORS.length]}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className={styles.footerRow}>
        {loading && <span className={styles.muted}>Ładowanie…</span>}
        {err && <span className={styles.error}>Błąd: {err}</span>}
        {data.length === 0 && !loading && !err && (
          <span className={styles.muted}>
            Brak danych do wyświetlenia dla tej kombinacji zakres/interwał.
          </span>
        )}
      </div>
    </section>
  );
}
