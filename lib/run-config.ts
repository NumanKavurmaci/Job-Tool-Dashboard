export type RunScriptType =
  | "score"
  | "decide"
  | "easy-apply"
  | "easy-apply-batch"
  | "external-apply"
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
    type: "easy-apply",
    label: "Easy Apply",
    description: "Run the LinkedIn Easy Apply flow for a single job URL, optionally in dry-run mode.",
    caution: "Leave Dry Run enabled unless you want the engine to reach the real submit path.",
    fields: [
      {
        key: "url",
        label: "Job URL",
        type: "text",
        placeholder: "https://www.linkedin.com/jobs/view/4387396184/",
        required: true,
        defaultValue: "https://www.linkedin.com/jobs/view/4387396184/",
      },
      {
        key: "dryRun",
        label: "Dry Run",
        type: "checkbox",
        defaultValue: true,
        description: "Adds --dry-run so the flow stops before the final submit.",
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
    description: "Run the LinkedIn Easy Apply batch flow from a collection URL, with dry-run as a flag.",
    caution: "Clearing Dry Run can trigger real application flow steps in the engine.",
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
        key: "dryRun",
        label: "Dry Run",
        type: "checkbox",
        defaultValue: true,
        description: "Adds --dry-run while keeping the batch command shape unchanged.",
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
    type: "external-apply",
    label: "External Apply",
    description: "Run the external application helper flow for a non-LinkedIn application URL.",
    caution: "Clearing Dry Run allows the engine to continue through the live external apply path.",
    fields: [
      {
        key: "url",
        label: "Application URL",
        type: "text",
        placeholder: "https://company.example/apply/software-engineer",
        required: true,
      },
      {
        key: "dryRun",
        label: "Dry Run",
        type: "checkbox",
        defaultValue: true,
        description: "Adds --dry-run so the script only rehearses the flow.",
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
    case "easy-apply": {
      const url = stringValue("url");
      if (!url || typeof url !== "string") {
        throw new Error("Job URL is required.");
      }
      args.push(url);
      pushStringArg(args, "--resume", stringValue("resumePath"));
      if (booleanValue("dryRun")) {
        args.push("--dry-run");
      }
      return args;
    }
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

      if (booleanValue("dryRun")) {
        args.push("--dry-run");
      }

      return args;
    }
    case "external-apply": {
      const url = stringValue("url");
      if (!url || typeof url !== "string") {
        throw new Error("Application URL is required.");
      }
      args.push(url);
      pushStringArg(args, "--resume", stringValue("resumePath"));
      if (booleanValue("dryRun")) {
        args.push("--dry-run");
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

function escapeJavaScriptSingleQuotedString(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/\r/g, "\\r")
    .replace(/\n/g, "\\n");
}

export function buildGeneratedRunScript(args: string[]): string {
  const serializedArgs = args
    .map((arg) => `'${escapeJavaScriptSingleQuotedString(arg)}'`)
    .join(", ");

  return `$env:LLM_PROVIDER='local'
$env:LOCAL_LLM_BASE_URL='http://127.0.0.1:1234/v1'
$env:LOCAL_LLM_MODEL='openai/gpt-oss-20b'
@'
import { main, appDeps } from "./src/index.ts";
try {
  const result = await main([${serializedArgs}], appDeps);
  console.log(JSON.stringify(result, null, 2));
} finally {
  await appDeps.prisma.$disconnect();
}
'@ | npx tsx -`;
}
