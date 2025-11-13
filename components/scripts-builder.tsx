"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Copy, Download } from "lucide-react"
import type { GeneratedSchema } from "@/app/page"

interface ScriptsBuilderProps {
  schema: GeneratedSchema | null
}

export default function ScriptsBuilder({ schema }: ScriptsBuilderProps) {
  const [selectedTab, setSelectedTab] = useState<"sql" | "prisma" | "drizzle">("sql")
  const [selectedDialect, setSelectedDialect] = useState<"postgresql" | "mysql" | "sqlite">("postgresql")
  const [copied, setCopied] = useState(false)

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

  const mapSqlType = (type: string): string => {
    return sqlTypeMap[selectedDialect][type as keyof (typeof sqlTypeMap)["postgresql"]] || "TEXT"
  }

  const mapPrismaType = (type: string, nullable: boolean): string => {
    const baseType = prismaTypeMap[type as keyof typeof prismaTypeMap] || "String"
    return nullable ? `${baseType}?` : baseType
  }

  const generatePrismaSchema = (): string => {
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

  const generateSQL = (): string => {
    if (!schema?.tables || schema.tables.length === 0) return ""

    return schema.tables
      .map((table) => {
        const columnDefs = table.columns
          .map((col) => {
            let def = `  ${col.name} ${mapSqlType(col.type)}`
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

  const generateDrizzleSchema = (): string => {
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

  const getCode = () => {
    if (selectedTab === "prisma") return generatePrismaSchema()
    if (selectedTab === "drizzle") return generateDrizzleSchema()
    return generateSQL()
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }

  const downloadFile = (text: string, filename: string) => {
    const element = document.createElement("a")
    element.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent(text))
    element.setAttribute("download", filename)
    element.style.display = "none"
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  if (!schema?.tables || schema.tables.length === 0) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-12 pb-12 text-center">
            <p className="text-muted-foreground">No schema defined yet. Generate a schema in the Generator tab.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const code = getCode()
  const extension = selectedTab === "sql" ? "sql" : selectedTab === "prisma" ? "prisma" : "ts"

  return (
    <div className="p-6 space-y-6">
      {/* Tab Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Code Generation</CardTitle>
          <CardDescription>Generate schema code in your preferred format</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 flex-wrap">
            {["sql", "prisma", "drizzle"].map((tab) => (
              <Button
                key={tab}
                variant={selectedTab === tab ? "default" : "outline"}
                onClick={() => setSelectedTab(tab as any)}
                className="capitalize"
              >
                {tab}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Dialect Selector for SQL */}
      {selectedTab === "sql" && (
        <Card>
          <CardHeader>
            <CardTitle>SQL Dialect</CardTitle>
            <CardDescription>Choose your database dialect</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3 flex-wrap">
              {["postgresql", "mysql", "sqlite"].map((dialect) => (
                <Button
                  key={dialect}
                  variant={selectedDialect === dialect ? "default" : "outline"}
                  onClick={() => setSelectedDialect(dialect as any)}
                  className="capitalize"
                >
                  {dialect}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Code Display */}
      <Card>
        <CardHeader>
          <CardTitle>
            {selectedTab === "sql"
              ? "CREATE TABLE Statements"
              : selectedTab === "prisma"
                ? "Prisma Schema"
                : "Drizzle Schema"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="bg-muted p-4 rounded-lg font-mono text-sm max-h-96 overflow-auto border border-border">
            <pre className="text-foreground whitespace-pre-wrap break-words">{code}</pre>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 gap-2 bg-transparent" onClick={() => copyToClipboard(code)}>
              <Copy className="w-4 h-4" />
              {copied ? "Copied!" : "Copy"}
            </Button>
            <Button
              variant="outline"
              className="flex-1 gap-2 bg-transparent"
              onClick={() => downloadFile(code, `schema.${extension}`)}
            >
              <Download className="w-4 h-4" />
              Download
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
