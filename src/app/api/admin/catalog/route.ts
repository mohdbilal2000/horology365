import { NextResponse } from "next/server";
import {
  listModels,
  saveModel,
  softDeleteModel,
  restoreModel,
  adjustVariantStock,
  startVariantDelivery,
  persistenceIsDurable,
} from "@/lib/admin/catalogRepo";
import { journalIsDurable, journalLocation } from "@/lib/storage/journal";
import type { AdminModel } from "@/lib/types";

/**
 * Server-side admin catalog.
 *
 * Authentication is handled by `middleware.ts`, which 401s any /api/admin/*
 * request without a valid session — so these handlers can assume an admin.
 *
 * There is no DELETE verb here on purpose. Removal is a soft delete via
 * `action: "delete"`, which keeps the row and writes an audit entry, so an
 * admin can never destroy a record.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ACTOR = "admin";

export async function GET(request: Request): Promise<NextResponse> {
  const includeDeleted =
    new URL(request.url).searchParams.get("includeDeleted") === "true";
  const models = await listModels({ includeDeleted });

  return NextResponse.json({
    models,
    storage: {
      durable: persistenceIsDurable(),
      journalDurable: journalIsDurable(),
      journalPath: journalLocation(),
    },
  });
}

type Body =
  | { action: "save"; model: AdminModel }
  | { action: "delete"; id: string }
  | { action: "restore"; id: string }
  | { action: "adjustStock"; id: string; variantId: string; delta: number }
  | { action: "startDelivery"; id: string; variantId: string };

/** Minimal shape check — enough to reject junk before it reaches storage. */
function isValidModel(value: unknown): value is AdminModel {
  if (!value || typeof value !== "object") return false;
  const m = value as Partial<AdminModel>;
  return (
    typeof m.id === "string" &&
    m.id.length > 0 &&
    typeof m.title === "string" &&
    m.title.trim().length > 0 &&
    typeof m.brandSlug === "string" &&
    typeof m.price === "number" &&
    Number.isFinite(m.price) &&
    Array.isArray(m.variants)
  );
}

export async function POST(request: Request): Promise<NextResponse> {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  try {
    switch (body.action) {
      case "save": {
        if (!isValidModel(body.model)) {
          return NextResponse.json(
            { error: "Model is missing required fields." },
            { status: 422 },
          );
        }
        return NextResponse.json({ model: await saveModel(body.model, ACTOR) });
      }
      case "delete": {
        if (!body.id) return NextResponse.json({ error: "Missing id." }, { status: 400 });
        return NextResponse.json({ model: await softDeleteModel(body.id, ACTOR) });
      }
      case "restore": {
        if (!body.id) return NextResponse.json({ error: "Missing id." }, { status: 400 });
        return NextResponse.json({ model: await restoreModel(body.id, ACTOR) });
      }
      case "adjustStock": {
        if (!body.id || !body.variantId || !Number.isFinite(body.delta)) {
          return NextResponse.json({ error: "Missing id, variantId or delta." }, { status: 400 });
        }
        return NextResponse.json({
          model: await adjustVariantStock(body.id, body.variantId, body.delta, ACTOR),
        });
      }
      case "startDelivery": {
        if (!body.id || !body.variantId) {
          return NextResponse.json({ error: "Missing id or variantId." }, { status: 400 });
        }
        return NextResponse.json({
          model: await startVariantDelivery(body.id, body.variantId, ACTOR),
        });
      }
      default:
        return NextResponse.json({ error: "Unknown action." }, { status: 400 });
    }
  } catch (err) {
    console.error("[admin/catalog] write failed:", err);
    return NextResponse.json(
      { error: "Could not save the change. It has not been applied." },
      { status: 500 },
    );
  }
}
