import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { generateObject } from "ai"
import { z } from "zod"
import { createGoogleGenerativeAI } from "@ai-sdk/google"

const ExplanationSchema = z.object({
  explanation: z.string(),
})

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { schema } = body as { schema: any }

    if (!schema || !Array.isArray(schema?.tables)) {
      return NextResponse.json({ error: "Invalid schema" }, { status: 400 })
    }

    const provider = process.env.AI_PROVIDER || "gemini"
    const apiKey = process.env.AI_API_KEY

    if (provider !== "gemini") {
      return NextResponse.json({ error: "Only Gemini provider is configured" }, { status: 400 })
    }
    if (!apiKey) {
      return NextResponse.json({ error: "Missing AI_API_KEY" }, { status: 500 })
    }

    const google = createGoogleGenerativeAI({ apiKey })
    const model = google(process.env.GEMINI_MODEL || "gemini-1.5-flash")

    const tablesSummary = schema.tables
      .map(
        (t: any) =>
          `- ${t.name}: ${t.columns
            .map((c: any) => `${c.name}${c.isPrimaryKey ? "(pk)" : c.isForeignKey ? "(fk->" + (c.foreignKeyTable || "?") + ")" : ""}`)
            .join(", ")}`,
      )
      .join("\n")

    const { object } = await generateObject({
      model,
      schema: ExplanationSchema,
      prompt: `You are a database architect. Given the following relational schema, produce:
1) The most suitable database engine (choose among: PostgreSQL, MySQL, SQLite, MongoDB, DynamoDB) for typical web app deployment, and justify the choice based on transactional needs, relational integrity, indexing, scalability, and ecosystem.
2) A clear explanation of why the tables are connected as modeled (explain primary keys, foreign keys, relationships, and cardinalities).
3) Any caveats or trade-offs.

Schema Tables:\n${tablesSummary}

Return a concise yet comprehensive explanation in markdown-style prose.`,
    })

    return NextResponse.json({ explanation: object.explanation })
  } catch (error) {
    console.error("[explain-schema] Error:", error)
    return NextResponse.json({ error: "Failed to generate explanation" }, { status: 500 })
  }
}


