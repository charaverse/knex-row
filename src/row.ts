import { Knex } from "knex";
import { Connection, ConnectionOpts } from ".";

/**
 * @internal
 */
export type RowValue = unknown | number | boolean | string | Date;

/**
 * The default column name for row identifier, usually used as primary and
 * auto-incrementing key.
 */
export const ID_COL = "id";

/**
 * The default column name for row create timestamp.
 */
export const TIME_CREATED_COL = "time_created";

/**
 * The default column name for row update timestamp.
 */
export const TIME_UPDATED_COL = "time_updated";

/**
 * The default column name for row delete timestamp.
 */
export const TIME_DELETED_COL = "time_deleted";

interface RowData {
  [key: string]: RowValue;
}

/**
 * The class Row is intended to wrap over a Knex query row data and and a Knex
 * connection:
 *
 * ```ts
 * import knex from "knex"
 *
 * const conn = knex({
 *   // database connection options
 * })
 *
 * const tableName = "mytable"
 *
 * const [rowData] = await conn("mytable").where("id", 123)
 *
 * const row = new Row({ conn, tableName, rowData })
 * ```
 *
 * With the knowledge of table name and a connection to create queries, Row
 * is able to provide simple methods such as {@link Row.setColumn} to update
 * column data and {@link Row.deletePermanently} to delete row from table.
 *
 * @template IdType The type of identifier column (defaults to `number`)
 */
export class Row<IdType extends number | string = number> {
  private readonly initialConn: Connection;
  private readonly primaryCols: string[];
  private readonly tableName: string;
  private readonly rowData: RowData;
  private readonly idCol: string;
  private readonly timeCreatedCol: string;
  private readonly timeUpdatedCol: string;
  private readonly timeDeletedCol: string;

  private conn: Connection;

  /**
   * Creates a new Row.
   *
   * Options:
   *
   * - `tableName` *(required)*: the table of the row
   * - `rowData` *(required)*: the row data, usually from Knex query result
   * - `idCol`: the name of identifier column (default: {@link ID_COL})
   * - `timeCreatedCol`: the name of row created timestamp column (default: {@link TIME_CREATED_COL})
   * - `timeUpdatedCol`: the name of row updated timestamp column (default: {@link TIME_UPDATED_COL})
   * - `timeDeletedCol`: the name of row deleted timestamp column (default: {@link TIME_DELETED_COL})
   * - `primaryCols`: the name of identifier column (default: `[idCol]`)
   *
   * @template IdType The type of identifier column (defaults to `number`)
   */
  constructor(
    opts: ConnectionOpts & {
      tableName: string;
      rowData: RowData;
      idCol?: string;
      timeCreatedCol?: string;
      timeUpdatedCol?: string;
      timeDeletedCol?: string;
      primaryCols?: string[];
    }
  ) {
    const {
      conn,
      tableName,
      rowData,
      idCol = ID_COL,
      timeCreatedCol = TIME_CREATED_COL,
      timeUpdatedCol = TIME_UPDATED_COL,
      timeDeletedCol = TIME_DELETED_COL,
      primaryCols = [idCol],
    } = opts;

    this.initialConn = conn;
    this.conn = conn;

    this.tableName = tableName;
    this.rowData = rowData;

    this.idCol = idCol;
    this.timeCreatedCol = timeCreatedCol;
    this.timeUpdatedCol = timeUpdatedCol;
    this.timeDeletedCol = timeDeletedCol;
    this.primaryCols = primaryCols;
  }

  /**
   * Returns the Knex connection object associated with the row, or sets the
   * connection object to a new value.
   *
   * If a falsy value is provided, the original connection object when the row
   * is first created will be used.
   */
  get connection(): Connection {
    return this.conn;
  }

  set connection(value: Connection | null) {
    this.conn = value || this.initialConn;
  }

  /**
   * Checks if the column name exists on the provided row data.
   *
   * Note that this is not necessarily the actual row data, because the column
   * may not be retrieved during query (e.g. `SELECT my_col FROM my_table`)
   * or the column may be aliased (e.g. `SELECT `my_col as col FROM my_table`).
   *
   * @param col The column name to be checked
   * @returns `true` if the column name exists on row data, `false` otherwise
   */
  isColumn(col: string): boolean {
    return typeof this.rowData[col] !== "undefined";
  }

