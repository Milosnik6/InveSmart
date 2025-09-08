// Prosty serwer Node.js + Express
// uruchom: npm run dev (nodemon) lub npm start

const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");
const yf = require("yahoo-finance2").default;
const connection = require("./db"); // mysql2/promise pool

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ----- Middleware -----
app.use(
  cors({
    origin: ["http://localhost:3000", "http://127.0.0.1:3000"], // dopasuj do frontu
  })
);
app.use(express.json()); // JSON body parser
app.use(express.urlencoded({ extended: true })); // x-www-form-urlencoded

// ===== Helpers =====
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").toLowerCase());
}

// ===== Rejestracja =====
app.post("/register", async (req, res) => {
  try {
    // obsłuż obie formy: { form: {...} } albo płaski obiekt
    const payload = req.body?.form ?? req.body;
    const { firstName, lastName, email, password, repeatPassword } = payload;
    if (!firstName || !lastName || !email || !password || !repeatPassword) {
      return res.status(400).json({ error: "puste pola" });
    }
    if (password !== repeatPassword) {
      return res.status(400).json({ error: "różne hasła" });
    }

    const [user] = await connection.query(
      "select * from uzytkownicy where email = ?",
      [email]
    );
    if (user.length > 0) {
      return res.status(400).json({ error: "użytkownik już istnieje" });
    }
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(password, salt);
    await connection.query(
      "INSERT INTO `uzytkownicy` (`id`, `imie`, `nazwisko`, `email`, `haslo_hash`, `rola`) VALUES (NULL, ?, ?, ?, ?, 'user')",
      [firstName, lastName, email, hash]
    );
    res.json({ info: "Zajerestrowano pomyślnie" });
  } catch (err) {
    if (err && err.code === "ER_DUP_ENTRY") {
      return res
        .status(409)
        .json({ error: "Użytkownik z tym e-mailem już istnieje" });
    }
    console.error("Błąd /register:", err);
    return res.status(500).json({ error: "Błąd serwera" });
  }
});
app.post("/login", async (req, res) => {
  let { email, password } = req.body;
  console.log(password);

  if (!email || !password) {
    res.json({ error: "Puste pola" });
    return;
  }

  try {
    const [result] = await connection.query(
      "SELECT * FROM uzytkownicy WHERE email = ?",
      [email]
    );

    if (result.length === 0) {
      return res.status(400).json({ error: "Użytkownik nie istnieje" });
    }
    console.log(result);
    const hash = result[0].haslo_hash;
    const user = result[0];

    const isCorrect = await bcrypt.compare(password, hash);
    if (!isCorrect) {
      return res.status(400).json({ error: "Niepoprawne dane logowania" });
    }

    res.json({
      info: "Zalogowano",
      user: {
        id: user.id,
        email: user.email,
        imie: user.imie,
        nazwisko: user.nazwisko,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Wewnętrzny błąd serwera" });
  }
});
// helpery
const RANGE_DAYS = {
  "1d": 1,
  "5d": 5,
  "1mo": 30,
  "3mo": 90,
  "6mo": 180,
  "1y": 365,
};

app.get("/api/yf/chart", async (req, res) => {
  try {
    const symbol = decodeURIComponent(req.query.symbol || "");
    let { range = "5d", interval = "5m" } = req.query;
    if (!symbol)
      return res.status(400).json({ error: "Parametr ?symbol jest wymagany" });
    if (!RANGE_DAYS[range]) range = "5d";

    const mapChart = (r) =>
      (r?.quotes || []).map((q) => ({
        time: (q.date || new Date()).getTime(),
        close: q.close,
        open: q.open,
        high: q.high,
        low: q.low,
        volume: q.volume,
      }));
    const mapHist = (arr) =>
      (arr || []).map((h) => ({
        time: new Date(h.date).getTime(),
        close: h.close,
        open: h.open,
        high: h.high,
        low: h.low,
        volume: h.volume,
      }));

    let out = [];

    // 1) chart z podanym zakresem/interwałem
    try {
      const r1 = await yf.chart(symbol, {
        range,
        interval,
        includePrePost: true,
      });
      out = mapChart(r1);
      console.log(`[yf.chart] ${symbol} ${range}/${interval} -> ${out.length}`);
    } catch (e) {
      console.warn(
        `[yf.chart] error ${symbol} ${range}/${interval}:`,
        e?.message || e
      );
    }

    // 2) fallback: bezpieczny wariant
    if (!out.length) {
      const alt = ["1d", "5d"].includes(range)
        ? { range: "5d", interval: "15m" }
        : { range: "1mo", interval: "1d" };
      try {
        const r2 = await yf.chart(symbol, { ...alt, includePrePost: true });
        out = mapChart(r2);
        console.log(
          `[yf.chart-fallback] ${symbol} ${alt.range}/${alt.interval} -> ${out.length}`
        );
      } catch (e) {
        console.warn(`[yf.chart-fallback] error ${symbol}:`, e?.message || e);
      }
    }

    // 3) daily EOD
    if (!out.length) {
      const now = Date.now();
      const period2 = new Date(now);
      const period1 = new Date(now - RANGE_DAYS[range] * 24 * 60 * 60 * 1000);
      try {
        const hist = await yf.historical(symbol, { period1, period2 });
        out = mapHist(hist);
        console.log(`[yf.historical] ${symbol} ${range} -> ${out.length}`);
      } catch (e) {
        console.warn(`[yf.historical] error ${symbol}:`, e?.message || e);
      }
    }

    // 4) ostatnia deska: quote()
    if (!out.length) {
      try {
        const q = await yf.quote(symbol);
        if (q?.regularMarketPrice) {
          out = [
            {
              time: Date.now(),
              close: q.regularMarketPrice,
              open: q.regularMarketOpen ?? q.regularMarketPrice,
              high: q.regularMarketDayHigh ?? q.regularMarketPrice,
              low: q.regularMarketDayLow ?? q.regularMarketPrice,
              volume: q.regularMarketVolume ?? null,
            },
          ];
          console.log(`[yf.quote] ${symbol} -> 1`);
        }
      } catch (e) {
        console.warn(`[yf.quote] error ${symbol}:`, e?.message || e);
      }
    }

    res.json(out);
  } catch (e) {
    console.error("YF /chart fatal:", e);
    res.status(500).json({ error: "Błąd pobierania z Yahoo Finance" });
  }
});

app.post("/get-wallet", async (req, res) => {
  const { id } = req.body.user || req.body;
  const [user] = await connection.query(
    "select * from portfel where id_uzytkownika = ?",
    [id]
  );
  return res.json(user);
});
app.post("/set-wallet", async (req, res) => {
  const { id, amount, type } = req.body;
  if (!id || !amount || !type) {
    return res.status(400).json({ info: "Puste pola" });
  }
  const [wallet] = await connection.query(
    "update portfel set wartosc_portfela = wartosc_portfela + ? where id_uzytkownika = ?",
    [amount, id]
  );
  console.log(wallet.affectedRows);
  if (wallet.affectedRows >= 1) {
    return res.json({ info: "Zaktualizowano portfel" });
  }
});

app.post("/api/user/update", async (req, res) => {
  const { name, lastName, email, id } = req.body;

  await connection.query(
    "UPDATE uzytkownicy SET imie=?, nazwisko=?, email=? WHERE id=?",
    [name, lastName, email, id]
  );
  res.json({
    info: "Zmieniono dane",
    user: {
      imie: name,
      nazwisko: lastName,
      email: email,
      id: id,
    },
  });
});

app.post("/api/user/password", async (req, res) => {
  const { newPassword, confirmPassword, id } = req.body;

  if (!newPassword || !confirmPassword || !id) {
    return res.status(400).json({ info: "Puste pola" });
  }
  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync(newPassword, salt);

  await connection.query("UPDATE uzytkownicy SET haslo_hash = ? WHERE id=?", [
    hash,
    id,
  ]);
  res.json({ info: "Zmieniono hasło" });
});

app.post("/api/user/delete", async (req, res) => {
  const userId = req.body.id;
  await connection.query("DELETE FROM uzytkownicy WHERE id=?", [userId]);
  res.json({ info: "Konto usunięte" });
});

app.get("/api/yf/search", async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    const r = await yf.search(q, { quotesCount: 50, newsCount: 0 });
    const items = (r?.quotes || [])
      .filter((x) => x?.symbol && !x.symbol.includes("=")) // odfiltruj nietypowe instrumenty jeśli chcesz
      .map((x) => ({
        symbol: x.symbol,
        name: x.shortname || x.longname || x.symbol,
        exchange: x.exchDisp || x.exchange || "",
        type: x.typeDisp || "",
      }));
    res.json(items);
  } catch (e) {
    console.error("YF /search error:", e);
    res.status(500).json({ error: "Błąd wyszukiwania" });
  }
});
// ----- Start -----
app.listen(PORT, () => {
  console.log(`🚀 Serwer działa na http://localhost:${PORT}`);
});
