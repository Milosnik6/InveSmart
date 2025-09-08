import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend,
} from "recharts";
import styles from "./YahooFinanceDemo.module.css";


const DEFAULT_SYMBOLS = ["^WIG20"];   
const FIXED_RANGE = "1d";             
const FIXED_INTERVAL = "15m";        


function seedFromString(s) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function rng(seed) {
  let x = seed >>> 0;
  return () => {
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    return ((x >>> 0) / 4294967296);
  };
}
function minutesForInterval(interval) {
  if (interval.endsWith("m")) return parseInt(interval, 10);
  if (interval === "2y") return 60 * 24;
  return 5;
}
function daysForRange(range) {
  const map = { "1d":1, "5d":5, "1mo":30, "3mo":90, "6mo":180, "1y":365 };
  return map[range] ?? 1;
}


function generateSeries(symbol, range = "1d", interval = "15m") {
  const days = daysForRange(range);
  let stepMin = minutesForInterval(interval);

  const points = [];
  const now = Date.now();
  const start = now - days * 24 * 60 * 60 * 1000;
  const base = 2000; 
  const prng = rng(seedFromString(symbol + range + interval));
  let price = base;

  for (let t = start; t <= now; t += stepMin * 60 * 1000) {
    const dt = new Date(t);
    const h = dt.getHours(), m = dt.getMinutes();
    const isIntraday = true; 

    if (isIntraday) {
      
      const day = dt.getDay();
      if (day === 0 || day === 6) continue;
      
      const inRTH = (h >= 9 && h <= 17);
      
      if (!inRTH && (h % 2 !== 0 || m !== 0)) continue;
    }

    const drift = (prng() - 0.5) * 1.5;  
    const noise = (prng() - 0.5) * 6.0;  
    const trend = Math.sin((t - start) / (1000 * 60 * 60) * Math.PI * 0.25) * 3.0;

    price = Math.max(1, price + drift + noise + trend);
    points.push({ time: t, close: Number(price.toFixed(2)) });
  }

  if (points.length === 0) {
    points.push({ time: now, close: Number(base.toFixed(2)) });
  }
  return points;
}

function mergeByTime(seriesMap) {
  const allTimes = new Set();
  Object.values(seriesMap).forEach(arr => arr.forEach(p => allTimes.add(p.time)));
  const times = Array.from(allTimes).sort((a,b)=>a-b);
  return times.map(t => {
    const row = { time: t };
    for (const [sym, arr] of Object.entries(seriesMap)) {
      const p = arr.find(x => x.time === t);
      if (p) row[sym] = p.close;
    }
    return row;
  });
}

const COLORS = ["#2563eb", "#16a34a", "#ef4444", "#a855f7", "#f59e0b", "#06b6d4"];


export default function YahooFinanceDemo() {
  const [symbols] = useState(DEFAULT_SYMBOLS);
  const [data, setData] = useState([]);
  const [info, setInfo] = useState("");

  const lines = useMemo(() => symbols.map(s => ({ key: s })), [symbols]);

  const refresh = useCallback(() => {
    const map = {};
    symbols.forEach((s) => { map[s] = generateSeries(s, FIXED_RANGE, FIXED_INTERVAL); });
    setData(mergeByTime(map));
    setInfo(`DEMO: ^WIG20 — ostatnie 24h (${FIXED_RANGE}, ${FIXED_INTERVAL})`);
  }, [symbols]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 60_000); 
    return () => clearInterval(id);
  }, [refresh]);

  return (
    <section>
      <div className={styles.chartBox}>
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="time"
              type="number"
              scale="time"
              domain={["dataMin", "dataMax"]}
              tickFormatter={(t) =>
                new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
              }
            />
            <YAxis width={70} tickFormatter={(v)=> (v ?? 0).toFixed?.(2) || v} />
            <Tooltip
              labelFormatter={(t) =>
                new Date(t).toLocaleString([], { hour: "2-digit", minute: "2-digit", month:"2-digit", day:"2-digit" })
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

      <p className={styles.info}>{info}</p>
    </section>
  );
}
