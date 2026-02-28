import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createGoogleForm } from "@/lib/google-forms";
import { FormData } from "@/lib/types";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.accessToken) {
    return NextResponse.json(
      { error: "認証が必要です。Googleアカウントでログインしてください。" },
      { status: 401 }
    );
  }

  try {
    const body: FormData = await req.json();

    if (!body.title) {
      return NextResponse.json(
        { error: "フォームのタイトルは必須です。" },
        { status: 400 }
      );
    }

    if (!body.questions || body.questions.length === 0) {
      return NextResponse.json(
        { error: "質問を1つ以上追加してください。" },
        { status: 400 }
      );
    }

    const result = await createGoogleForm(session.accessToken, body);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Form creation error:", error);
    return NextResponse.json(
      { error: error.message || "フォームの作成中にエラーが発生しました。" },
      { status: 500 }
    );
  }
}
