import React, { useEffect, useState } from "react";
import styles from "./Wallet.module.css";
import axios from "axios";

// Jeśli nie używasz proxy Vite, wpisz pełny adres:
const API_BASE = "http://localhost:5000";

export default function Wallet() {
  const [value, setValue] = useState(null);
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [id, setUserid] = useState("");
  const [refresh, setRefresh] = useState(false);
  const nf = new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
  });

  async function load() {
    setErr("");
    try {
      const data = JSON.parse(localStorage.getItem("userdata"));
      setUserid(data.user.id);
      axios
        .post("http://localhost:5000/get-wallet", data)
        .then((res) => setAmount(res.data[0].wartosc_portfela));
    } catch (e) {
      setErr(e.message || String(e));
    }
  }

  useEffect(() => {
    load();
  }, [id, refresh]);
  async function add() {
    const amount = Number(document.querySelector("#amount").value);
    if (isNaN(amount)) {
      return alert("Podano błędną kwotę");
    }
    const data = JSON.parse(localStorage.getItem("userdata"));
    const id = data.user.id;
    axios
      .post("http://localhost:5000/set-wallet", {
        id,
        amount,
        type: "Wpływ środków",
      })
      .then((res) => {
        if (res.data.info == "Zaktualizowano portfel") {
          setRefresh(!refresh);
        }
      });
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.row}>
          <h3 className={styles.title}>Mój portfel</h3>
          <button
            className={styles.reload}
            onClick={load}
            title="Odśwież"
            disabled={loading}
          >
            ⟲
          </button>
        </div>

        <div className={styles.valueBox}>
          <div className={styles.valueLabel}>Wartość portfela</div>
          <div className={styles.valueNumber}>
            {amount === null ? "—" : nf.format(amount)}
          </div>
        </div>

        <div className={styles.formRow}>
          <input
            id="amount"
            type="number"
            step="10"
            min="0"
            placeholder="Kwota (PLN)"
            className={styles.input}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            disabled={loading}
          />
          <button
            className={styles.button}
            onClick={add}
            disabled={loading || !amount}
          >
            Dodaj środki
          </button>
        </div>

        {err && <p className={styles.error}>Błąd: {err}</p>}
        <p className={styles.hint}>
          Uwaga: to prosty podgląd i wpłata do wartości portfela. (Dla produkcji
          warto rozważyć tabelę transakcji.)
        </p>
      </div>
    </div>
  );
}
