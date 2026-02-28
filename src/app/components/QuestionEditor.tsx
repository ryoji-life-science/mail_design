"use client";

import { FormQuestion, QuestionType, QUESTION_TYPE_LABELS } from "@/lib/types";

interface Props {
  question: FormQuestion;
  index: number;
  onUpdate: (id: string, updated: Partial<FormQuestion>) => void;
  onDelete: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  isFirst: boolean;
  isLast: boolean;
}

const CHOICE_TYPES: QuestionType[] = [
  "MULTIPLE_CHOICE",
  "CHECKBOX",
  "DROPDOWN",
];

export default function QuestionEditor({
  question,
  index,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: Props) {
  const hasOptions = CHOICE_TYPES.includes(question.type);
  const isScale = question.type === "LINEAR_SCALE";

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5 group">
      <div className="flex items-start gap-3">
        <span className="text-sm font-medium text-purple-600 bg-purple-50 rounded-full w-7 h-7 flex items-center justify-center shrink-0 mt-1">
          {index + 1}
        </span>
        <div className="flex-1 space-y-4">
          {/* Question title */}
          <input
            type="text"
            value={question.title}
            onChange={(e) => onUpdate(question.id, { title: e.target.value })}
            placeholder="質問のタイトルを入力"
            className="w-full text-base font-medium border-b border-gray-200 pb-2 focus:border-purple-500 focus:outline-none transition"
          />

          <div className="flex flex-wrap gap-3 items-center">
            {/* Question type */}
            <select
              value={question.type}
              onChange={(e) =>
                onUpdate(question.id, {
                  type: e.target.value as QuestionType,
                  options:
                    CHOICE_TYPES.includes(e.target.value as QuestionType) &&
                    !question.options?.length
                      ? ["選択肢1"]
                      : question.options,
                })
              }
              className="text-sm border border-gray-300 rounded-md px-3 py-1.5 bg-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              {Object.entries(QUESTION_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>

            {/* Required toggle */}
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={question.required}
                onChange={(e) =>
                  onUpdate(question.id, { required: e.target.checked })
                }
                className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
              />
              必須
            </label>
          </div>

          {/* Options for choice questions */}
          {hasOptions && (
            <div className="space-y-2">
              {(question.options || []).map((opt, optIdx) => (
                <div key={optIdx} className="flex items-center gap-2">
                  <span className="text-gray-400 text-sm w-5 text-right">
                    {question.type === "CHECKBOX" ? "☐" : question.type === "MULTIPLE_CHOICE" ? "○" : `${optIdx + 1}.`}
                  </span>
                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => {
                      const newOptions = [...(question.options || [])];
                      newOptions[optIdx] = e.target.value;
                      onUpdate(question.id, { options: newOptions });
                    }}
                    placeholder={`選択肢${optIdx + 1}`}
                    className="flex-1 text-sm border-b border-gray-200 py-1 focus:border-purple-500 focus:outline-none"
                  />
                  <button
                    onClick={() => {
                      const newOptions = (question.options || []).filter(
                        (_, i) => i !== optIdx
                      );
                      onUpdate(question.id, { options: newOptions });
                    }}
                    className="text-gray-400 hover:text-red-500 transition"
                    title="選択肢を削除"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
              <button
                onClick={() =>
                  onUpdate(question.id, {
                    options: [
                      ...(question.options || []),
                      `選択肢${(question.options || []).length + 1}`,
                    ],
                  })
                }
                className="text-sm text-purple-600 hover:text-purple-800 transition"
              >
                + 選択肢を追加
              </button>
            </div>
          )}

          {/* Scale settings */}
          {isScale && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">最小値</label>
                <input
                  type="number"
                  value={question.scaleMin ?? 1}
                  onChange={(e) =>
                    onUpdate(question.id, {
                      scaleMin: parseInt(e.target.value),
                    })
                  }
                  className="w-full text-sm border border-gray-300 rounded-md px-2 py-1.5"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">最大値</label>
                <input
                  type="number"
                  value={question.scaleMax ?? 5}
                  onChange={(e) =>
                    onUpdate(question.id, {
                      scaleMax: parseInt(e.target.value),
                    })
                  }
                  className="w-full text-sm border border-gray-300 rounded-md px-2 py-1.5"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">最小ラベル</label>
                <input
                  type="text"
                  value={question.scaleMinLabel || ""}
                  onChange={(e) =>
                    onUpdate(question.id, { scaleMinLabel: e.target.value })
                  }
                  placeholder="例: 全くそう思わない"
                  className="w-full text-sm border border-gray-300 rounded-md px-2 py-1.5"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">最大ラベル</label>
                <input
                  type="text"
                  value={question.scaleMaxLabel || ""}
                  onChange={(e) =>
                    onUpdate(question.id, { scaleMaxLabel: e.target.value })
                  }
                  placeholder="例: 非常にそう思う"
                  className="w-full text-sm border border-gray-300 rounded-md px-2 py-1.5"
                />
              </div>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition">
          <button
            onClick={() => onMoveUp(question.id)}
            disabled={isFirst}
            className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 transition"
            title="上に移動"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </button>
          <button
            onClick={() => onMoveDown(question.id)}
            disabled={isLast}
            className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 transition"
            title="下に移動"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <button
            onClick={() => onDelete(question.id)}
            className="p-1 text-gray-400 hover:text-red-500 transition"
            title="質問を削除"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
