import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import styles from "./navbar.module.css";
import axios from "axios";

const Navbar = () => {
  const [wallet, setWallet] = useState("");

  const data = JSON.parse(localStorage.getItem("userdata"));

  useEffect(() => {
    console.log(data);

    axios
      .post("http://localhost:5000/get-wallet", { user: data.user })
      .then((res) => {
        setWallet(res?.data[0]?.wartosc_portfela + " " + "zł");
      });
  }, []);

  return (
    <nav className={styles.navbar}>
      <h1 className={styles.header}>InveSmart</h1>
      <ul className={styles.navList}>
        {!data?.user?.email ? (
          ""
        ) : (
          <li>
            <Link to="/wallet" className={styles.navItem}>
              Portfel: {wallet || ""}
            </Link>
          </li>
        )}
        <li>
          <Link to="/" className={styles.navItem}>
            Main
          </Link>
        </li>
        <li>
          <Link
            className={styles.navItem}
            onClick={() => {
              document
                .querySelector(`.${styles.account}`)
                .classList.toggle(styles.showaccount);
            }}
          >
            {!data?.user?.email ? "Account" : data?.user?.imie}
          </Link>
        </li>
      </ul>
      <div className={styles.account}>
        {!data?.user?.email ? (
          <>
            <Link to="/login">
              <button>Zaloguj</button>
            </Link>
            <Link to="/register">
              <button>Zarejestruj</button>
            </Link>
          </>
        ) : (
          <>
            <Link to="/settings">
              <button>Ustawienia</button>
            </Link>
            <button
              onClick={() => {
                localStorage.setItem(
                  "userdata",
                  JSON.stringify({ info: "Wylogowano" })
                );
                window.location.reload();
              }}
            >
              Wyloguj
            </button>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
