import json
import os
from pathlib import Path

import yaml
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles

load_dotenv()

ROOT = Path(__file__).resolve().parent.parent
CONFIG_DIR = ROOT / "config"
DATA_DIR = ROOT / "data"
IMG_DIR = ROOT / "img"
DIST_DIR = ROOT / "dist"

app = FastAPI(title="Fair Districts GA - Georgia Explorer")


def load_yaml(path: Path) -> dict:
    with open(path) as f:
        return yaml.safe_load(f)


@app.get("/api/config")
def get_config():
    """Return app config + Mapbox token to the frontend."""
    config = load_yaml(CONFIG_DIR / "config.yml")
    maps = load_yaml(CONFIG_DIR / "maps.yml")
    return {
        "mapboxToken": os.getenv("MAPBOX_TOKEN", ""),
        "map": config["map"],
        "tilesets": maps["tilesets"],
        "districtPlans": maps["districtPlans"],
        "overlays": maps["overlays"],
        "boundaries": maps["boundaries"],
    }


@app.get("/api/demographics/{chamber}")
def get_demographics(chamber: str):
    """Return pre-fetched Census ACS demographics for a district chamber.
    Run scripts/fetch_district_demographics.py to populate data/demographics/.
    """
    allowed = {"congress", "senate", "house"}
    if chamber not in allowed:
        raise HTTPException(status_code=400, detail="Unknown chamber")
    path = DATA_DIR / "demographics" / f"{chamber}.json"
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"No demographics data for {chamber}. Run scripts/fetch_district_demographics.py first.")
    with open(path) as f:
        return json.load(f)


# Static file mounts — order matters (most specific first)
app.mount("/data", StaticFiles(directory=str(DATA_DIR)), name="data")
app.mount("/img", StaticFiles(directory=str(IMG_DIR)), name="img")

# Serve built frontend in production
if DIST_DIR.exists():
    app.mount("/", StaticFiles(directory=str(DIST_DIR), html=True), name="frontend")
