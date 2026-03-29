export type RunScriptType =
  | "score"
  | "decide"
  | "easy-apply-dry-run"
  | "easy-apply-batch"
  | "build-profile"
  | "answer-questions";

export type RunFieldType = "text" | "number" | "checkbox";

export type RunFieldDefinition = {
  key: string;
  label: string;
  type: RunFieldType;
  placeholder?: string;
  description?: string;
  defaultValue?: string | number | boolean;
  required?: boolean;
  min?: number;
};

export type RunScriptDefinition = {
  type: RunScriptType;
  label: string;
  description: string;
  caution?: string;
  fields: RunFieldDefinition[];
};

export type RunFormValues = Record<string, string | number | boolean | undefined>;

export const RUN_SCRIPT_DEFINITIONS: RunScriptDefinition[] = [
  {
    type: "easy-apply-dry-run",
    label: "Easy Apply Dry Run",
    description: "Review LinkedIn job collections or single jobs without submitting applications.",
    fields: [
      {
        key: "url",
        label: "Target URL",
        type: "text",
        placeholder: "https://www.linkedin.com/jobs/collections/top-applicant",
        required: true,
        defaultValue: "https://www.linkedin.com/jobs/collections/top-applicant",
      },
      {
        key: "count",
        label: "Job Count",
        type: "number",
        defaultValue: 25,
        min: 1,
      },
      {
        key: "scoreThreshold",
        label: "Score Threshold",
        type: "number",
        defaultValue: 40,
        min: 1,
      },
      {
        key: "disableAiEvaluation",
        label: "Disable AI Evaluation",
        type: "checkbox",
        defaultValue: false,
      },
      {
        key: "useAiScoreAdjustment",
        label: "Use AI Score Adjustment",
        type: "checkbox",
        defaultValue: false,
      },
      {
        key: "resumePath",
        label: "Resume Path",
        type: "text",
        placeholder: "./user/resume.pdf",
      },
    ],
  },
  {
    type: "easy-apply-batch",
    label: "Easy Apply Batch",
    description: "Run the live Easy Apply batch flow from a LinkedIn collection.",
    caution: "This mode can trigger real application flow steps in the engine.",
    fields: [
      {
        key: "url",
        label: "Collection URL",
        type: "text",
        placeholder: "https://www.linkedin.com/jobs/collections/easy-apply",
        required: true,
        defaultValue: "https://www.linkedin.com/jobs/collections/easy-apply",
      },
      {
        key: "count",
        label: "Job Count",
        type: "number",
        defaultValue: 10,
        min: 1,
      },
      {
        key: "scoreThreshold",
        label: "Score Threshold",
        type: "number",
        defaultValue: 40,
        min: 1,
      },
      {
        key: "disableAiEvaluation",
        label: "Disable AI Evaluation",
        type: "checkbox",
        defaultValue: false,
      },
      {
        key: "useAiScoreAdjustment",
        label: "Use AI Score Adjustment",
        type: "checkbox",
        defaultValue: false,
      },
      {
        key: "resumePath",
        label: "Resume Path",
        type: "text",
        placeholder: "./user/resume.pdf",
      },
    ],
  },
  {
    type: "decide",
    label: "Decide",
    description: "Run a single-job analysis and produce the engine's final decision.",
    fields: [
      {
        key: "url",
        label: "Job URL",
        type: "text",
        placeholder: "https://www.linkedin.com/jobs/view/4389593314/",
        required: true,
      },
      {
        key: "useAiScoreAdjustment",
        label: "Use AI Score Adjustment",
        type: "checkbox",
        defaultValue: false,
      },
    ],
  },
  {
    type: "score",
    label: "Score",
    description: "Run single-job scoring without converting it into a final decision flow.",
    fields: [
      {
        key: "url",
        label: "Job URL",
        type: "text",
        placeholder: "https://www.linkedin.com/jobs/view/4389593314/",
        required: true,
      },
      {
        key: "useAiScoreAdjustment",
        label: "Use AI Score Adjustment",
        type: "checkbox",
        defaultValue: false,
      },
    ],
  },
  {
    type: "build-profile",
    label: "Build Profile",
    description: "Build the candidate master profile from resume and optional LinkedIn URL.",
    fields: [
      {
        key: "resumePath",
        label: "Resume Path",
        type: "text",
        placeholder: "./user/resume.pdf",
        required: true,
        defaultValue: "./user/resume.pdf",
      },
      {
        key: "linkedinUrl",
        label: "LinkedIn URL",
        type: "text",
        placeholder: "https://linkedin.com/in/your-handle",
      },
    ],
  },
  {
    type: "answer-questions",
    label: "Answer Questions",
    description: "Generate prepared answers from a questions JSON file.",
    fields: [
      {
        key: "resumePath",
        label: "Resume Path",
        type: "text",
        placeholder: "./user/resume.pdf",
        required: true,
        defaultValue: "./user/resume.pdf",
      },
      {
        key: "questionsPath",
        label: "Questions Path",
        type: "text",
        placeholder: "./questions.json",
        required: true,
      },
      {
        key: "linkedinUrl",
        label: "LinkedIn URL",
        type: "text",
        placeholder: "https://linkedin.com/in/your-handle",
      },
    ],
  },
];

