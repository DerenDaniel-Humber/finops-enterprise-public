import { Router } from "express";
export function apiRoutes(c) {
  const router = Router();
  router.get("/health", (req, res) =>
    res.json({ status: "ok", timestamp: new Date().toISOString() }),
  );
  router.get("/dashboard/summary", c.dashboard);
  router.get("/clients", c.clients.list);
  router.post("/clients", c.clients.create);
  router.get("/clients/:id", c.clients.detail);
  router.patch("/clients/:id", c.clients.update);
  router.get("/accounts", c.accounts.list);
  router.post("/accounts", c.accounts.create);
  router.get("/accounts/:id", c.accounts.detail);
  router.get("/transactions", c.transactions.list);
  router.get("/transactions/:id", c.transactions.detail);
  return router;
}
