import express from "express";
import cors from "cors";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { createRepositories } from "./repositories/index.js";
import { createServices } from "./services/index.js";
import { createControllers } from "./controllers/index.js";
import { apiRoutes } from "./routes/index.js";
export function createApp({
  dataDir = process.env.DATA_DIR
    ? resolve(process.env.DATA_DIR)
    : fileURLToPath(new URL("../data/", import.meta.url)),
  frontendOrigin = process.env.FRONTEND_ORIGIN || "http://localhost:5173",
  logErrors = true,
} = {}) {
  const app = express();
  app.disable("x-powered-by");
  app.set("query parser", "simple");
  app.use(cors({ origin: frontendOrigin }));
  app.use(express.json({ limit: "100kb" }));
  app.use(
    "/api/v1",
    apiRoutes(createControllers(createServices(createRepositories(dataDir)))),
  );
  app.use((req, res) =>
    res
      .status(404)
      .json({
        error: { code: "NOT_FOUND", message: "API endpoint not found." },
      }),
  );
  app.use((error, req, res, next) => {
    if (logErrors && (!error.status || error.status >= 500))
      console.error(error);
    const status =
      error.type === "entity.parse.failed"
        ? 400
        : error.type === "entity.too.large"
          ? 413
          : error.status || 500;
    res
      .status(status)
      .json({
        error: {
          code:
            error.code || (status === 400 ? "INVALID_JSON" : "INTERNAL_ERROR"),
          message:
            status >= 500
              ? error.code === "STORAGE_ERROR"
                ? error.message
                : "An unexpected server error occurred."
              : error.message,
          ...(error.fields ? { fields: error.fields } : {}),
        },
      });
  });
  return app;
}