export function getRunScriptDefinition(type: RunScriptType): RunScriptDefinition {
  const definition = RUN_SCRIPT_DEFINITIONS.find((item) => item.type === type);

  if (!definition) {
    throw new Error(`Unsupported run script type: ${type}`);
  }

  return definition;
}

function pushStringArg(args: string[], flag: string, value: string | number | boolean | undefined) {
  if (value === undefined || value === null || value === "") {
    return;
  }

  args.push(flag, String(value));
}

export function buildRunArgs(type: RunScriptType, values: RunFormValues): string[] {
  const args: string[] = [type];
  const stringValue = (key: string) => {
    const value = values[key];
    return typeof value === "string" ? value.trim() : value;
  };
  const booleanValue = (key: string) => values[key] === true;

  switch (type) {
    case "score":
    case "decide": {
      const url = stringValue("url");
      if (!url || typeof url !== "string") {
        throw new Error("Job URL is required.");
      }
      args.push(url);
      if (booleanValue("useAiScoreAdjustment")) {
        args.push("--ai-score-adjustment");
      }
      return args;
    }
    case "easy-apply-dry-run":
    case "easy-apply-batch": {
      const url = stringValue("url");
      if (!url || typeof url !== "string") {
        throw new Error("Target URL is required.");
      }
      args.push(url);

      const count = stringValue("count");
      if (count !== undefined && count !== "") {
        args.push(String(count));
      }

      pushStringArg(args, "--score-threshold", stringValue("scoreThreshold"));
      pushStringArg(args, "--resume", stringValue("resumePath"));

      if (booleanValue("disableAiEvaluation")) {
        args.push("--disable-ai-evaluation");
      }

      if (booleanValue("useAiScoreAdjustment")) {
        args.push("--ai-score-adjustment");
      }

      return args;
    }
    case "build-profile": {
      const resumePath = stringValue("resumePath");
      if (!resumePath || typeof resumePath !== "string") {
        throw new Error("Resume path is required.");
      }
      args.push("--resume", resumePath);
      pushStringArg(args, "--linkedin", stringValue("linkedinUrl"));
      return args;
    }
    case "answer-questions": {
      const resumePath = stringValue("resumePath");
      const questionsPath = stringValue("questionsPath");
      if (!resumePath || typeof resumePath !== "string") {
        throw new Error("Resume path is required.");
      }
      if (!questionsPath || typeof questionsPath !== "string") {
        throw new Error("Questions path is required.");
      }
      args.push("--resume", resumePath, "--questions", questionsPath);
      pushStringArg(args, "--linkedin", stringValue("linkedinUrl"));
      return args;
    }
  }
}
