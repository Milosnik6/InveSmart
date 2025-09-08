import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import MainPage from "./components/mainPage/MainPage";
import RegisterForm from "./components/registerForm/RegisterForm";
import LogInForm from "./components/LogInForm/LogInForm";
import Wallet from "./components/Wallet/Wallet";
import Settings from "./components/Settings/Settings";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/wallet" element={<Wallet />} />
      </Routes>
      <Routes>
        <Route path="/" element={<MainPage />} />
      </Routes>
      <Routes>
        <Route path="/login" element={<LogInForm />} />
      </Routes>
      <Routes>
        <Route path="/register" element={<RegisterForm />} />
      </Routes>
      <Routes>
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </BrowserRouter>
  );
}
