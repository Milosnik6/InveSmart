import React, { useState } from "react";
import styles from "./LogInForm.module.css";
import axios from "axios";
import { useNavigate } from "react-router";

export default function LogInForm({ onSubmit }) {
  const [form, setForm] = useState({
    email: "",
    password: "",
    remember: false,
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false) 
  let navigate = useNavigate()
const [info, setinfo] = useState("")
  const validate = () => {
    const e = {};
    if (!form.email.trim()) e.email = "Podaj adres e-mail";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = "Nieprawidłowy adres e-mail";

    if (!form.password) e.password = "Podaj hasło";

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleChange = (ev) => {
    const { name, value, type, checked } = ev.target;
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;

    setLoading(true);
    axios.post("http://localhost:5000/login", form)
      .then(res => {
        setinfo(res.data.info)
    
  localStorage.setItem("userdata", JSON.stringify(res.data)) 
  setTimeout(() =>{navigate("/")}, 800)})
  
      .catch(err => setinfo(err.response.data.error))

  };

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <h2 className={styles.title}>Logowanie</h2>
<p>{info}</p>
      {errors.general && <div className={styles.alert}>{errors.general}</div>}

      <div className={styles.field}>
        <label htmlFor="email">E-mail</label>
        <input
          id="email"
          type="email"
          name="email"
          autoComplete="email"
          value={form.email}
          onChange={handleChange}
          className={errors.email ? styles.invalid : ""}
          placeholder="jan.kowalski@example.com"
          required
        />
        {errors.email && <span className={styles.error}>{errors.email}</span>}
      </div>

      <div className={styles.field}>
        <label htmlFor="password">Hasło</label>
        <input
          id="password"
          type="password"
          name="password"
          autoComplete="current-password"
          value={form.password}
          onChange={handleChange}
          className={errors.password ? styles.invalid : ""}
          placeholder="••••••••"
          required
        />
        {errors.password && <span className={styles.error}>{errors.password}</span>}
      </div>

      <div className={styles.row}>
        <label className={styles.checkbox}>
          <input
            type="checkbox"
            name="remember"
            checked={form.remember}
            onChange={handleChange}
          />
          <span>Zapamiętaj mnie</span>
        </label>

        <a className={styles.link} href="/forgot-password">
          Nie pamiętasz hasła?
        </a>
      </div>

      <button type="submit" className={styles.submitBtn} disabled={loading}>
        {loading ? "Logowanie..." : "Zaloguj się"}
      </button>
    </form>
  );
}
