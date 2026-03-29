"use client";

import { useMemo, useState } from "react";
import { Badge, Card, SectionTitle } from "@/components/ui";
import {
  RUN_SCRIPT_DEFINITIONS,
  buildRunArgs,
  getRunScriptDefinition,
  type RunFieldDefinition,
  type RunFormValues,
  type RunScriptType,
} from "@/lib/run-config";

function buildInitialValues(scriptType: RunScriptType): RunFormValues {
  const definition = getRunScriptDefinition(scriptType);
  return Object.fromEntries(definition.fields.map((field) => [field.key, field.defaultValue]));
}

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: RunFieldDefinition;
  value: string | number | boolean | undefined;
  onChange: (nextValue: string | number | boolean) => void;
}) {
  if (field.type === "checkbox") {
    return (
      <label className="flex items-start gap-3 rounded-2xl border border-line bg-black/20 p-4">
        <input
          checked={value === true}
          className="mt-1 h-4 w-4 accent-blue-400"
          type="checkbox"
          onChange={(event) => onChange(event.target.checked)}
        />
        <div className="space-y-1">
          <p className="text-sm font-medium text-text">{field.label}</p>
          {field.description ? <p className="text-xs text-muted">{field.description}</p> : null}
        </div>
      </label>
    );
  }

  return (
    <label className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-text">{field.label}</span>
        {field.required ? <Badge tone="warn">Required</Badge> : null}
      </div>
      <input
        className="w-full rounded-2xl border border-line bg-black/20 px-4 py-3 text-sm text-text outline-none transition focus:border-blue-400"
        min={field.type === "number" ? field.min : undefined}
        placeholder={field.placeholder}
        type={field.type}
        value={field.type === "number" ? Number(value ?? field.defaultValue ?? 0) : String(value ?? "")}
        onChange={(event) =>
          onChange(field.type === "number" ? Number(event.target.value) : event.target.value)
        }
      />
      {field.description ? <p className="text-xs text-muted">{field.description}</p> : null}
    </label>
  );
}

function formatArgsInline(args: string[]) {
  return args.map((arg) => (arg.includes(" ") ? `"${arg}"` : arg)).join(", ");
}

function buildGeneratedScript(args: string[]) {
  return `$env:LLM_PROVIDER='local'
$env:LOCAL_LLM_BASE_URL='http://127.0.0.1:1234/v1'
$env:LOCAL_LLM_MODEL='openai/gpt-oss-20b'
@'
import { main, appDeps } from "./src/index.ts";
try {
  const result = await main([${formatArgsInline(args)}], appDeps);
  console.log(JSON.stringify(result, null, 2));
} finally {
  await appDeps.prisma.$disconnect();
}
'@ | npx tsx -`;
}

export function RunScriptBuilder() {
  const [scriptType, setScriptType] = useState<RunScriptType>("easy-apply-dry-run");
  const [values, setValues] = useState<RunFormValues>(() => buildInitialValues("easy-apply-dry-run"));
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");

  const definition = useMemo(() => getRunScriptDefinition(scriptType), [scriptType]);

  const generated = useMemo(() => {
    try {
      const args = buildRunArgs(scriptType, values);
      return {
        preview: args.join(" "),
        script: buildGeneratedScript(args),
        error: null,
      };
    } catch (error) {
      return {
        preview: `${scriptType} ...`,
        script: "",
        error: error instanceof Error ? error.message : "Failed to build script.",
      };
    }
  }, [scriptType, values]);

  async function copyScript() {
    if (!generated.script) {
      return;
    }

    try {
      await navigator.clipboard.writeText(generated.script);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }

    window.setTimeout(() => setCopyState("idle"), 1800);
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
      <Card className="space-y-5">
        <SectionTitle
          eyebrow="Options"
          title="Configure a script"
          subtitle="Pick a script type and set the same options you would normally pass on CLI. The dashboard will only generate the script for you."
        />

        <div className="grid gap-2">
          {RUN_SCRIPT_DEFINITIONS.map((option) => (
            <button
              key={option.type}
              className={`rounded-2xl border px-4 py-3 text-left transition ${
                option.type === scriptType
                  ? "border-blue-400 bg-blue-400/10"
                  : "border-line bg-black/20 hover:border-slate-500"
              }`}
              type="button"
              onClick={() => {
                setScriptType(option.type);
                setValues(buildInitialValues(option.type));
                setCopyState("idle");
              }}
            >
              <p className="text-sm font-medium text-text">{option.label}</p>
              <p className="mt-1 text-xs text-muted">{option.description}</p>
            </button>
          ))}
        </div>

        {definition.caution ? (
          <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-200">
            {definition.caution}
          </div>
        ) : null}

        <div className="space-y-4">
          {definition.fields.map((field) => (
            <FieldInput
              key={field.key}
              field={field}
              value={values[field.key]}
              onChange={(nextValue) =>
                setValues((current) => ({
                  ...current,
                  [field.key]: nextValue,
                }))
              }
            />
          ))}
        </div>
      </Card>

      <div className="space-y-5">
        <Card className="space-y-4">
          <SectionTitle
            eyebrow="Script Preview"
            title="Generated PowerShell wrapper"
            subtitle="This matches the `tsx`-based script style you preferred. No engine process is started from the dashboard."
          />

          <div className="rounded-2xl border border-line bg-black/20 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-info">Command Preview</p>
            <p className="mt-2 break-all font-mono text-xs text-slate-200">{generated.preview}</p>
          </div>

          {generated.error ? (
            <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 p-4 text-sm text-rose-200">
              {generated.error}
            </div>
          ) : null}

          <div className="overflow-hidden rounded-[28px] border border-line bg-black/30 shadow-panel">
            <pre className="min-h-[760px] overflow-auto p-6 text-sm leading-7 text-slate-100">
              <code>{generated.script || "Script will appear here when the required fields are filled."}</code>
            </pre>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              className="rounded-2xl bg-blue-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!generated.script}
              type="button"
              onClick={copyScript}
            >
              Copy Script
            </button>
            {copyState === "copied" ? <Badge tone="apply">Copied</Badge> : null}
            {copyState === "failed" ? <Badge tone="skip">Copy failed</Badge> : null}
          </div>
        </Card>

        <Card className="space-y-3">
          <SectionTitle
            eyebrow="Notes"
            title="How to use it"
            subtitle="The dashboard now stops at script generation. Paste the output into PowerShell when you are ready."
          />
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-line bg-black/20 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-info">Mode</p>
              <p className="mt-2 text-sm text-text">Script generation only</p>
            </div>
            <div className="rounded-2xl border border-line bg-black/20 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-info">Output</p>
              <p className="mt-2 text-sm text-text">PowerShell `tsx` wrapper</p>
            </div>
            <div className="rounded-2xl border border-line bg-black/20 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-info">Execution</p>
              <p className="mt-2 text-sm text-text">Manual, outside the dashboard</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
