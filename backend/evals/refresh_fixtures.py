"""
Downloads latest html for list of set examples.
"""

from pathlib import Path
import requests

URLS = {
    "artisan-bread": "https://www.kitchensanctuary.com/artisan-bread-recipe/",
    "tuscan-chicken": "https://www.delish.com/cooking/recipe-ideas/a19636089/creamy-tuscan-chicken-recipe/",
    "potato-soup": "https://sugarspunrun.com/creamy-potato-soup-recipe/"
}
USER_AGENT = """
Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36
""".strip()
HEADERS = {
    "User-Agent": USER_AGENT
}

def main() -> None:
    for name, url in URLS.items():
        html = requests.get(url, headers=HEADERS).text
        with open(Path(__file__).parent / "fixtures" / f"{name}.html", "w") as f:
            f.write(html)

if __name__ == "__main__":
    main()