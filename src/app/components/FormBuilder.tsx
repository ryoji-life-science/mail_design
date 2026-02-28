"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { FormData, FormQuestion, QuestionType } from "@/lib/types";
import QuestionEditor from "./QuestionEditor";

function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

function createNewQuestion(): FormQuestion {
  return {
    id: generateId(),
    title: "",
    type: "SHORT_ANSWER",
    required: false,
  };
}

export default function FormBuilder() {
  const { data: session } = useSession();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [questions, setQuestions] = useState<FormQuestion[]>([
    createNewQuestion(),
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{
    formId: string;
    responderUri: string;
    editUri: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const addQuestion = () => {
    setQuestions([...questions, createNewQuestion()]);
  };

  const updateQuestion = (id: string, updated: Partial<FormQuestion>) => {
    setQuestions(
      questions.map((q) => (q.id === id ? { ...q, ...updated } : q))
    );
  };

  const deleteQuestion = (id: string) => {
    if (questions.length <= 1) return;
    setQuestions(questions.filter((q) => q.id !== id));
  };

  const moveQuestion = (id: string, direction: "up" | "down") => {
    const idx = questions.findIndex((q) => q.id === id);
    if (
      (direction === "up" && idx === 0) ||
      (direction === "down" && idx === questions.length - 1)
    )
      return;

    const newQuestions = [...questions];
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    [newQuestions[idx], newQuestions[swapIdx]] = [
      newQuestions[swapIdx],
      newQuestions[idx],
    ];
    setQuestions(newQuestions);
  };

  const handleSubmit = async () => {
    setError(null);
    setResult(null);

    if (!title.trim()) {
      setError("フォームのタイトルを入力してください。");
      return;
    }

    const emptyQuestions = questions.filter((q) => !q.title.trim());
    if (emptyQuestions.length > 0) {
      setError("すべての質問にタイトルを入力してください。");
      return;
    }

    setIsSubmitting(true);

    try {
      const formData: FormData = {
        title: title.trim(),
        description: description.trim() || undefined,
        questions,
      };

      const res = await fetch("/api/forms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "エラーが発生しました");
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setTitle("");
    setDescription("");
    setQuestions([createNewQuestion()]);
    setResult(null);
    setError(null);
  };

  if (!session) {
    return (
      <div className="max-w-2xl mx-auto mt-20 text-center">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-10">
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">
            Google Forms Generator
          </h2>
          <p className="text-gray-500 mb-6">
            Googleアカウントでログインして、フォームを自動生成しましょう。
          </p>
          <p className="text-sm text-gray-400">
            右上の「Googleでログイン」ボタンからログインしてください。
          </p>
        </div>
      </div>
    );
  }

  if (result) {
    return (
      <div className="max-w-2xl mx-auto mt-10">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">
            フォームが作成されました！
          </h2>
          <p className="text-gray-500 mb-6">
            Googleフォームが正常に生成されました。
          </p>
          <div className="space-y-3">
            <a
              href={result.responderUri}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full bg-purple-600 text-white px-4 py-3 rounded-lg hover:bg-purple-700 transition font-medium"
            >
              回答用フォームを開く
            </a>
            <a
              href={result.editUri}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full bg-white text-purple-600 border border-purple-600 px-4 py-3 rounded-lg hover:bg-purple-50 transition font-medium"
            >
              編集画面を開く
            </a>
            <button
              onClick={handleReset}
              className="block w-full text-gray-500 px-4 py-3 rounded-lg hover:bg-gray-100 transition"
            >
              新しいフォームを作成
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      {/* Form meta */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5 mb-6">
        <div className="border-t-4 border-purple-600 -mt-5 -mx-5 mb-5 rounded-t-lg" />
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="フォームのタイトル"
          className="w-full text-2xl font-bold border-b border-gray-200 pb-3 mb-3 focus:border-purple-500 focus:outline-none transition placeholder-gray-300"
        />
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="フォームの説明（任意）"
          className="w-full text-sm text-gray-600 border-b border-gray-200 pb-2 focus:border-purple-500 focus:outline-none transition placeholder-gray-300"
        />
      </div>

      {/* Questions */}
      <div className="space-y-4 mb-6">
        {questions.map((q, i) => (
          <QuestionEditor
            key={q.id}
            question={q}
            index={i}
            onUpdate={updateQuestion}
            onDelete={deleteQuestion}
            onMoveUp={(id) => moveQuestion(id, "up")}
            onMoveDown={(id) => moveQuestion(id, "down")}
            isFirst={i === 0}
            isLast={i === questions.length - 1}
          />
        ))}
      </div>

      {/* Add question button */}
      <button
        onClick={addQuestion}
        className="w-full border-2 border-dashed border-gray-300 rounded-lg py-4 text-gray-500 hover:border-purple-400 hover:text-purple-600 transition flex items-center justify-center gap-2"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        質問を追加
      </button>

      {/* Error */}
      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Submit */}
      <div className="mt-8 flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="bg-purple-600 text-white px-8 py-3 rounded-lg hover:bg-purple-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isSubmitting ? (
            <>
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              作成中...
            </>
          ) : (
            "フォームを生成"
          )}
        </button>
      </div>
    </div>
  );
}
