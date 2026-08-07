import {
  FormEvent,
  useEffect,
  useId,
  useRef,
  type ChangeEvent,
  type KeyboardEvent,
} from 'react';

type HeroInputProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder: string;
  label: string;
  langHint: string;
  submitLabel: string;
};

export function HeroInput({
  value,
  onChange,
  onSubmit,
  placeholder,
  label,
  langHint,
  submitLabel,
}: HeroInputProps) {
  const id = useId();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const max = 8 * 28.8; // ~8 rows at body-lg / 1.8
    el.style.height = `${Math.min(el.scrollHeight, max)}px`;
  }, [value]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!value.trim()) return;
    onSubmit();
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    // Enter submits; Shift+Enter inserts a newline (desktop chat convention).
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (value.trim()) onSubmit();
    }
  }

  function handleChange(e: ChangeEvent<HTMLTextAreaElement>) {
    onChange(e.target.value);
  }

  const canSubmit = value.trim().length > 0;

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div
        data-focus-container
        className="rounded-xl border border-line bg-white p-5 shadow-lg transition-[border-color,box-shadow] duration-fast ease-out focus-within:border-jade-400 focus-within:shadow-focus"
      >
        <label className="sr-only" htmlFor={id}>
          {label}
        </label>
        <textarea
          ref={textareaRef}
          id={id}
          name="goal"
          rows={3}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="font-myanmar w-full resize-none border-0 bg-transparent text-body-lg text-ink-900 outline-none placeholder:text-ink-300"
        />
        <div className="mt-sm flex items-center justify-between gap-md border-t border-line-soft pt-md">
          <p className="text-caption text-ink-400">{langHint}</p>
          <button
            type="submit"
            disabled={!canSubmit}
            className="tap-target inline-flex shrink-0 items-center justify-center rounded-full bg-jade-600 px-xl text-body font-medium text-white transition-colors duration-fast ease-out hover:bg-jade-400 focus-visible:shadow-focus active:bg-jade-800 disabled:cursor-not-allowed disabled:bg-ink-300 disabled:hover:bg-ink-300"
          >
            {submitLabel}
          </button>
        </div>
      </div>
    </form>
  );
}
