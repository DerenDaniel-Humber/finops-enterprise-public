import React from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  Routes,
  Route,
  NavLink,
  Outlet,
  Link,
} from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Clients, { ClientDetail } from "./pages/Clients";
import ClientForm from "./pages/ClientForm";
import Accounts, { AccountDetail, AccountForm } from "./pages/Accounts";
import Transactions, { TransactionDetail } from "./pages/Transactions";
import "./styles.css";
function Layout() {
  return (
    <div className="app">
      <aside className="sidebar">
        <Link to="/" className="brand">
          <span className="brand-mark">F</span>
          <span>
            FinOps<strong>ENTERPRISE</strong>
          </span>
        </Link>
        <div className="nav-label">WORKSPACE</div>
        <nav aria-label="Main navigation">
          {[
            ["/", "Overview", "01"],
            ["/clients", "Corporate clients", "02"],
            ["/accounts", "Financial accounts", "03"],
            ["/transactions", "Transaction history", "04"],
          ].map(([path, label, index]) => (
            <NavLink key={path} to={path} end={path === "/"}>
              <span aria-hidden="true">{index}</span>
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="bank-icon">N</div>
          <strong>Northbridge</strong>
          <p>Commercial Bank</p>
          <span>SIMULATED OPERATIONS</span>
        </div>
      </aside>
      <div className="workspace">
        <header>
          <span>CORPORATE FINANCIAL OPERATIONS</span>
          <div>
            <span className="live-dot" /> Release 1{" "}
            <span className="avatar">NB</span>
          </div>
        </header>
        <main>
          <Outlet />
        </main>
        <footer>
          FinOps Enterprise · Academic demonstration · No real banking
          transactions
        </footer>
      </div>
    </div>
  );
}
function NotFound() {
  return (
    <div className="state">
      <h1>Page not found</h1>
      <p>The requested workspace page does not exist.</p>
      <Link className="button" to="/">
        Return to overview
      </Link>
    </div>
  );
}
createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="clients" element={<Clients />} />
          <Route path="clients/new" element={<ClientForm />} />
          <Route path="clients/:id" element={<ClientDetail />} />
          <Route path="clients/:id/edit" element={<ClientForm />} />
          <Route path="accounts" element={<Accounts />} />
          <Route path="accounts/new" element={<AccountForm />} />
          <Route path="accounts/:id" element={<AccountDetail />} />
          <Route path="transactions" element={<Transactions />} />
          <Route path="transactions/:id" element={<TransactionDetail />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);
