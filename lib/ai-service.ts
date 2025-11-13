import { generateObject } from "ai";
import { z } from "zod";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
const ColumnSchema = z.object({
  name: z.string().describe("Column name in snake_case"),
  type: z
    .enum([
      "string",
      "integer",
      "boolean",
      "timestamp",
      "decimal",
      "json",
      "text",
      "uuid",
    ])
    .describe("Data type"),
  nullable: z.boolean().describe("Whether the column can be null"),
  isPrimaryKey: z.boolean().describe("Whether this is a primary key"),
  isForeignKey: z.boolean().describe("Whether this is a foreign key"),
  foreignKeyTable: z
    .string()
    .optional()
    .describe("Table name if this is a foreign key"),
});

const TableSchema = z.object({
  name: z.string().describe("Table name in snake_case"),
  columns: z.array(ColumnSchema).describe("Array of columns"),
});

const SchemaGenerationSchema = z.object({
  tables: z.array(TableSchema).describe("Array of tables"),
  summary: z.string().describe("Brief summary of the generated schema"),
  explanation: z.string().describe("Comprehensive explanation including: 1) Recommended database engine (PostgreSQL, MySQL, SQLite, MongoDB, or DynamoDB) with justification, 2) Explanation of table relationships and connections, 3) Any caveats or trade-offs. Format in markdown-style prose."),
});

export async function generateSchemaWithAI(description: string) {
  try {
    const provider = process.env.AI_PROVIDER || "gemini";
    const apiKey = process.env.AI_API_KEY;

    const prompt = `You are an expert database architect. Based on the following description, generate a comprehensive database schema along with a detailed explanation.

Description: ${description}

Requirements:
1. Create appropriate tables with clear, descriptive names in snake_case
2. Define all necessary columns with correct data types
3. Mark primary keys appropriately (typically id field)
4. Include foreign keys where relationships exist between tables
5. Use appropriate data types (string for text, integer for numbers, timestamp for dates, etc.)
6. Ensure the schema is normalized and efficient
7. Include common fields like created_at, updated_at for tracking
8. For relationships, ensure foreign key columns reference the correct tables
9. Make columns nullable only when they are optional

In addition to the schema, provide a comprehensive explanation that includes:
1) The most suitable database engine (choose among: PostgreSQL, MySQL, SQLite, MongoDB, DynamoDB) for typical web app deployment, with justification based on transactional needs, relational integrity, indexing, scalability, and ecosystem
2) A clear explanation of why the tables are connected as modeled (explain primary keys, foreign keys, relationships, and cardinalities)
3) Any caveats or trade-offs

Return a complete, production-ready schema with explanation that fully addresses the requirements.`;

    // Initialize model based on provider
    let object: z.infer<typeof SchemaGenerationSchema> | null = null;
    if (provider === "gemini") {
      if (!apiKey) {
        throw new Error(
          "AI_API_KEY environment variable is required for Gemini provider"
        );
      }
      const google = createGoogleGenerativeAI({
        apiKey: apiKey,
      });
      const preferredModel =
        process.env.GEMINI_MODEL && process.env.GEMINI_MODEL.trim().length > 0
          ? process.env.GEMINI_MODEL.trim()
          : "gemini-2.0-flash";

      const configuredFallbacks =
        process.env.GEMINI_FALLBACK_MODELS?.split(",")
          .map((entry) => entry.trim())
          .filter((entry) => entry.length > 0) ?? [];

      const normalizeModelName = (modelName: string) =>
        modelName.startsWith("models/") ? modelName : `models/${modelName}`;

      const fallbackModels = [
        preferredModel,
        ...configuredFallbacks,
        "gemini-2.0-flash",
        "gemini-1.5-flash-latest",
        "gemini-1.5-flash-001",
        "gemini-1.5-pro",
        "gemini-1.0-pro",
      ]
        .map(normalizeModelName)
        .filter((value, index, self) => self.indexOf(value) === index);

      const attemptGenerate = async (modelName: string) => {
        console.log("[v0] Using AI provider: gemini with model:", modelName);
        const resolvedModel = google(modelName);
        return generateObject({
          model: resolvedModel,
          schema: SchemaGenerationSchema,
          prompt,
        });
      };

      let lastError: unknown = null;

      for (const modelName of fallbackModels) {
        try {
          const response = await attemptGenerate(modelName);
          object = response.object;
          break;
        } catch (err) {
          lastError = err;
          const maybeStatus =
            (err as any)?.statusCode ??
            (err as any)?.status ??
            (err as any)?.cause?.status;
          const message =
            (err as any)?.message?.toLowerCase?.() ??
            (err?.toString?.() ?? "").toLowerCase();
          console.warn("[v0] Model attempt failed:", modelName, err);

          // Retry only on transient errors (429, 5xx, etc.) or when model is missing (404/not found)
          const transientStatuses = [undefined, 408, 425, 429, 500, 502, 503, 504];
          const isMissingModel =
            maybeStatus === 404 || message.includes("not found");

          if (!transientStatuses.includes(maybeStatus) && !isMissingModel) {
            throw err;
          }
        }
      }

      if (!object) {
        const fallbackMessage =
          "The AI service is currently unavailable. Please wait a moment and try again.";
        if (lastError instanceof Error) {
          throw new Error(`${fallbackMessage}\nLast error: ${lastError.message}`);
        }
        throw new Error(fallbackMessage);
      }
    } else if (provider === "openai") {
      // For OpenAI, you would use @ai-sdk/openai similarly
      throw new Error("OpenAI provider not yet configured. Please use 'gemini' as the AI_PROVIDER.");
    } else {
      throw new Error(`Unsupported AI provider: ${provider}`);
    }

    if (!object) {
      throw new Error("Failed to obtain a response from the AI provider.");
    }

    // Transform the AI-generated object into our internal format
    const schema = {
      tables: object.tables.map((table, tableIndex) => ({
        id: `table-${tableIndex}-${Date.now()}`,
        name: table.name,
        columns: table.columns.map((col, colIndex) => ({
          id: `col-${tableIndex}-${colIndex}-${Date.now()}`,
          name: col.name,
          type: col.type,
          nullable: col.nullable,
          isPrimaryKey: col.isPrimaryKey,
          isForeignKey: col.isForeignKey,
          foreignKeyTable: col.foreignKeyTable,
        })),
      })),
      description: object.summary,
      explanation: object.explanation,
      timestamp: new Date().toISOString(),
    };

    return schema;
  } catch (error) {
    console.error("[v0] AI Service Error:", error);
    const fallbackMessage =
      "Failed to generate schema with AI. Please check your API configuration and try again.";
    if (error instanceof Error) {
      throw new Error(`${fallbackMessage}\nDetails: ${error.message}`);
    }
    throw new Error(fallbackMessage);
  }
}