  /**
   * Returns the value of the column from the row data.
   *
   * If the column does not exist in the row data (i.e. {@link Row.isColumn}
   * returns `false`), an error will be thrown.
   *
   * The `ValueType` parameter allows the type to be inferred from usage, or
   * to be overridden if necessary:
   *
   * ```ts
   * // Type is inferred
   * const myName: string = row.getColumn("name")
   *
   * // myName will be string
   * const myName = row.getColumn<string>("name")
   * ```
   *
   * @param col The column name to be retrieved
   * @returns The column value
   * @template ValueType The expected column value type
   */
  getColumn<ValueType extends RowValue>(col: string): ValueType {
    if (!this.isColumn(col)) {
      throw new Error(
        `Column '${col}' does not exist for table ${this.tableName}`
      );
    }

    return this.rowData[col] as ValueType;
  }

  /**
   * Alias for `this.getColumn<IdType>(this.idCol)`.
   */
  get id(): IdType {
    return this.getColumn<IdType>(this.idCol);
  }

  /**
   * Alias for `this.getColumn<Date>(this.timeCreatedCol)`.
   */
  get timeCreated(): Date {
    return this.getColumn<Date>(this.timeCreatedCol);
  }

  /**
   * Alias for `this.getColumn<Date>(this.timeUpdatedCol)`.
   */
  get timeUpdated(): Date {
    return this.getColumn<Date>(this.timeUpdatedCol);
  }

  /**
   * Alias for `this.getColumn<Date>(this.timeDeletedCol)`.
   */
  get timeDeleted(): Date {
    return this.getColumn<Date>(this.timeDeletedCol);
  }

  /**
   * Returns a subset of row data whose key is in `primaryCols`.
   *
   * ```ts
   * const rowData = {
   *   foo_id: 123,
   *   bar_value: "abc",
   *   baz: null,
   * }
   *
   * const row = new Row({
   *   conn,
   *   table: "my_table",
   *   rowData,
   *   primaryCols: ["foo_id", "bar_value"]
   * })
   *
   * console.log(row.primaryKey)
   * // { foo_id: 123, bar_value: "abc" }
   * ```
   *
   * If the row data uses the actual column names, `primaryKey` can be used when
   * creating queries.
   */
  get primaryKey(): RowData {
    const key: RowData = {};

    for (const col of this.primaryCols) {
      key[col] = this.getColumn(col);
    }

    return key;
  }

  /**
   * Alias for `this.connection(this.tableName).where(this.primaryKey)`.
   *
   * ```ts
   * const [{ name }] = await row.query.select("name")
   * ```
   */
  get query(): Knex.QueryBuilder {
    return this.connection(this.tableName).where(this.primaryKey);
  }

  /**
   * Returns `true` if `this.timeDeleted` is truthy, `false` otherwise.
   *
   * This accessor can be used for tables with "soft-delete" scenario, where
   * a time deleted timestamp column marks whether the row should be considered
   * as deleted.
   */
  get isDeleted(): boolean {
    return Boolean(this.timeDeleted);
  }

  /**
   * Performs an update query and updates the row data.
   *
   * @param data An object whose keys are subset of row data keys that contains the new values
   */
  async setColumns(data: {
    [key: string]: RowValue | Knex.Raw;
  }): Promise<void> {
    for (const key of Object.keys(data)) {
      if (!this.isColumn(key)) {
        throw new Error(
          `Column '${key}' does not exist for table ${this.tableName}`
        );
      }
    }

    await this.query.update(data);
    Object.assign(this.rowData, data);
  }

  /**
   * Alias for `this.setColumns({ [col]: value })`.
   *
   * @param col The column name to be updated
   * @param value The new column value
   */
  async setColumn(col: string, value: RowValue): Promise<void> {
    await this.setColumns({ [col]: value });
  }

  /**
   * Marks the row as soft-deleted, by setting the time deleted timestamp.
   */
  async delete(): Promise<void> {
    await this.setColumns({ [this.timeDeletedCol]: this.connection.fn.now() });
  }

  /**
   * Unmarks the row from being soft-deleted, by setting the time deleted
   * timestamp to `NULL`.
   */
  async restore(): Promise<void> {
    await this.setColumns({ [this.timeDeletedCol]: null });
  }

  /**
   * Permanently removes a row from the table by executing a delete query.
   */
  async deletePermanently(): Promise<void> {
    await this.query.delete();
  }
}
