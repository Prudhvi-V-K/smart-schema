import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { generateObject } from "ai"
import { z } from "zod"
import { createGoogleGenerativeAI } from "@ai-sdk/google"

const ColumnSchema = z.object({
  name: z.string(),
  type: z.string(),
  nullable: z.boolean(),
  isPrimaryKey: z.boolean(),
  isForeignKey: z.boolean().optional(),
  foreignKeyTable: z.string().optional(),
})

const TableSchema = z.object({
  name: z.string(),
  columns: z.array(ColumnSchema),
})

const ChatResponseSchema = z.object({
  reply: z.string(),
  updated: z
    .object({
      tables: z.array(TableSchema),
      summary: z.string(),
    })
    .optional(),
})

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { schema, message, chatHistory = [] } = body as { 
      schema: any; 
      message: string;
      chatHistory?: Array<{ role: "user" | "assistant"; content: string }>;
    }

    if (!schema || !Array.isArray(schema?.tables) || typeof message !== "string") {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 })
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
    const configuredModel =
      process.env.GEMINI_MODEL || "gemini-1.5-flash-latest"
    const primaryModelName = configuredModel.startsWith("models/")
      ? configuredModel
      : `models/${configuredModel}`
    const fallbackModelName =
      primaryModelName === "models/gemini-1.5-flash-latest"
        ? "models/gemini-1.5-pro-latest"
        : "models/gemini-1.5-flash-latest"

    const attemptGenerate = async (modelName: string) => {
      const model = google(modelName)
      return generateObject({
        model,
        schema: ChatResponseSchema,
        prompt: `You are a senior database engineer having a conversation with a user about their database schema. You have full context about the generated schema, including why it was designed this way and which database is recommended. Your goals:
1) Answer questions about the schema clearly and helpfully, explaining database concepts when needed.
2) Reference the schema explanation and rationale when relevant to provide context.
3) If the user requests a schema change, evaluate if it's valid and beneficial:
   - If valid: return an updated schema (tables + summary) in the "updated" field
   - If invalid: explain why it's not recommended and don't update
4) Maintain referential integrity, primary keys, and reasonable data types.
5) Be conversational and helpful - this is a one-on-one discussion to resolve doubts.

Current Schema:
${tablesSummary}${explanationContext}${conversationHistory}

Current User Message:
${message}

Return JSON with fields: 
- reply (string): Your conversational response
- updated (optional object): Only include if you're making a valid schema change. Should have "tables" (array) and "summary" (string).

Important: Only suggest schema updates when the user explicitly requests changes or when you identify critical issues. For questions, just provide explanations without updating the schema. Use the schema explanation context to provide informed answers about design decisions.`,
      })
    }

    const tablesSummary = schema.tables
      .map(
        (t: any) =>
          `- ${t.name}: ${t.columns
            .map((c: any) => `${c.name}${c.isPrimaryKey ? "(pk)" : c.isForeignKey ? "(fk->" + (c.foreignKeyTable || "?") + ")" : ""}`)
            .join(", ")}`,
      )
      .join("\n")

    // Include explanation context if available
    const explanationContext = schema.explanation
      ? `\n\nSchema Explanation & Rationale:\n${schema.explanation}`
      : ""

    const conversationHistory = chatHistory.length > 0
      ? `\n\nPrevious Conversation:\n${chatHistory
          .slice(-6)
          .map((m: any) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
          .join("\n")}`
      : ""

    let object
    try {
      console.log("[schema-chat] Using Gemini model:", primaryModelName)
      object = (await attemptGenerate(primaryModelName)).object
    } catch (primaryError) {
      console.warn("[schema-chat] Primary model failed, attempting fallback:", primaryError)
      try {
        console.log("[schema-chat] Using fallback Gemini model:", fallbackModelName)
        object = (await attemptGenerate(fallbackModelName)).object
      } catch (fallbackError) {
        console.error("[schema-chat] Fallback model also failed:", fallbackError)
        return NextResponse.json(
          {
            error:
              "The AI service is currently overloaded. Please wait a moment and try again.",
          },
          { status: 503 },
        )
      }
    }

    const reply = object.reply
    const updated = object.updated

    if (!updated) {
      return NextResponse.json({ reply })
    }

    // Transform updated to internal GeneratedSchema shape
    const updatedSchema = {
      tables: updated.tables.map((table: any, tableIndex: number) => ({
        id: `table-${tableIndex}-${Date.now()}`,
        name: table.name,
        columns: table.columns.map((col: any, colIndex: number) => ({
          id: `col-${tableIndex}-${colIndex}-${Date.now()}`,
          name: col.name,
          type: col.type,
          nullable: col.nullable,
          isPrimaryKey: col.isPrimaryKey,
          isForeignKey: col.isForeignKey,
          foreignKeyTable: col.foreignKeyTable,
        })),
      })),
      description: updated.summary,
      explanation: schema.explanation, // Preserve existing explanation
      timestamp: new Date().toISOString(),
    }

    return NextResponse.json({ reply, updatedSchema })
  } catch (error) {
    console.error("[schema-chat] Error:", error)
    return NextResponse.json({ error: "Failed to process chat" }, { status: 500 })
  }
}


