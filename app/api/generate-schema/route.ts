import { generateSchemaWithAI } from "@/lib/ai-service"
import { generateAllCodeFormats } from "@/lib/code-generator"
import { getDb } from "@/lib/mongodb"
import { auth } from "@clerk/nextjs/server"
import { type NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { description, projectId } = body

    if (!description || typeof description !== "string") {
      return NextResponse.json({ error: "Invalid description provided" }, { status: 400 })
    }

    const schema = await generateSchemaWithAI(description)

    // Generate all code formats
    const codeFormats = generateAllCodeFormats(schema)

    // Save to MongoDB
    const db = await getDb()
    const now = new Date()

    // Generate project name from description
    const projectName = description.substring(0, 50).trim() || "Untitled Project"

    let createdProjectId: string | null = null

    if (projectId) {
      // Update existing project
      const { ObjectId } = await import("mongodb")
      if (ObjectId.isValid(projectId)) {
        await db.collection("projects").findOneAndUpdate(
          { _id: new ObjectId(projectId), userId },
          {
            $set: {
              projectName,
              description,
              schema,
              explanation: schema.explanation || null,
              codeFormats,
              updatedAt: now,
            },
          }
        )
        createdProjectId = projectId
      }
    } else {
      // Create new project
      const { ObjectId } = await import("mongodb")
      const result = await db.collection("projects").insertOne({
        userId,
        projectName,
        description,
        schema,
        explanation: schema.explanation || null,
        codeFormats,
        createdAt: now,
        updatedAt: now,
      })
      createdProjectId = result.insertedId.toString()
    }

    return NextResponse.json({
      ...schema,
      projectId: createdProjectId,
    })
  } catch (error) {
    console.error("API Error:", error)

    const errorMessage = error instanceof Error ? error.message : "Failed to generate schema"

    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
