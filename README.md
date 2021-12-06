# @charaverse/knex-row

[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](http://www.typescriptlang.org/)
[![tested with jest](https://img.shields.io/badge/tested_with-jest-99424f.svg)](https://github.com/facebook/jest)

knex-row is a lightweight row interface for Knex.js. It provides a more
type-safe interface on top of Knex.js connection and query objects.

> Please note that while knex-row can be used with any databases supported by
> Knex.js, knex-row is currently only tested against MySQL. Some functions such
> as `insert` might behave differently with other databases.

## Installation

```bash
$ npm install @charaverse/knex-row
```

## Documentation

Documentation is here: https://charaverse.github.io/knex-row/

## Usage

At Charaverse, knex-row is used as part of database services layer, interacing
with the database.

```ts
// models/user.ts
// ==============
// Models are high-level interface that is the only one allowed to pass across
// "layers". It provides a generic, simple interface that implementations must
// adhere to.
export interface UserModel {
  id: number;
  name: string;
  displayName: string;
  setName(name: string): Promise<void>;
  setDisplayName(displayName: string | null): Promise<void>;
  delete(): Promise<void>;
}

// services/database/user.ts
// =========================
// Database service is a module whose job is to retrieve data from database.
// It abstracts away database-specific code such as table name and column names.
// @charaverse/knex-row is used here.
import knex from "knex";
import { Connection, Row, find } from "@charaverse/row";

const defaultConnection = knex({
  // database connection configuration
});

export class UserRow {
  readonly #row: Row;

  constructor(row: Row) {
    this.#row = row;
  }

  get id(): number {
    return this.#row.id;
  }

  get name(): string {
    return this.#row.getColumn("name");
  }

  get displayName(): string | null {
    return this.#row.getColumn("display_name");
  }

  async setName(name: string): Promise<void> {
    await this.#row.setColumn("name", name);
  }

  async setDisplayName(displayName: string | null): Promise<void> {
    await this.#row.setColumn("display_name", displayName);
  }

  async delete(): Promise<void> {
    await this.#row.delete();
  }
}

export async function findUserRowByName(
  name: string,
  conn?: Connection = defaultConnection
): Promise<UserRow> {
  const row = await find({
    conn,
    tableName: "user",
    where() {
      return this.where({ name });
    },
  });
}

// services/user.ts
// ================
// User service is a high-level service that provides user retrieval methods.
// With low-level database interface abstracted away by database services,
// user service can focus on providing an implementation of UserModel alongside
// additional necessary functions.
//
// Here we are using ow library to provide some validations for user functions.
import ow from "ow";

export class User implements UserModel {
  readonly #row: UserRow;

  constructor(row: Row) {
    this.#row = row;
  }

  get id() {
    return this.#row.id;
  }

  get name() {
    return this.#row.name;
  }

  get displayName() {
    return this.#row.displayName;
  }

  async setName(name: string) {
    ow(name, ow.string.nonEmpty.max(16).matches(/^\w+$/));

    return this.#row.setName(name);
  }

  async setDisplayName(displayName: string | null) {
    ow(name, ow.any(ow.null, ow.string.nonEmpty.max(32)));

    return this.#row.setDisplayName(displayName);
  }

  async delete() {
    return this.#row.delete();
  }
}

export async function findUserByName(name: string): Promise<UserModel> {
  const row = await findUserRowByName(name);

  return row ? new User(row) : null;
}

// User service functions are the functions that is ready for use by outer
// modules such as HTTP request handler or scripts.
router.get("/user/:userName", (req, res, next) =>
  (async () => {
    const userName = req.params.userName;

    const user = await findUserByName(userName);
    if (user) {
      res.sendStatus(404);
      return;
    }

    res.json({
      id: user.id,
      name: user.name,
      displayName: user.displayName,
    });
  })().catch(next)
);
```

## Contribute

Feel free to [send issues][issues] or [create pull requests][pulls].

## License

Licensed under MIT License.

[issues]: https://github.com/charaverse/knex-row/issues
[pulls]: https://github.com/charaverse/knex-row/pulls
