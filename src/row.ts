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
 * The class `Row` is intended to wrap over a Knex query row data and and a Knex
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
 * With the knowledge of table name and a connection to create queries, `Row`
 * is able to provide simple methods such as {@link Row.setColumn} to update
 * column data and {@link Row.deletePermanently} to delete row from table.
 */
export class Row<T extends number | string = number> {
  private readonly initialConn: Connection;
  private readonly primaryCols: string[];
  private readonly tableName: string;
  private readonly rowData: RowData;
  private readonly idCol: string;
  private readonly timeCreatedCol: string;
  private readonly timeUpdatedCol: string;
  private readonly timeDeletedCol: string;

  private conn: Connection;

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
    this.primaryCols = primaryCols;
    this.tableName = tableName;
    this.rowData = rowData;
    this.conn = conn;
    this.idCol = idCol;
    this.timeCreatedCol = timeCreatedCol;
    this.timeUpdatedCol = timeUpdatedCol;
    this.timeDeletedCol = timeDeletedCol;
  }

  get connection(): Connection {
    return this.conn;
  }

  set connection(value: Connection) {
    this.conn = value || this.initialConn;
  }

  isColumn(col: string): boolean {
    return typeof this.rowData[col] !== "undefined";
  }

  getColumn<T extends RowValue>(col: string): T {
    if (!this.isColumn(col)) {
      throw new Error(
        `Column '${col}' does not exist for table ${this.tableName}`
      );
    }

    return this.rowData[col] as T;
  }

  get id(): T {
    return this.getColumn<T>(this.idCol);
  }

  get timeCreated(): Date {
    return this.getColumn<Date>(this.timeCreatedCol);
  }

  get timeUpdated(): Date {
    return this.getColumn<Date>(this.timeUpdatedCol);
  }

  get timeDeleted(): Date {
    return this.getColumn<Date>(this.timeDeletedCol);
  }

  get primaryKey(): RowData {
    const key: RowData = {};

    for (const col of this.primaryCols) {
      key[col] = this.getColumn(col);
    }

    return key;
  }

  get query(): Knex.QueryBuilder {
    return this.connection(this.tableName).where(this.primaryKey);
  }

  get isDeleted(): boolean {
    return Boolean(this.timeDeleted);
  }

  async setColumns(data: { [key: string]: RowValue }): Promise<void> {
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

  async setColumn(col: string, value: RowValue): Promise<void> {
    await this.setColumns({ [col]: value });
  }

  async delete(): Promise<void> {
    await this.setColumns({ [this.timeDeletedCol]: this.connection.fn.now() });
  }

  async restore(): Promise<void> {
    await this.setColumns({ [this.timeDeletedCol]: null });
  }

  async deletePermanently(): Promise<void> {
    await this.query.delete();
  }
}
