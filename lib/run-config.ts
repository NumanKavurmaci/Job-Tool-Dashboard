export type RunScriptType =
  | "dashboard"
  | "score"
  | "decide"
  | "explore"
  | "explore-batch"
  | "easy-apply"
  | "easy-apply-batch"
  | "apply"
  | "apply-batch"
  | "external-apply"
  | "build-profile"
  | "answer-questions";

export type RunFieldType = "text" | "number" | "checkbox" | "select";

export type RunFieldDefinition = {
  key: string;
  label: string;
  type: RunFieldType;
  placeholder?: string;
  description?: string;
  defaultValue?: string | number | boolean;
  required?: boolean;
  min?: number;
  options?: Array<{ value: string; label: string }>;
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
    type: "dashboard",
    label: "Dashboard Snapshot",
    description: "Print a terminal snapshot from persisted recommendations, reviews, and firm stats.",
    fields: [
      {
        key: "limit",
        label: "Limit",
        type: "number",
        defaultValue: 5,
        min: 1,
      },
    ],
  },
  {
    type: "explore-batch",
    label: "Explore Batch",
    description: "Evaluate LinkedIn collection jobs one by one and save recommendations without entering any apply flow.",
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
        label: "Bypass Evaluation Gate",
        type: "checkbox",
        defaultValue: false,
        description: "Skips extraction/scoring and lets the batch process matching jobs directly.",
      },
      {
        key: "scoringMode",
        label: "Scoring Mode",
        type: "select",
        defaultValue: "local",
        options: [
          { value: "local", label: "Local deterministic" },
          { value: "ai", label: "AI direct score" },
        ],
      },
    ],
  },
  {
    type: "explore",
    label: "Explore Single",
    description: "Evaluate one job URL and save its recommendation snapshot without attempting any application flow.",
    fields: [
      {
        key: "url",
        label: "Job URL",
        type: "text",
        placeholder: "https://www.linkedin.com/jobs/view/4389593314/",
        required: true,
      },
      {
        key: "scoringMode",
        label: "Scoring Mode",
        type: "select",
        defaultValue: "local",
        options: [
          { value: "local", label: "Local deterministic" },
          { value: "ai", label: "AI direct score" },
        ],
      },
    ],
  },
  {
    type: "easy-apply",
    label: "Easy Apply",
    description: "Run only the LinkedIn Easy Apply flow for a single job URL.",
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
    description: "Run only the LinkedIn Easy Apply batch flow from a collection URL.",
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
        label: "Bypass Evaluation Gate",
        type: "checkbox",
        defaultValue: false,
        description: "Skips extraction/scoring and lets the batch process matching jobs directly.",
      },
      {
        key: "scoringMode",
        label: "Scoring Mode",
        type: "select",
        defaultValue: "local",
        options: [
          { value: "local", label: "Local deterministic" },
          { value: "ai", label: "AI direct score" },
        ],
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
    type: "apply",
    label: "Apply",
    description:
      "Run the LinkedIn apply flow for a single job URL, including external-application handoff when needed.",
    caution:
      "Clearing Dry Run allows the engine to continue through real submit paths, including external apply continuation.",
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
        description: "Adds --dry-run so the flow rehearses the path without final submission.",
      },
      {
        key: "resumePath",
        label: "Resume Path",
        type: "text",
        placeholder: "./user/resume.pdf",
        defaultValue: "./user/resume.pdf",
      },
    ],
  },
  {
    type: "apply-batch",
    label: "Apply Batch",
    description:
      "Run the LinkedIn apply batch flow from a collection URL, including external-application handoff when needed.",
    caution:
      "This is the all-apply command. Clearing Dry Run can continue into real LinkedIn and external application submits.",
    fields: [
      {
        key: "url",
        label: "Collection URL",
        type: "text",
        placeholder: "https://www.linkedin.com/jobs/collections/hiring-in-network",
        required: true,
        defaultValue: "https://www.linkedin.com/jobs/collections/hiring-in-network",
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
        label: "Bypass Evaluation Gate",
        type: "checkbox",
        defaultValue: false,
        description: "Skips extraction/scoring and lets the batch process matching jobs directly.",
      },
      {
        key: "scoringMode",
        label: "Scoring Mode",
        type: "select",
        defaultValue: "local",
        options: [
          { value: "local", label: "Local deterministic" },
          { value: "ai", label: "AI direct score" },
        ],
      },
      {
        key: "dryRun",
        label: "Dry Run",
        type: "checkbox",
        defaultValue: true,
        description: "Adds --dry-run while keeping the all-apply batch command shape unchanged.",
      },
      {
        key: "resumePath",
        label: "Resume Path",
        type: "text",
        placeholder: "./user/resume.pdf",
        defaultValue: "./user/resume.pdf",
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
        key: "scoringMode",
        label: "Scoring Mode",
        type: "select",
        defaultValue: "local",
        options: [
          { value: "local", label: "Local deterministic" },
          { value: "ai", label: "AI direct score" },
        ],
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
        key: "scoringMode",
        label: "Scoring Mode",
        type: "select",
        defaultValue: "local",
        options: [
          { value: "local", label: "Local deterministic" },
          { value: "ai", label: "AI direct score" },
        ],
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
  const pushScoringMode = () => {
    const mode = stringValue("scoringMode");
    if (mode === "ai") {
      args.push("--scoring", "ai");
    }
  };

  switch (type) {
    case "dashboard": {
      pushStringArg(args, "--limit", stringValue("limit"));
      return args;
    }
    case "score":
    case "decide": {
      const url = stringValue("url");
      if (!url || typeof url !== "string") {
        throw new Error("Job URL is required.");
      }
      args.push(url);
      pushScoringMode();
      return args;
    }
    case "explore": {
      const url = stringValue("url");
      if (!url || typeof url !== "string") {
        throw new Error("Job URL is required.");
      }
      args.push(url);
      pushScoringMode();
      return args;
    }
    case "explore-batch": {
      const url = stringValue("url");
      if (!url || typeof url !== "string") {
        throw new Error("Target URL is required.");
      }
      args.push(url);

      const count = stringValue("count");
      if (count !== undefined && count !== "") {
        args.push("--count", String(count));
      }

      pushStringArg(args, "--score-threshold", stringValue("scoreThreshold"));

      if (booleanValue("disableAiEvaluation")) {
        args.push("--disable-ai-evaluation");
      }

      pushScoringMode();

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
    case "apply": {
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
        args.push("--count", String(count));
      }

      pushStringArg(args, "--score-threshold", stringValue("scoreThreshold"));
      pushStringArg(args, "--resume", stringValue("resumePath"));

      if (booleanValue("disableAiEvaluation")) {
        args.push("--disable-ai-evaluation");
      }

      pushScoringMode();

      if (booleanValue("dryRun")) {
        args.push("--dry-run");
      }

      return args;
    }
    case "apply-batch": {
      const url = stringValue("url");
      if (!url || typeof url !== "string") {
        throw new Error("Target URL is required.");
      }
      args.push(url);

      const count = stringValue("count");
      if (count !== undefined && count !== "") {
        args.push("--count", String(count));
      }

      pushStringArg(args, "--score-threshold", stringValue("scoreThreshold"));
      pushStringArg(args, "--resume", stringValue("resumePath"));

      if (booleanValue("disableAiEvaluation")) {
        args.push("--disable-ai-evaluation");
      }

      pushScoringMode();

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
