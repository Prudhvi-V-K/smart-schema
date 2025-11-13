import { generateSchemaWithAI } from "@/lib/ai-service"
import { type NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { description } = body

    if (!description || typeof description !== "string") {
      return NextResponse.json({ error: "Invalid description provided" }, { status: 400 })
    }

    const schema = await generateSchemaWithAI(description)

    return NextResponse.json(schema)
  } catch (error) {
    console.error("API Error:", error)

    const errorMessage = error instanceof Error ? error.message : "Failed to generate schema"

    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
