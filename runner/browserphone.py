"""A phone-sized browser (Playwright) behind the PhoneUse interface, for live demos without a device.
Same crew, same guard, same hard stop; the "phone" is a 390x844 mobile browser. Select with PHONEUSE_MODE=browser.
Only the browser app is available here (task A: the practice portal)."""
from __future__ import annotations

import os

from playwright.sync_api import sync_playwright

COLLECT = """() => {
  let n = 0; const out = [];
  const vis = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && r.left > -50 && r.top > -2000; };
  for (const el of document.querySelectorAll('input:not([type=hidden]),select,button,a,h1,p,label,b')) {
    if (!vis(el) || el.closest('dialog:not([open])')) continue;
    let label = (el.innerText || el.value || '').trim();
    if (['INPUT','SELECT'].includes(el.tagName)) {
      const l = el.id && document.querySelector('label[for="' + el.id + '"]'); label = (l ? l.innerText : el.name || el.placeholder || '').trim();
    }
    if (!label) continue;
    el.dataset.bf = el.dataset.bf || ('e' + (++n) + Math.random().toString(36).slice(2, 6));
    const r = el.getBoundingClientRect();
    out.push({ id: el.dataset.bf, tag: el.tagName, label: label.slice(0, 120), value: el.tagName === 'SELECT' ? (el.selectedIndex > 0 ? el.options[el.selectedIndex].text : '') : (el.value || ''),
      options: el.tagName === 'SELECT' ? [...el.options].map(o => o.text) : null,
      rect: { x: r.left, y: r.top, width: r.width, height: r.height },
      field: ['INPUT','SELECT'].includes(el.tagName), clickable: ['BUTTON','A'].includes(el.tagName) });
  }
  return out;
}"""


class BrowserPhone:
    def __init__(self):
        self.pw = sync_playwright().start()
        self.browser = self.pw.chromium.launch(headless=os.environ.get("BROWSER_HEADLESS", "1") == "1")
        self.page = self.browser.new_page(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
        self.page.set_content("<body style='font:20px system-ui;display:grid;place-items:center;height:100vh;background:#fbf6ea'>🌙 Do Not Disturb</body>")
        self.els: dict[str, dict] = {}

    def devices(self):
        return [{"id": "browser-phone", "name": "Demo phone (browser)", "online": True, "automation": "ready"}]

    def lease(self, dev, seconds=600): return {"leaseId": "local"}
    def release(self, dev): pass

    def screenshot(self, dev) -> bytes:
        return self.page.screenshot(type="png")

    def _collect(self):
        items = self.page.evaluate(COLLECT)
        self.els = {e["id"]: e for e in items}
        return items

    def action(self, dev, action, **p):
        pg = self.page
        if action == "source_fast":
            lines = []
            for e in self._collect():
                kind = "field" if e["field"] else "button" if e["clickable"] else "text"
                extra = (f" options={e['options']}" if e["options"] else "") + (f" CURRENT VALUE={e['value']!r}" if e["field"] and e["value"] else (" (empty)" if e["field"] else ""))
                lines.append(f"[{kind} id={e['id']}] {e['label']}{extra}" if e["field"] or e["clickable"] else f"[text] {e['label']}")
            return "\n".join(lines)
        if action == "find_elements":
            q = p["query"].lower()
            hits = [e for e in self._collect() if q in e["label"].lower() and (e["field"] or e["clickable"])][:8]
            return {"elements": [{"element_id": e["id"], "session_id": "browser",
                                  "attributes": {"label": e["label"], "rect": e["rect"], "enabled": True,
                                                 "type": "field" if e["field"] else "button"}} for e in hits]}
        if action == "element_click":
            pg.locator(f'[data-bf="{p["element_id"]}"]').click(timeout=5000)
            pg.wait_for_timeout(500)
            return None
        if action == "element_fill":
            el = self.els.get(p["element_id"], {})
            loc = pg.locator(f'[data-bf="{p["element_id"]}"]')
            if el.get("tag") == "SELECT":
                opts = el.get("options") or []
                pick = next((o for o in opts if p["text"].lower() in o.lower()), p["text"])
                loc.select_option(label=pick)
            else:
                loc.fill(p["text"])
            return None
        if action == "launch_app":
            return None  # the browser is the only app on this demo phone
        if action == "open_url":
            pg.goto(p["url"], wait_until="domcontentloaded")
            return None
        if action == "tap":
            pg.mouse.click(p["x"] * 390, p["y"] * 844)
            return None
        if action == "swipe":
            pg.mouse.wheel(0, (p["y"] - p["y2"]) * 844)
            pg.wait_for_timeout(300)
            return None
        if action == "window_size":
            return {"width": 390, "height": 844}
        return None
