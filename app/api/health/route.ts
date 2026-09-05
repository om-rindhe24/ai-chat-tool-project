export const runtime = "nodejs"

export async function GET() {
  return Response.json({
    ok: true,
    geminiApiKeyConfigured: Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim()),
    expectedVariable: "GOOGLE_GENERATIVE_AI_API_KEY",
    runtime: "nodejs",
  })
}
