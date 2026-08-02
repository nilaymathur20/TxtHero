import { NextResponse } from "next/server";

export async function middleware(request) {
  return NextResponse.next();
}

export const config = { matcher: ["/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|webmanifest)).*)", "/(api)(.*)"] };
