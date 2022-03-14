import { Knex } from "knex";
import { Row } from "./row";
import { ConnectionOpts } from "./connection";
import { RowValue, TIME_DELETED_COL, ID_COL } from "./row";

type IdType = number | string;

type QueryFunction = (this: Knex.QueryBuilder) => Knex.QueryBuilder | void;

interface SelectOpts extends ConnectionOpts {
  tableName: string;
  where?: QueryFunction;
  includeDeleted?: boolean;
  includeDeletedCol?: string;
  before?: (query: Knex.QueryBuilder) => void;
}

export const DEFAULT_PAGINATION_LIMIT = 20;

interface FindAllOpts extends SelectOpts {
  pagination?: {
    page?: number;
    limit?: number;
  };
}

/**
 * Performs a select query and return an array of {@link Row} objects.
 *
 * Options:
 *
 * - `conn` *(required)*: the Knex connection object used for creating the query
 * - `tableName` *(required)*: the table name
 * - `where`: the (where argument)[knex-where] for the query
 * - `includeDeleted`: whether to **skip** adding time deleted timestamp query (`WHERE {includeDeletedCol} IS NULL`) (default: `false`)
 * - `includeDeletedCol`: the name of time deleted timestamp column (default: {@link TIME_DELETED_COL})
 * - `pagination`: whether to add limit-offset in query for pagination
 *   - `page`: the page number to be retrieved (default: `1`)
 *   - `limit`: the maximum number of rows in a page (default: {@link DEFAULT_PAGINATION_LIMIT})
 * - `before`: a function that will be called with the resulting query object to perform further modifications if necessary
 *
 * The `includeDeleted` flag defaults to `true` because it is assumed that
 * most `findAll` queries will query tables with a soft-delete timestamp column.
 * If this is not the case, you should explicitly add `includeDeleted: false`.
 *
 * The `before` function can be used as 'escape hatch' to add further function
 * calls to the resulting query builder object, such as `.orderBy()`.
 *
 * [knex-where]: https://knexjs.org/#Builder-where
 *
 * @template IdType The type of identifier column (defaults to `number`)
 * @param opts The options for select query
 * @returns An array of Row objects (possibly empty)
 */
export async function findAll<T extends IdType = number>(
  opts: FindAllOpts
): Promise<Row<T>[]> {
  const {
    conn,
    tableName,
    where,
    includeDeleted = false,
    includeDeletedCol = TIME_DELETED_COL,
    pagination,
    before,
  } = opts;

  const query = conn(tableName);

  if (where) {
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    void query.where(where);
  }

  if (!includeDeleted) {
    void query.whereNull(includeDeletedCol);
  }

  if (pagination) {
    const { limit = DEFAULT_PAGINATION_LIMIT, page = 1 } = pagination;
    void query.limit(limit).offset((page - 1) * limit);
  }

  if (before) {
    before(query);
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  return (await query).map((rowData) => new Row({ tableName, rowData, conn }));
}

/**
 * A convenience function to {@link findAll} for retrieving one {@link Row}.
 * If there are no row that matches the query, the return value will be `null`.
 *
 * The function accepts the same options with {@link findAll}, except for
 * `pagination`.
 *
 * @template IdType The type of identifier column (defaults to `number`)
 * @param opts The options for select query
 * @returns A Row object or null
 */
export async function find<T extends IdType = number>(
  opts: SelectOpts
): Promise<Row<T>> {
  const [result] = await findAll<T>(opts);
  return result ?? null;
}

interface CountAllOpts extends SelectOpts {
  countBy?: string | string[];
}

/**
 * Executes a count query (SELECT COUNT({countBy}) ...).
 *
 * The function accepts the same options with {@link findAll} except for
 * `pagination` with an additional option:
 *
 * - `countBy`: the (count expression)[knex-count]
 *
 * [knex-count]: https://knexjs.org/#Builder-count
 *
 * @template IdType The type of identifier column (defaults to `number`)
 * @param opts The options for select query
 * @returns A Row object or null
 */
export async function countAll(opts: CountAllOpts): Promise<number> {
  const {
    conn,
    tableName,
    where = null,
    includeDeleted = false,
    includeDeletedCol = TIME_DELETED_COL,
    countBy = [ID_COL],
  } = opts;

  const query = conn(tableName);

  if (where) {
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    void query.where(where);
  }

  if (!includeDeleted) {
    void query.whereNull(includeDeletedCol);
  }

  void query.count({ count: Array.isArray(countBy) ? countBy : [countBy] });
  const [{ count }] = (await query) as [{ count: number }];

  return count;
}

interface InsertRowData {
  [key: string]: RowValue | Knex.Raw;
}

/**
 * Inserts multiple rows using INSERT query.
 *
 * Options:
 *
 * - `conn` *(required)*: the Knex connection object used for creating the query
 *
 * @param tableName The table name for new rows to be inserted
 * @param rowDataArray Array of row data to be inserted
 * @param opts The options for select query
 */
export async function insertAll(
  tableName: string,
  rowDataArray: InsertRowData[],
  opts: ConnectionOpts
): Promise<void> {
  const { conn } = opts;

  await conn(tableName).insert(rowDataArray);
}

/**
 * Inserts a single row using INSERT query.
 *
 * In some supported databases (MySQL, SQLite), if the table has auto-increment
 * column, the value of the column will be returned. Otherwise, the return
 * value should be considered *unknown*, as different database drivers may
 * behave differently.
 *
 * Options:
 *
 * - `conn` *(required)*: the Knex connection object used for creating the query
 *
 * @param tableName The table name for new rows to be inserted
 * @param rowData Row data to be inserted
 * @param opts The options for select query
 */
export async function insert(
  tableName: string,
  rowData: InsertRowData,
  opts: ConnectionOpts
): Promise<number> {
  const { conn } = opts;

  const [id] = await conn(tableName).insert(rowData);
  return id;
}
