import React, { useState } from "react";
import styles from "./RegisterForm.module.css";
import axios from "axios";

export default function RegisterForm() {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    repeatPassword: "",
    termsAccepted: false,
  });
const [info,setinfo] = useState ("")


  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (form.password !== form.repeatPassword) {
      alert("Hasła muszą być takie same!");
      return;
    }
    if (!form.termsAccepted) {
      alert("Musisz zaakceptować regulamin!");
      return;
    }
    try {
      axios.post("http://localhost:5000/register", {
      form
    }
    ).then(res=>{setinfo(res.data?.info || res.data?.error)})
    } catch (error) {
      console.log(error)
    }
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <h2 className={styles.title}>Rejestracja</h2>
<p>{info}</p>

      <div className={styles.field}>
        <label>Imię</label>
        <input
          type="text"
          name="firstName"
          value={form.firstName}
          onChange={handleChange}
          required
        />
      </div>

      <div className={styles.field}>
        <label>Nazwisko</label>
        <input
          type="text"
          name="lastName"
          value={form.lastName}
          onChange={handleChange}
          required
        />
      </div>

      <div className={styles.field}>
        <label>Email</label>
        <input
          type="email"
          name="email"
          value={form.email}
          onChange={handleChange}
          required
        />
      </div>

      <div className={styles.field}>
        <label>Hasło</label>
        <input
          type="password"
          name="password"
          value={form.password}
          onChange={handleChange}
          required
        />
      </div>

      <div className={styles.field}>
        <label>Powtórz hasło</label>
        <input
          type="password"
          name="repeatPassword"
          value={form.repeatPassword}
          onChange={handleChange}
          required
        />
      </div>

      <div className={styles.checkboxField}>
        <input
          type="checkbox"
          name="termsAccepted"
          checked={form.termsAccepted}
          onChange={handleChange}
        />
        <label>Akceptuję regulamin</label>
      </div>

      <button type="submit" className={styles.submitBtn}>
        Zarejestruj
      </button>
    </form>
  );
}
