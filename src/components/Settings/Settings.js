import React, { use, useEffect, useState } from "react";
import styles from "./Settings.module.css";
import axios from "axios";
import { useNavigate } from "react-router";

export default function Settings() {
  const user =
    JSON.parse(localStorage.getItem("userdata"))?.user ||
    JSON.parse(localStorage.getItem("userdata"));
  console.log(user);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [name, setName] = useState(user.imie);
  const [lastName, setLastName] = useState(user.nazwisko);
  const [email, setEmail] = useState(user.email);
  const [id] = useState(user.id);

  let navigate = useNavigate();
  // zmiana hasła
  const [pwd, setPwd] = useState({
    newPassword: "",
    confirmPassword: "",
  });

  // usunięcie konta
  const [confirmDelete, setConfirmDelete] = useState("");
  console.log(name);

  const saveProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErr("");
    setMsg("");
    try {
      axios
        .post("http://localhost:5000/api/user/update", {
          name,
          lastName,
          email,
          id,
        })
        .then((res) => {
          setMsg(res.data.message);
          localStorage.setItem("userdata", JSON.stringify(res.data.user));
        });

      setMsg("Zapisano zmiany profilu.");
    } catch (e) {
      setErr(e.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  // zmiana hasła
  const changePassword = async (e) => {
    e.preventDefault();
    setErr("");
    setMsg("");
    if (pwd.newPassword !== pwd.confirmPassword) {
      setErr("Hasła nie są identyczne.");
      return;
    }
    setLoading(true);
    try {
      axios
        .post("http://localhost:5000/api/user/password", {
          newPassword: pwd.newPassword,
          confirmPassword: pwd.confirmPassword,
          id,
        })
        .then((res) => {
          setMsg(res?.data?.info);
        });

      setPwd({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (e) {
      setErr(e.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  // usunięcie konta
  const deleteAccount = async (e) => {
    e.preventDefault();
    setErr("");
    setMsg("");
    if (confirmDelete !== "USUN") {
      setErr("Aby potwierdzić, wpisz dokładnie: USUN");
      return;
    }
    if (
      !window.confirm(
        "Na pewno chcesz usunąć konto? Tej operacji nie można cofnąć."
      )
    )
      return;

    setLoading(true);
    try {
      setMsg("Konto usunięte.");
      localStorage.removeItem("userdata");
      axios.post("http://localhost:5000/api/user/delete", { id });

      navigate("/");
    } catch (e) {
      setErr(e.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.wrap}>
      <h1>Ustawienia konta</h1>

      {(msg || err) && (
        <div className={styles.messages}>
          {msg && <div className={styles.ok}>{msg}</div>}
          {err && <div className={styles.error}>{err}</div>}
        </div>
      )}

      <section className={styles.card}>
        <h2>Dane profilu</h2>
        <form onSubmit={saveProfile} className={styles.form}>
          <div className={styles.row}>
            <label>Imię</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className={styles.row}>
            <label>Nazwisko</label>
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
          </div>

          <div className={styles.row}>
            <label>E-mail</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
            />
          </div>

          <div className={styles.actions}>
            <button type="submit" disabled={loading}>
              Zapisz
            </button>
          </div>
        </form>
      </section>

      <section className={styles.card}>
        <h2>Zmiana hasła</h2>
        <form onSubmit={changePassword} className={styles.form}>
          <div className={styles.row}>
            <label>Nowe hasło</label>
            <input
              type="password"
              value={pwd.newPassword}
              onChange={(e) =>
                setPwd((p) => ({ ...p, newPassword: e.target.value }))
              }
              required
            />
          </div>
          <div className={styles.row}>
            <label>Powtórz nowe hasło</label>
            <input
              type="password"
              value={pwd.confirmPassword}
              onChange={(e) =>
                setPwd((p) => ({ ...p, confirmPassword: e.target.value }))
              }
              required
            />
          </div>
          <div className={styles.actions}>
            <button type="submit" disabled={loading}>
              Zmień hasło
            </button>
          </div>
        </form>
      </section>

      <section className={styles.cardDanger}>
        <h2>Usuń konto</h2>
        <p className={styles.note}>
          Tej operacji nie można cofnąć. Aby potwierdzić, wpisz: <b>USUN</b>
        </p>
        <form onSubmit={deleteAccount} className={styles.formRow}>
          <input
            value={confirmDelete}
            onChange={(e) => setConfirmDelete(e.target.value)}
            placeholder=" wpisz: USUN"
          />
          <button
            className={styles.danger}
            disabled={loading || confirmDelete !== "USUN"}
          >
            Usuń konto
          </button>
        </form>
      </section>
    </div>
  );
}
