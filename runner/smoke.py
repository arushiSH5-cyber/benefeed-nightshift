"""Step-1 check: list devices, lease, screenshot, launch Settings, verify, release.
Run: uv run python -m runner.smoke"""
import time
from pathlib import Path
from .phoneuse import PhoneUse

pu = PhoneUse()
devs = [d for d in pu.devices() if d.get("online")]
print("devices:", [(d["id"][:6] + "…", d.get("name"), d.get("automation")) for d in devs])
dev = devs[0]["id"]
pu.lease(dev, 120)
try:
    out = Path(__file__).parent / ".state"; out.mkdir(exist_ok=True)
    pu.action(dev, "launch_app", bundle_id="com.apple.Preferences")
    time.sleep(1.5)
    (out / "smoke.png").write_bytes(pu.screenshot(dev))  # re-observe to verify
    print("active app:", pu.action(dev, "active_app"))
    print("screenshot saved to runner/.state/smoke.png")
finally:
    pu.release(dev)
