#!/usr/bin/env python
"""
kite_login.py — CLI login flow for Kite Connect.

Use this when you can't (or don't want to) use the browser OAuth callback
at http://localhost:8000/kite/callback. The token is saved to disk
encrypted and the backend will auto-restore it on next startup.

Common scenarios:
  • Running Finsight OS in Docker without exposing the callback URL
  • Headless server install (no browser available)
  • Pairing a fresh laptop after backend re-deploy
  • Reference pattern from anwesh's login_fixed.py adapted for this repo

Usage:
    cd backend
    python scripts/kite_login.py

The script will:
  1. Print your Zerodha login URL
  2. Wait for you to paste back the request_token from the redirect URL
  3. Exchange it for an access_token
  4. Validate by calling /profile
  5. Save the access_token Fernet-encrypted to data/kite_access_token.encrypted
  6. Confirm with your Zerodha user name

Next backend start: kite_client.restore_session_from_disk() picks up the
saved token and the user is auto-logged-in.
"""

from __future__ import annotations

import logging
import os
import sys
from pathlib import Path

# Allow `python scripts/kite_login.py` from backend/
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

# Load .env if present so KITE_API_KEY / SECRET are picked up
try:
    from dotenv import load_dotenv  # type: ignore
    load_dotenv(Path(__file__).resolve().parent.parent / ".env", override=False)
except ImportError:
    pass

import kite_client                                    # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(message)s")


def main() -> int:
    if not kite_client.is_configured():
        print("✗ Kite Connect not configured.")
        print("  Set KITE_API_KEY and KITE_API_SECRET in backend/.env first.")
        print("  See docs/kite-setup.md for the 5-minute walkthrough.")
        return 2

    # If a previous login is still valid, short-circuit
    restored = kite_client.restore_session_from_disk()
    if restored:
        print(f"✓ Already logged in as {restored.user_name} ({restored.user_id})")
        print(f"  Token cached at data/kite_access_token.encrypted")
        ans = input("  Re-login anyway? [y/N] ").strip().lower()
        if ans != "y":
            return 0

    print("\nSTEP 1 — Open this URL in your browser and complete login:\n")
    print(f"  {kite_client.login_url()}\n")
    print("STEP 2 — After Zerodha redirects you, copy the `request_token`")
    print("        query param from the URL (e.g. ?request_token=ABC123&...).\n")

    request_token = input("Paste request_token here: ").strip()
    if not request_token:
        print("✗ Empty request_token, aborting.")
        return 1

    try:
        sid, sess = kite_client.handle_callback(request_token)
    except PermissionError as e:
        print(f"✗ Kite rejected the token: {e}")
        return 1
    except Exception as e:
        print(f"✗ Unexpected error: {e}")
        return 1

    print(f"\n✓ Logged in as {sess.user_name} ({sess.user_id})")
    print(f"  Email:        {sess.email or '(not provided)'}")
    print(f"  access_token: {sess.access_token[:8]}…{sess.access_token[-4:]}")
    print(f"  Encrypted at: data/kite_access_token.encrypted")
    print(f"\n  Restart the backend (python main.py) and the session will")
    print(f"  auto-restore. Token expires at ~6 AM IST tomorrow — re-run")
    print(f"  this script then if you don't want to use the web flow.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
