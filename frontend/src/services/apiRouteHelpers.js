import { NextResponse } from "next/server";
import { ApiError } from "@/services/httpClient";

/** Shared try/catch for every app/api/* route handler — turns ApiError into the right HTTP status. */
export async function withErrorHandling(handler) {
  try {
    return await handler();
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { message: error.message, errors: error.errors },
        { status: error.status }
      );
    }
    console.error(error);
    return NextResponse.json({ message: "Unexpected error" }, { status: 500 });
  }
}
