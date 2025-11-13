This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

SmartSchema is an AI-powered database schema generator with authentication, project management, and query history. It uses Clerk for authentication, Prisma with PostgreSQL for data storage, and Google Gemini for AI-powered schema generation.

## Features

- 🔐 **Clerk Authentication**: Secure user authentication and management
- 📁 **Project Management**: Organize your database schemas into projects (like ChatGPT history)
- 💾 **Query History**: All generated SQL schemas and explanations are saved to the database
- 🤖 **AI-Powered**: Generate database schemas using Google Gemini AI
- 📊 **Visual Diagrams**: View ER diagrams of your generated schemas
- 📝 **Multiple Formats**: Export to SQL, Prisma, or Drizzle ORM formats

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL database
- Clerk account (for authentication)
- Google Gemini API key (for AI generation)

## Setup

### 1. Clone the repository

```bash
git clone <repository-url>
cd smart-schema
npm install
```

### 2. Set up Clerk Authentication

1. Create a Clerk account at [clerk.com](https://clerk.com)
2. Create a new application
3. Copy your Clerk keys from the dashboard

### 3. Set up PostgreSQL Database

1. Install PostgreSQL on your machine or use a cloud service like [Supabase](https://supabase.com) or [Neon](https://neon.tech)
2. Create a new database
3. Copy your database connection URL

### 4. Set up Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key_here
CLERK_SECRET_KEY=your_clerk_secret_key_here

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/smart_schema?schema=public

# AI Provider
AI_PROVIDER=gemini
AI_API_KEY=your_google_gemini_api_key_here
GEMINI_MODEL=gemini-1.5-flash
```

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: Your Clerk publishable key (get from Clerk dashboard)
- `CLERK_SECRET_KEY`: Your Clerk secret key (get from Clerk dashboard)
- `DATABASE_URL`: Your PostgreSQL database connection URL
- `AI_PROVIDER`: The AI provider to use (currently supports `gemini`)
- `AI_API_KEY`: Your Google Gemini API key (get from [Google AI Studio](https://makersuite.google.com/app/apikey))
- `GEMINI_MODEL`: The Gemini model to use (optional, defaults to `gemini-1.5-flash`)

### 5. Set up the Database

Run Prisma migrations to create the database schema:

```bash
npx prisma generate
npx prisma migrate dev --name init
```

This will create the following tables:
- `users`: User accounts linked to Clerk
- `projects`: Project/folder structure for organizing queries
- `queries`: Stored SQL schemas and explanations

## Getting Started

1. **Generate Prisma Client**:
   ```bash
   npx prisma generate
   ```

2. **Run Database Migrations**:
   ```bash
   npx prisma migrate dev --name init
   ```

3. **Start the Development Server**:
   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   # or
   bun dev
   ```

4. **Open your browser**:
   Navigate to [http://localhost:3000](http://localhost:3000)

5. **Sign in**: You'll be prompted to sign in with Clerk

## Usage

1. **Create a Project**: Click "New Project" in the sidebar to organize your schemas
2. **Generate Schema**: Enter a description of your database requirements and click "Generate Schema with AI"
3. **View Results**: View the ER diagram, SQL scripts, and explanations
4. **Access History**: All generated schemas are saved and can be accessed from the project sidebar

## Project Structure

- **Projects**: Organize your database schemas into projects (like ChatGPT conversations)
- **Queries**: Each generated schema is saved as a query with:
  - SQL code
  - Explanation
  - Schema data (tables, columns, relationships)
  - Timestamp

## Database Schema

The application uses Prisma with PostgreSQL to store:
- **Users**: Linked to Clerk user IDs
- **Projects**: Folder structure for organizing queries
- **Queries**: SQL schemas, explanations, and metadata

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
