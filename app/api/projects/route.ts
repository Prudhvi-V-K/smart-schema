import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { getDb } from "@/lib/mongodb"
import { ObjectId } from "mongodb"

export const runtime = "nodejs"

// GET - List all projects for the current user
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const db = await getDb()
    const projects = await db
      .collection("projects")
      .find({ userId })
      .sort({ updatedAt: -1 })
      .toArray()

    // Convert ObjectId to string for JSON serialization
    const projectsWithStringIds = projects.map((project) => ({
      ...project,
      _id: project._id.toString(),
    }))

    return NextResponse.json(projectsWithStringIds)
  } catch (error) {
    console.error("[projects] GET Error:", error)
    return NextResponse.json({ error: "Failed to fetch projects" }, { status: 500 })
  }
}

// POST - Create a new project
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { projectName, description, schema, explanation, codeFormats } = body

    if (!description || typeof description !== "string") {
      return NextResponse.json({ error: "Description is required" }, { status: 400 })
    }

    const db = await getDb()
    const now = new Date()

    // Generate project name from description if not provided
    const finalProjectName =
      projectName || description.substring(0, 50).trim() || "Untitled Project"

    const project = {
      userId,
      projectName: finalProjectName,
      description,
      schema: schema || null,
      explanation: explanation || null,
      codeFormats: codeFormats || null,
      createdAt: now,
      updatedAt: now,
    }

    const result = await db.collection("projects").insertOne(project)

    return NextResponse.json({
      ...project,
      _id: result.insertedId.toString(),
    })
  } catch (error) {
    console.error("[projects] POST Error:", error)
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 })
  }
}

