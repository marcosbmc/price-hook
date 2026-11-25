import { NextResponse } from "next/server";
import { assertCronAuthorized, CronAuthError } from "@/lib/cron-auth";
import { runPriceCheck } from "@/lib/services/price-checker";

export const runtime = "nodejs";

async function handleCron(request: Request): Promise<NextResponse> {
  try {
    assertCronAuthorized(request.headers.get("authorization"));
    const summary = await runPriceCheck();

    return NextResponse.json({
      ok: true,
      ...summary,
    });
  } catch (error) {
    if (error instanceof CronAuthError) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    console.error("Cron check-prices failed", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function GET(request: Request): Promise<NextResponse> {
  return handleCron(request);
}

export async function POST(request: Request): Promise<NextResponse> {
  return handleCron(request);
}
