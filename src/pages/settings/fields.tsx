import { useId, useRef, useState, type ReactNode } from "react";
import { ImageUp, RotateCcw, Trash2, Type } from "lucide-react";
import { isHex } from "../../config/color";
import { readImageFile } from "../../config/images";

export const INPUT =
  "h-10 w-full rounded-lg border border-line bg-panel px-3 text-[15px] text-ink outline-none transition-colors focus:border-brand disabled:bg-card";

export function Field({ label, hint, children, wide = false }: { label: string; hint?: string; children: (id: string) => ReactNode; wide?: boolean }) {
  const id = useId();
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <label htmlFor={id} className="block text-[14px] font-medium text-ink">
        {label}
      </label>
      <div className="mt-1">{children(id)}</div>
      {hint && <p className="mt-1 text-[12.5px] leading-snug text-mute">{hint}</p>}
    </div>
  );
}

export function TextField({ label, value, onChange, hint, wide, placeholder }: { label: string; value: string; onChange: (v: string) => void; hint?: string; wide?: boolean; placeholder?: string }) {
  return (
    <Field label={label} hint={hint} wide={wide}>
      {(id) => <input id={id} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={INPUT} />}
    </Field>
  );
}

export function NumberField({ label, value, onChange, hint, step = 1 }: { label: string; value: number; onChange: (v: number) => void; hint?: string; step?: number }) {
  const [text, setText] = useState(String(value));
  const [last, setLast] = useState(value);
  // Follow outside changes (preset, reset) without fighting the user's typing.
  if (value !== last) {
    setLast(value);
    setText(String(value));
  }
  return (
    <Field label={label} hint={hint}>
      {(id) => (
        <input
          id={id}
          inputMode="decimal"
          value={text}
          step={step}
          onChange={(e) => {
            setText(e.target.value);
            const n = Number(e.target.value);
            if (e.target.value.trim() !== "" && Number.isFinite(n)) {
              setLast(n);
              onChange(n);
            }
          }}
          className={INPUT}
        />
      )}
    </Field>
  );
}

export function ColorField({ label, value, onChange, hint }: { label: string; value: string; onChange: (v: string) => void; hint?: string }) {
  const [text, setText] = useState(value);
  const [last, setLast] = useState(value);
  if (value !== last) {
    setLast(value);
    setText(value);
  }
  return (
    <Field label={label} hint={hint}>
      {(id) => (
        <div className="flex gap-2">
          <input
            type="color"
            aria-label={`${label} picker`}
            value={isHex(value) ? value : "#000000"}
            onChange={(e) => onChange(e.target.value)}
            className="h-10 w-12 shrink-0 cursor-pointer rounded-lg border border-line bg-panel p-1"
          />
          <input
            id={id}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              if (isHex(e.target.value)) {
                setLast(e.target.value);
                onChange(e.target.value);
              }
            }}
            className={`${INPUT} font-mono uppercase ${isHex(text) ? "" : "border-[#e05252]"}`}
          />
        </div>
      )}
    </Field>
  );
}

export function Toggle({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-lg py-1">
      <span className="relative mt-0.5 inline-flex shrink-0">
        <input type="checkbox" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="h-6 w-11 rounded-full bg-line transition-colors peer-checked:bg-brand peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand" />
        <span className="absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
      </span>
      <span>
        <span className="block text-[14.5px] font-medium">{label}</span>
        {hint && <span className="block text-[12.5px] leading-snug text-mute">{hint}</span>}
      </span>
    </label>
  );
}

export function SelectField<T extends string | number>({ label, value, options, onChange, hint }: { label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; hint?: string }) {
  return (
    <Field label={label} hint={hint}>
      {(id) => (
        <select
          id={id}
          value={String(value)}
          onChange={(e) => {
            const match = options.find((o) => String(o.value) === e.target.value);
            if (match) onChange(match.value);
          }}
          className={INPUT}
        >
          {options.map((o) => (
            <option key={String(o.value)} value={String(o.value)}>
              {o.label}
            </option>
          ))}
        </select>
      )}
    </Field>
  );
}

/** Upload, generate (wordmark), restore or remove an image setting. */
export function ImageField({
  label,
  value,
  preview,
  onChange,
  defaultValue,
  allowWordmark = false,
  maxSize = 512,
  hint,
}: {
  label: string;
  value: string;
  preview: string;
  onChange: (v: string) => void;
  defaultValue: string;
  allowWordmark?: boolean;
  maxSize?: number;
  hint?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const BUTTON = "inline-flex h-9 items-center gap-1.5 rounded-lg border border-line bg-panel px-3 text-[13.5px] transition-colors hover:bg-brand/10";
  return (
    <div className="sm:col-span-2">
      <span className="block text-[14px] font-medium">{label}</span>
      <div className="mt-1 flex flex-wrap items-center gap-3">
        <div className="grid h-20 w-48 place-items-center overflow-hidden rounded-lg border border-dashed border-line bg-card">
          {preview ? <img src={preview} alt={`${label} preview`} className="max-h-[72px] max-w-[176px] object-contain" /> : <span className="text-[13px] text-mute">No image</span>}
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={BUTTON} onClick={() => input.current?.click()}>
            <ImageUp className="size-4" aria-hidden="true" /> Upload
          </button>
          {allowWordmark && (
            <button type="button" className={BUTTON} onClick={() => onChange("wordmark")} aria-pressed={value === "wordmark"}>
              <Type className="size-4" aria-hidden="true" /> Generate from name
            </button>
          )}
          {value !== defaultValue && (
            <button type="button" className={BUTTON} onClick={() => onChange(defaultValue)}>
              <RotateCcw className="size-4" aria-hidden="true" /> Preset image
            </button>
          )}
          {value && (
            <button type="button" className={BUTTON} onClick={() => onChange("")}>
              <Trash2 className="size-4" aria-hidden="true" /> Remove
            </button>
          )}
        </div>
        <input
          ref={input}
          type="file"
          accept="image/png,image/jpeg,image/svg+xml,image/webp"
          className="sr-only"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            try {
              setError("");
              onChange(await readImageFile(file, maxSize));
            } catch (err) {
              setError(err instanceof Error ? err.message : "The image could not be used.");
            }
          }}
        />
      </div>
      {error && <p className="mt-1 text-[13px] text-[#c03838]">{error}</p>}
      {hint && <p className="mt-1 text-[12.5px] text-mute">{hint}</p>}
    </div>
  );
}

export function Card({ title, description, children, action }: { title: string; description?: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="rounded-xl border border-line bg-panel p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[19px] font-semibold">{title}</h2>
          {description && <p className="mt-0.5 text-[14.5px] text-soft">{description}</p>}
        </div>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export const GRID = "grid gap-4 sm:grid-cols-2";

/** A collapsed "Advanced" block for settings most people never need. */
export function Advanced({ children, summary = "Advanced" }: { children: ReactNode; summary?: string }) {
  return (
    <details className="group mt-5 rounded-lg border border-line-soft bg-card/40 px-4 py-3 [&_summary::-webkit-details-marker]:hidden">
      <summary className="flex cursor-pointer list-none items-center justify-between text-[14.5px] font-semibold text-soft select-none hover:text-ink">
        {summary}
        <span className="text-[12.5px] font-normal text-mute group-open:hidden">Show</span>
        <span className="hidden text-[12.5px] font-normal text-mute group-open:inline">Hide</span>
      </summary>
      <div className="mt-4">{children}</div>
    </details>
  );
}
