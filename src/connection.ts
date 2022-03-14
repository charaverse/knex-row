/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-types */
import type { Knex } from "knex";

/**
 * This type represents any Knex interfaces that can be used *for creating
 * a query*:
 *
 * ```ts
 * import knex from "knex"
 *
 * // Object created from knex() is a Connection
 * const db: Connection = knex({
 *   // database connection options
 * })
 *
 * const results = await db("my_table").where("value", 100)
 * // ...
 *
 * // The transaction object from transaction() is a Connection
 * db.transaction(async trx => {
 *   const [entity] = await db("my_table").where("id", 123)
 *   // ...
 * })
 * ```
 *
 * This is particularly useful to create function that can work with both
 * regular connection and transaction:
 *
 * ```js
 * import { ConnectionOpts } from "@charaverse/knex-row"
 *
 * async function findMyEntityById(
 *   opts: Partial<ConnectionOpts> & { id: number }
 * ): Promise<MyEntity | null> {
 *    const { id, conn = defaultConnection } = opts
 *    // ...
 * }
 *
 * // With regular connection
 * const myEntity = await findMyEntityById({ id: 123 })
 *
 * // In a transaction
 * await db.transaction(async trx => {
 *   const currentMyEntity = await findMyEntityById(123, { id: 123, conn: trx })
 *   // ...
 * })
 * ```
 */
export type Connection = Knex | Knex.Transaction;

/**
 * This is an interface with `conn` field represents a `Connection`.
 * The primary usage is to define function parameters easier:
 *
 * ```ts
 * // Making the connection required
 * async function findMyEntityById(
 *   opts: ConnectionOpts & { id: number }
 * ): Promise<MyEntity | null> {
 *    const { id, conn } = opts
 *    // ...
 * }
 *
 * // Making the connection optional
 * async function findMyEntityById(
 *   opts: Partial<ConnectionOpts> & { id: number }
 * ): Promise<MyEntity | null> {
 *    const { id, conn = defaultConnection } = opts
 *    // ...
 * }
 * ```
 */
export interface ConnectionOpts {
  conn: Connection;
}
