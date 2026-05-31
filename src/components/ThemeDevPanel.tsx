import { useEffect, useMemo, useState } from "react";
import { applyTheme, defaultTheme, readSavedTheme, resetTheme, saveTheme, themeToCss, themeTokens, type ThemeValues } from "../lib/theme";

export function ThemeDevPanel() {
  const enabled = useMemo(() => new URLSearchParams(window.location.search).get("theme") === "dev", []);
  const [open, setOpen] = useState(true);
  const [values, setValues] = useState<ThemeValues>(() => ({ ...defaultTheme, ...readSavedTheme() }));
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (enabled) applyTheme(readSavedTheme());
  }, [enabled]);

  if (!enabled) return null;

  function update(key: keyof ThemeValues, value: string) {
    const next = { ...values, [key]: value };
    setValues(next);
    saveTheme(next);
    setCopied(false);
  }

  async function copyCss() {
    await navigator.clipboard.writeText(themeToCss(values));
    setCopied(true);
  }

  function restore() {
    resetTheme();
    setValues(defaultTheme);
    setCopied(false);
  }

  return (
    <aside className={open ? "theme-panel" : "theme-panel collapsed"}>
      <button className="theme-panel-toggle" type="button" onClick={() => setOpen((current) => !current)}>
        {open ? "收起调色" : "调色"}
      </button>
      {open && (
        <>
          <div className="theme-panel-head">
            <strong>开发调色板</strong>
            <small>实时保存到本浏览器</small>
          </div>
          <div className="theme-control-list">
            {themeTokens.map((token) => (
              <label className="theme-control" key={token.key}>
                <span>{token.label}</span>
                <input type="color" value={values[token.key]} onChange={(event) => update(token.key, event.target.value)} />
                <code>{values[token.key]}</code>
              </label>
            ))}
          </div>
          <div className="theme-panel-actions">
            <button type="button" onClick={copyCss}>
              {copied ? "已复制" : "复制主题 CSS"}
            </button>
            <button type="button" onClick={restore}>
              恢复默认
            </button>
          </div>
        </>
      )}
    </aside>
  );
}
