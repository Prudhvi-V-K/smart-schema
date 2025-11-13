import type { GeneratedSchema } from "@/app/page"

const prismaTypeMap = {
  string: "String",
  integer: "Int",
  boolean: "Boolean",
  timestamp: "DateTime",
  decimal: "Decimal",
  json: "Json",
  text: "String",
  uuid: "String",
}

const sqlTypeMap = {
  postgresql: {
    string: "VARCHAR(255)",
    integer: "INTEGER",
    boolean: "BOOLEAN",
    timestamp: "TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
    decimal: "DECIMAL(10,2)",
    json: "JSONB",
    text: "TEXT",
    uuid: "UUID",
  },
  mysql: {
    string: "VARCHAR(255)",
    integer: "INT",
    boolean: "BOOLEAN",
    timestamp: "TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
    decimal: "DECIMAL(10,2)",
    json: "JSON",
    text: "LONGTEXT",
    uuid: "CHAR(36)",
  },
  sqlite: {
    string: "TEXT",
    integer: "INTEGER",
    boolean: "INTEGER",
    timestamp: "DATETIME DEFAULT CURRENT_TIMESTAMP",
    decimal: "REAL",
    json: "TEXT",
    text: "TEXT",
    uuid: "TEXT",
  },
}

function mapSqlType(type: string, dialect: "postgresql" | "mysql" | "sqlite"): string {
  return sqlTypeMap[dialect][type as keyof (typeof sqlTypeMap)["postgresql"]] || "TEXT"
}

function mapPrismaType(type: string, nullable: boolean): string {
  const baseType = prismaTypeMap[type as keyof typeof prismaTypeMap] || "String"
  return nullable ? `${baseType}?` : baseType
}

export function generatePrismaSchema(schema: GeneratedSchema): string {
  if (!schema?.tables || schema.tables.length === 0) return ""

  let prismaCode =
    '// Prisma Schema\n\ngenerator client {\n  provider = "prisma-client-js"\n}\n\ndatasource db {\n  provider = "postgresql"\n  url      = env("DATABASE_URL")\n}\n\n'

  prismaCode += schema.tables
    .map((table) => {
      let modelCode = `model ${table.name.charAt(0).toUpperCase() + table.name.slice(1)} {\n`

      table.columns.forEach((col) => {
        const prismaType = mapPrismaType(col.type, col.nullable)
        let fieldCode = `  ${col.name} ${prismaType}`

        if (col.isPrimaryKey) fieldCode += " @id"
        if (col.type === "timestamp") fieldCode += " @default(now())"

        fieldCode += "\n"
        modelCode += fieldCode
      })

      modelCode += "}\n"
      return modelCode
    })
    .join("\n")

  return prismaCode
}

export function generateSQL(schema: GeneratedSchema, dialect: "postgresql" | "mysql" | "sqlite"): string {
  if (!schema?.tables || schema.tables.length === 0) return ""

  return schema.tables
    .map((table) => {
      const columnDefs = table.columns
        .map((col) => {
          let def = `  ${col.name} ${mapSqlType(col.type, dialect)}`
          if (col.isPrimaryKey) def += " PRIMARY KEY"
          if (!col.nullable) def += " NOT NULL"
          if (col.isForeignKey && col.foreignKeyTable) def += ` REFERENCES ${col.foreignKeyTable}(id)`
          return def
        })
        .join(",\n")

      return `CREATE TABLE ${table.name} (\n${columnDefs}\n);`
    })
    .join("\n\n")
}

export function generateDrizzleSchema(schema: GeneratedSchema): string {
  if (!schema?.tables || schema.tables.length === 0) return ""

  let drizzleCode =
    "import { pgTable, serial, varchar, integer, boolean, timestamp, decimal, jsonb } from 'drizzle-orm/pg-core';\n\n"

  drizzleCode += schema.tables
    .map((table) => {
      let tableCode = `export const ${table.name} = pgTable('${table.name}', {\n`

      table.columns.forEach((col) => {
        let fieldCode = `  ${col.name}: `

        switch (col.type) {
          case "string":
            fieldCode += "varchar(255)"
            break
          case "integer":
            fieldCode += "serial()"
            break
          case "boolean":
            fieldCode += "boolean()"
            break
          case "timestamp":
            fieldCode += "timestamp().defaultNow()"
            break
          case "decimal":
            fieldCode += "decimal('10,2')"
            break
          case "json":
            fieldCode += "jsonb()"
            break
          default:
            fieldCode += "varchar(255)"
        }

        if (col.isPrimaryKey) fieldCode += ".primaryKey()"
        if (!col.nullable) fieldCode += ".notNull()"

        fieldCode += ",\n"
        tableCode += fieldCode
      })

      tableCode += "});\n"
      return tableCode
    })
    .join("\n")

  return drizzleCode
}

export function generateAllCodeFormats(schema: GeneratedSchema) {
  return {
    sql: {
      postgresql: generateSQL(schema, "postgresql"),
      mysql: generateSQL(schema, "mysql"),
      sqlite: generateSQL(schema, "sqlite"),
    },
    prisma: generatePrismaSchema(schema),
    drizzle: generateDrizzleSchema(schema),
  }
}

