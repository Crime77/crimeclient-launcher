"""Points flake.nix at a published Linux release: version, URL and hash of the .deb.

    python tools/update_flake.py 0.3.2                 # downloads the .deb from the website and hashes it
    python tools/update_flake.py 0.3.2 path/to.deb     # hashes a local copy (must be the published file)

Run it after the release is online (the flake downloads exactly that file), then commit and push flake.nix.
"""
import base64
import hashlib
import pathlib
import re
import sys
import urllib.request

URL = "https://crime77.duckdns.org/client/launcher/CrimeClient-Launcher-{v}-amd64.deb"
FLAKE = pathlib.Path(__file__).resolve().parent.parent / "flake.nix"


def main():
    if len(sys.argv) not in (2, 3) or not re.fullmatch(r"\d+\.\d+\.\d+", sys.argv[1]):
        sys.exit(__doc__)
    version = sys.argv[1]
    url = URL.format(v=version)
    if len(sys.argv) == 3:
        data = pathlib.Path(sys.argv[2]).read_bytes()
    else:
        with urllib.request.urlopen(url, timeout=120) as response:
            data = response.read()
    sri = "sha256-" + base64.b64encode(hashlib.sha256(data).digest()).decode()

    text = FLAKE.read_text(encoding="utf-8")
    for key, value in (("version", version), ("url", url), ("hash", sri)):
        text, count = re.subn(r'(\n        %s = ")[^"]*(";)' % key, r"\g<1>%s\g<2>" % value, text, count=1)
        if count != 1:
            sys.exit(f"flake.nix: {key} im release-Block nicht gefunden")
    FLAKE.write_text(text, encoding="utf-8", newline="\n")
    print(f"flake.nix: {version}, {len(data)} Bytes, {sri}")


if __name__ == "__main__":
    main()
