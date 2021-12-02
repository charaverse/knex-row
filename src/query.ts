import { Knex } from "knex";
import { Row } from "./row";
import { ConnectionOpts } from "./connection";
import { RowData, TIME_DELETED_COL, ID_COL } from "./row";

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

export async function findAll<T extends IdType = number>(
  opts: FindAllOpts
): Promise<Row<T>[]> {
  const {
    conn,
    tableName,
    where = null,
    includeDeleted = false,
    includeDeletedCol = TIME_DELETED_COL,
    pagination = null,
    before = null,
  } = opts;

  const query = conn(tableName);

  if (where) {
    query.where(where);
  }

  if (!includeDeleted) {
    query.whereNull(includeDeletedCol);
  }

  if (pagination) {
    const { limit = DEFAULT_PAGINATION_LIMIT, page = 1 } = pagination;
    query.limit(limit).offset((page - 1) * limit);
  }

  if (before) {
    before(query);
  }

  return (await query).map((rowData) => new Row({ tableName, rowData, conn }));
}

export async function find<T extends IdType = number>(
  opts: SelectOpts
): Promise<Row<T>> {
  const [result] = await findAll<T>(opts);
  return result ?? null;
}

interface CountAllOpts extends SelectOpts {
  countBy?: string;
}

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
    query.where(where);
  }

  if (!includeDeleted) {
    query.whereNull(includeDeletedCol);
  }

  query.count({ count: Array.isArray(countBy) ? countBy : [countBy] });
  const [{ count }] = await query;

  return count;
}

export async function insertAll(
  tableName: string,
  rowData: RowData[],
  opts: ConnectionOpts
): Promise<void> {
  const { conn } = opts;

  await conn(tableName).insert(rowData);
}

export async function insert(
  tableName: string,
  rowData: RowData,
  opts: ConnectionOpts
): Promise<number> {
  const { conn } = opts;

  const [id] = await conn(tableName).insert(rowData);
  return id;
}
