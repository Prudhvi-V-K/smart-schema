import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { getDb } from "@/lib/mongodb"
import { ObjectId } from "mongodb"

export const runtime = "nodejs"

// GET - Get a specific project
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid project ID" }, { status: 400 })
    }

    const db = await getDb()
    const project = await db.collection("projects").findOne({
      _id: new ObjectId(id),
      userId,
    })

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    return NextResponse.json({
      ...project,
      _id: project._id.toString(),
    })
  } catch (error) {
    console.error("[projects] GET Error:", error)
    return NextResponse.json({ error: "Failed to fetch project" }, { status: 500 })
  }
}

// PUT - Update a project
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid project ID" }, { status: 400 })
    }

    const body = await request.json()
    const { projectName, description, schema, explanation, codeFormats } = body

    const db = await getDb()

    // Check if project exists and belongs to user
    const existingProject = await db.collection("projects").findOne({
      _id: new ObjectId(id),
      userId,
    })

    if (!existingProject) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    // Build update object with only provided fields
    const updateFields: any = {
      updatedAt: new Date(),
    }

    if (projectName !== undefined) updateFields.projectName = projectName
    if (description !== undefined) updateFields.description = description
    if (schema !== undefined) updateFields.schema = schema
    if (explanation !== undefined) updateFields.explanation = explanation
    if (codeFormats !== undefined) updateFields.codeFormats = codeFormats

    const result = await db.collection("projects").findOneAndUpdate(
      { _id: new ObjectId(id), userId },
      { $set: updateFields },
      { returnDocument: "after" }
    )

    if (!result) {
      return NextResponse.json({ error: "Failed to update project" }, { status: 500 })
    }

    return NextResponse.json({
      ...result,
      _id: result._id.toString(),
    })
  } catch (error) {
    console.error("[projects] PUT Error:", error)
    return NextResponse.json({ error: "Failed to update project" }, { status: 500 })
  }
}

// DELETE - Delete a project
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid project ID" }, { status: 400 })
    }

    const db = await getDb()

    const result = await db.collection("projects").findOneAndDelete({
      _id: new ObjectId(id),
      userId,
    })

    if (!result) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, message: "Project deleted" })
  } catch (error) {
    console.error("[projects] DELETE Error:", error)
    return NextResponse.json({ error: "Failed to delete project" }, { status: 500 })
  }
}

