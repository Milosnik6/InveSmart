import React, { useEffect } from "react";
import Navbar from "../navbar/Navbar";
import styles from "./mainpage.module.css";
import YahooFinanceDemo from "../YahooFinance/YahooFinanceDemo";
import YahooFinanceFinal from "../YahooFinanceFinal/YahooFinanceFinal";
import Pointers from "../Poiters/Pointers";

export default function MainPage() {
  const data = JSON.parse(localStorage.getItem("userdata"));


  return (
    <>
      <Navbar />
      <main className={styles.container}>
        {!data?.user?.email ? (
          <header className={styles.header}>
            <h1>Wycena akcji — przykładowe dane</h1>
            <p className={styles.sub}>
              Wykres jest oparty na przykładowych danych dla WIG20
            </p>
          </header>
        ) : (
          <header className={styles.header}>
            <h1>Wycena akcji — bieżący wykres</h1>
            <p className={styles.sub}>
              Wybierz spółki i obserwuj zmiany w czasie rzeczywistym (co 60 s).
            </p>
          </header>
        )}
      </main>
      <div className={styles.main}>
        <div className={styles.chart}>
          {!data?.user?.email ? <YahooFinanceDemo /> : <YahooFinanceFinal />}
        </div>
        <div className={styles.pointers}>
          <Pointers symbols={[]} range="5d" interval="1d" />
        </div>
      </div>
    </>
  );
}
