export function createControllers(services) {
  const wrap = (fn) => async (req, res, next) => {
    try {
      await fn(req, res);
    } catch (error) {
      next(error);
    }
  };
  const controller = (service) => ({
    list: wrap(async (req, res) => res.json(await service.list(req.query))),
    detail: wrap(async (req, res) =>
      res.json({ data: await service.detail(req.params.id) }),
    ),
  });
  // Explicit creation handlers return both the resource and Location.
  const clients = controller(services.clients),
    accounts = controller(services.accounts),
    transactions = controller(services.transactions);
  clients.create = wrap(async (req, res) => {
    const data = await services.clients.create(req.body);
    res.status(201).location(`/api/v1/clients/${data.clientId}`).json({ data });
  });
  accounts.create = wrap(async (req, res) => {
    const data = await services.accounts.create(req.body);
    res
      .status(201)
      .location(`/api/v1/accounts/${data.accountId}`)
      .json({ data });
  });
  clients.update = wrap(async (req, res) =>
    res.json({ data: await services.clients.update(req.params.id, req.body) }),
  );
  return {
    clients,
    accounts,
    transactions,
    dashboard: wrap(async (req, res) =>
      res.json({ data: await services.dashboard.summary() }),
    ),
  };
}
