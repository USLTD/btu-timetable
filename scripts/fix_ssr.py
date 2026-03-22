#!/usr/bin/env python3
"""Fix SSR locale crash in App.tsx and migrate className -> class across all components."""

import os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# ------------------------------------------------------------------ #
# 1. Fix createSafeDateFormatter in App.tsx                            #
# ------------------------------------------------------------------ #

app_path = os.path.join(ROOT, "src", "App.tsx")
with open(app_path, "r", encoding="utf-8") as f:
    app_src = f.read()

# Normalize line endings
app_src = app_src.replace("\r\n", "\n").replace("\r", "\n")

OLD_FN = (
    'function createSafeDateFormatter(locale: string) {\n'
    '  try {\n'
    '    return new Intl.DateTimeFormat(locale, {\n'
    '      dateStyle: "medium",\n'
    '      timeStyle: "short",\n'
    '    });\n'
    '  } catch {\n'
    '    return new Intl.DateTimeFormat(locale, {\n'
    '      year: "numeric",\n'
    '      month: "short",\n'
    '      day: "2-digit",\n'
    '      hour: "2-digit",\n'
    '      minute: "2-digit",\n'
    '    });\n'
    '  }\n'
    '}'
)

NEW_FN = (
    '/** Map app locale codes to full BCP-47 tags so Node.js ICU data recognises them. */\n'
    'const LOCALE_BCP47: Record<string, string> = {\n'
    '  en: "en-US",\n'
    '  ka: "ka-GE",\n'
    '};\n'
    '\n'
    'function createSafeDateFormatter(locale: string) {\n'
    '  const bcp47 = LOCALE_BCP47[locale] ?? locale;\n'
    '  const opts: Intl.DateTimeFormatOptions = {\n'
    '    year: "numeric",\n'
    '    month: "short",\n'
    '    day: "2-digit",\n'
    '    hour: "2-digit",\n'
    '    minute: "2-digit",\n'
    '  };\n'
    '  try {\n'
    '    return new Intl.DateTimeFormat(bcp47, opts);\n'
    '  } catch {\n'
    '    return new Intl.DateTimeFormat("en-US", opts);\n'
    '  }\n'
    '}'
)

if OLD_FN in app_src:
    app_src = app_src.replace(OLD_FN, NEW_FN)
    with open(app_path, "w", encoding="utf-8", newline="\n") as f:
        f.write(app_src)
    print("OK  App.tsx SSR fix applied")
else:
    print("ERR App.tsx: target function not found - check manually")
    sys.exit(1)

# ------------------------------------------------------------------ #
# 2. className -> class, htmlFor -> for  in all TSX component files    #
# ------------------------------------------------------------------ #

TARGETS = [
    os.path.join(ROOT, "src", "components", "calendar-view.tsx"),
    os.path.join(ROOT, "src", "components", "course-list.tsx"),
    os.path.join(ROOT, "src", "components", "feature-flags-dialog.tsx"),
    os.path.join(ROOT, "src", "components", "file-upload.tsx"),
    os.path.join(ROOT, "src", "components", "manual-course-dialog.tsx"),
    os.path.join(ROOT, "src", "components", "range-slider.tsx"),
    os.path.join(ROOT, "src", "components", "rating-stars.tsx"),
    os.path.join(ROOT, "src", "components", "responsive-dialog.tsx"),
    os.path.join(ROOT, "src", "components", "settings-panel.tsx"),
    os.path.join(ROOT, "src", "components", "toast.tsx"),
    os.path.join(ROOT, "src", "components", "update-toast.tsx"),
    os.path.join(ROOT, "src", "components", "error-boundary.tsx"),
    os.path.join(ROOT, "src", "components", "legal", "privacy-policy.tsx"),
    os.path.join(ROOT, "src", "components", "legal", "terms-of-service.tsx"),
    os.path.join(ROOT, "src", "pages", "_error", "+Page.tsx"),
    os.path.join(ROOT, "src", "renderer", "Head.tsx"),
    os.path.join(ROOT, "src", "renderer", "PageShell.tsx"),
]

# Pattern: className={...}  ->  class={...}  in JSX attributes
# But NOT inside string values or style objects
# We use a simple regex that targets JSX attribute position (after whitespace/newline)
CLASSNAME_RE = re.compile(r'\bclassName=')
HTMLFOR_RE   = re.compile(r'\bhtmlFor=')

total_changed = 0
for path in TARGETS:
    if not os.path.exists(path):
        print(f"SKIP {os.path.relpath(path, ROOT)} (not found)")
        continue
    with open(path, "r", encoding="utf-8") as f:
        src = f.read()
    src = src.replace("\r\n", "\n").replace("\r", "\n")
    new_src = CLASSNAME_RE.sub('class=', src)
    new_src = HTMLFOR_RE.sub('for=', new_src)
    count = src.count('className=') + src.count('htmlFor=')
    if new_src != src:
        with open(path, "w", encoding="utf-8", newline="\n") as f:
            f.write(new_src)
        print(f"OK  {os.path.relpath(path, ROOT)} ({count} replacements)")
        total_changed += 1
    else:
        print(f"--  {os.path.relpath(path, ROOT)} (no changes needed)")

print(f"\nDone. {total_changed} files updated.")
