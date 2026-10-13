import { join } from "node:path";
import { JsonStore } from "./json-store.js";
class Repository {
  constructor(directory, name, id) {
    this.store = new JsonStore(join(directory, name + ".json"));
    this.id = id;
  }
  findAll() {
    return this.store.read();
  }
  async findById(id) {
    return (await this.findAll()).find((row) => row[this.id] === id);
  }
  insert(record, validate = () => {}) {
    return this.store.update(async (rows) => {
      await validate(rows);
      return { rows: [...rows, record], result: record };
    });
  }
  update(id, transform) {
    return this.store.update(async (rows) => {
      const index = rows.findIndex((row) => row[this.id] === id);
      const result = await transform(index < 0 ? undefined : rows[index], rows);
      if (index < 0) throw new Error("Update requires an existing record.");
      return {
        rows: rows.map((row, i) => (i === index ? result : row)),
        result,
      };
    });
  }
}
export function createRepositories(directory) {
  return {
    clients: new Repository(directory, "clients", "clientId"),
    accounts: new Repository(directory, "accounts", "accountId"),
    transactions: new Repository(directory, "transactions", "transactionId"),
  };
}
