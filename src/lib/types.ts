export type QuestionType =
  | "SHORT_ANSWER"
  | "PARAGRAPH"
  | "MULTIPLE_CHOICE"
  | "CHECKBOX"
  | "DROPDOWN"
  | "LINEAR_SCALE"
  | "DATE"
  | "TIME";

export interface FormQuestion {
  id: string;
  title: string;
  type: QuestionType;
  required: boolean;
  options?: string[]; // MULTIPLE_CHOICE, CHECKBOX, DROPDOWN 用
  scaleMin?: number; // LINEAR_SCALE 用
  scaleMax?: number;
  scaleMinLabel?: string;
  scaleMaxLabel?: string;
}

export interface FormData {
  title: string;
  description?: string;
  questions: FormQuestion[];
}

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  SHORT_ANSWER: "短文回答",
  PARAGRAPH: "長文回答",
  MULTIPLE_CHOICE: "ラジオボタン",
  CHECKBOX: "チェックボックス",
  DROPDOWN: "プルダウン",
  LINEAR_SCALE: "均等目盛り",
  DATE: "日付",
  TIME: "時刻",
};
