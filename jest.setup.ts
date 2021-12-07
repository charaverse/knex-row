import knex from "knex";
import { loadEnv } from "@tkesgar/reno";
import { randomBytes } from "crypto";

const testDatabase = `test_${randomBytes(4).toString("hex")}`;

process.env.MYSQL_NAME = testDatabase;
loadEnv();

const conn = knex({
  client: "mysql2",
  connection: {
    host: process.env.MYSQL_HOST,
    port: Number(process.env.MYSQL_PORT),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASS,
  },
  asyncStackTraces: true,
});

beforeAll(async () => {
  await conn.raw(
    `CREATE DATABASE \`${testDatabase}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;`
  );
});

afterAll(async () => {
  await conn.raw(`DROP DATABASE \`${testDatabase}\`;`);
  await conn.destroy();
});
