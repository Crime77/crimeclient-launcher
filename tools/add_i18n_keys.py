"""Add or update flat i18n keys in the launcher's en.json and de.json, keeping order and line endings.

usage: python tools/add_i18n_keys.py . <keys.json>
keys.json: {"key": {"en": "...", "de": "..."}, ...}; new keys are appended in the given order
(after "_after" when an entry has it: {"key": {"en":..,"de":..,"_after": "existing.key"}}).
"""
import io
import json
import sys

import os
import time

root, keys_path = sys.argv[1], sys.argv[2]
new = json.loads(io.open(keys_path, encoding="utf-8").read())

# several agents may add keys at once: hold a lock file while reading and writing
lock = os.path.join(root, "src", "i18n", "translations", ".add_keys.lock")
for _ in range(200):
    try:
        fd = os.open(lock, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
        os.close(fd)
        break
    except FileExistsError:
        if time.time() - os.path.getmtime(lock) > 30:
            os.remove(lock)
        time.sleep(0.1)
else:
    sys.exit("translations are locked (src/i18n/translations/.add_keys.lock)")

try:
  for lang in ("en", "de"):
      p = f"{root}/src/i18n/translations/{lang}.json"
      raw = io.open(p, encoding="utf-8", newline="").read()
      nl = "\r\n" if "\r\n" in raw else "\n"
      data = json.loads(raw)
      items = list(data.items())
      for key, entry in new.items():
          value = entry[lang]
          if key in data:
              items = [(k, value if k == key else v) for k, v in items]
              data[key] = value
              continue
          after = entry.get("_after")
          if after and after in data:
              idx = next(i for i, (k, _) in enumerate(items) if k == after) + 1
              items.insert(idx, (key, value))
          else:
              items.append((key, value))
          data[key] = value
      out = json.dumps(dict(items), ensure_ascii=False, indent=2).replace("\n", nl)
      if raw.endswith("\n"):
          out += nl
      io.open(p, "w", encoding="utf-8", newline="").write(out)
      print(lang, "ok", len(items))
finally:
    os.remove(lock)
