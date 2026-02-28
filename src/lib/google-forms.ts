import { FormData, FormQuestion } from "./types";

function buildQuestionItem(question: FormQuestion, index: number) {
  const base = {
    title: question.title,
    questionItem: {
      question: {
        required: question.required,
        ...buildQuestionBody(question),
      },
    },
  };
  return base;
}

function buildQuestionBody(question: FormQuestion) {
  switch (question.type) {
    case "SHORT_ANSWER":
      return { textQuestion: { paragraph: false } };

    case "PARAGRAPH":
      return { textQuestion: { paragraph: true } };

    case "MULTIPLE_CHOICE":
      return {
        choiceQuestion: {
          type: "RADIO",
          options: (question.options || []).map((o) => ({ value: o })),
        },
      };

    case "CHECKBOX":
      return {
        choiceQuestion: {
          type: "CHECKBOX",
          options: (question.options || []).map((o) => ({ value: o })),
        },
      };

    case "DROPDOWN":
      return {
        choiceQuestion: {
          type: "DROP_DOWN",
          options: (question.options || []).map((o) => ({ value: o })),
        },
      };

    case "LINEAR_SCALE":
      return {
        scaleQuestion: {
          low: question.scaleMin ?? 1,
          high: question.scaleMax ?? 5,
          lowLabel: question.scaleMinLabel || "",
          highLabel: question.scaleMaxLabel || "",
        },
      };

    case "DATE":
      return { dateQuestion: { includeTime: false, includeYear: true } };

    case "TIME":
      return { timeQuestion: { duration: false } };

    default:
      return { textQuestion: { paragraph: false } };
  }
}

export async function createGoogleForm(
  accessToken: string,
  formData: FormData
): Promise<{ formId: string; responderUri: string; editUri: string }> {
  // Step 1: Create a blank form
  const createRes = await fetch("https://forms.googleapis.com/v1/forms", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      info: {
        title: formData.title,
      },
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.text();
    throw new Error(`フォームの作成に失敗しました: ${err}`);
  }

  const created = await createRes.json();
  const formId = created.formId;

  // Step 2: Build batch update requests
  const requests: any[] = [];

  // Update form description if provided
  if (formData.description) {
    requests.push({
      updateFormInfo: {
        info: {
          description: formData.description,
        },
        updateMask: "description",
      },
    });
  }

  // Add questions
  formData.questions.forEach((question, index) => {
    requests.push({
      createItem: {
        item: buildQuestionItem(question, index),
        location: { index },
      },
    });
  });

  if (requests.length > 0) {
    const updateRes = await fetch(
      `https://forms.googleapis.com/v1/forms/${formId}:batchUpdate`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ requests }),
      }
    );

    if (!updateRes.ok) {
      const err = await updateRes.text();
      throw new Error(`フォームの更新に失敗しました: ${err}`);
    }
  }

  return {
    formId,
    responderUri: created.responderUri,
    editUri: `https://docs.google.com/forms/d/${formId}/edit`,
  };
}
