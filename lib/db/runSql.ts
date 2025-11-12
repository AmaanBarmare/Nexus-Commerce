import { prisma } from '../db';

type ColumnMeta = {
  name: string;
  type: string;
};

type RunSqlResult = {
  rows: any[];
  columns: ColumnMeta[];
};

export async function runReadOnlySql(
  sql: string,
  params: Array<string | number | boolean | null>
): Promise<RunSqlResult> {
  const rawRows = await prisma.$queryRawUnsafe<unknown[]>(sql, ...params);

  if (!Array.isArray(rawRows)) {
    return { rows: [], columns: [] };
  }

  const rows = rawRows.map((row) => serialiseRow(row));

  const firstRow = rows[0] ?? {};
  const columns = Object.keys(firstRow).map((name) => {
    const value = (firstRow as Record<string, unknown>)[name];
    const type = Array.isArray(value) ? 'array' : typeof value;

    return {
      name,
      type,
    };
  });

  return { rows, columns };
}

function serialiseRow(row: any): Record<string, unknown> {
  if (!row || typeof row !== 'object') {
    return row;
  }

  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(row)) {
    result[key] = serialiseValue(value);
  }

  return result;
}

function serialiseValue(value: any): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === 'object' && value !== null && 'toNumber' in value && typeof value.toNumber === 'function') {
    try {
      const asNumber = (value as { toNumber: () => number }).toNumber();
      return asNumber;
    } catch {
      return String(value);
    }
  }

  if (typeof value === 'bigint') {
    return value.toString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map((item) => serialiseValue(item));
  }

  if (typeof value === 'object') {
    return serialiseRow(value);
  }

  return value;
}


