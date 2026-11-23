#!/usr/bin/env python3
"""Fetch real climate & PM2.5 data from CMUCCDC Open APIs into data/ without storing API keys."""

from __future__ import annotations

import json
import math
import os
import ssl
import time
import urllib.error
import urllib.request
from collections import defaultdict
from datetime import datetime, timezone, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"

USER_SITES = [
    {"id": "usr_saraphi", "name": "โรงเรียนสารภีพิทยาคม", "lat": 18.7126, "lng": 99.0354, "count": 4, "mock_temp": 31.0},
    {"id": "usr_maetha", "name": "โรงเรียนบ้านศาลาแม่ทา", "lat": 18.4552, "lng": 99.1354, "count": 3, "mock_temp": 30.5},
    {"id": "usr_maechaem", "name": "องค์การบริหารส่วนตำบลกองแขก", "lat": 18.5200, "lng": 98.4200, "count": 6, "mock_temp": 28.5},
    {"id": "usr_maechan", "name": "รพ.สต.สันทราย (แม่จัน)", "lat": 20.1511, "lng": 99.8520, "count": 4, "mock_temp": 31.4},
    {"id": "usr_omkoi", "name": "รพ.สต.บ้านยางเปียง (อมก๋อย)", "lat": 17.7850, "lng": 98.3580, "count": 3, "mock_temp": 29.2},
    {"id": "usr_chiangdao", "name": "รพ.สต.บ้านแม่นะ (เชียงดาว)", "lat": 19.3300, "lng": 98.9600, "count": 4, "mock_temp": 29.8},
    {"id": "usr_cholae", "name": "รพ.สต.บ้านช่อแล (แม่แตง)", "lat": 19.1480, "lng": 99.0200, "count": 3, "mock_temp": 31.0},
    {"id": "usr_soppoeng", "name": "รพ.สต.บ้านปางม่วง (แม่แตง)", "lat": 19.0600, "lng": 98.7800, "count": 3, "mock_temp": 30.2},
]


def load_api_key() -> str:
    key = os.environ.get("CMUCCDC_API_KEY", "").strip()
    if key:
        return key
    env_file = ROOT / ".env"
    if env_file.exists():
        for line in env_file.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line.startswith("CMUCCDC_API_KEY="):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    raise RuntimeError("Set CMUCCDC_API_KEY in environment or .env before running.")


def fetch_json(url: str, api_key: str, *, insecure_ssl: bool = False, use_query_key: bool = False):
    ctx = ssl._create_unverified_context() if insecure_ssl else None
    headers = {"User-Agent": "LHS-Climate-Dashboard/1.0"}
    if use_query_key:
        sep = "&" if "?" in url else "?"
        url = f"{url}{sep}apikey={api_key}"
    else:
        headers["Authorization"] = f"Bearer {api_key}"
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=30, context=ctx) as resp:
        return json.loads(resp.read().decode("utf-8", errors="replace"))


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371.0
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = (
        math.sin(d_lat / 2) ** 2
        + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(d_lon / 2) ** 2
    )
    return 2 * r * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def format_dist(km: float) -> str:
    return f"{round(km * 1000)} ม." if km < 1.0 else f"{km:.1f} กม."


def to_float(val) -> float | None:
    if val in (None, "", "null"):
        return None
    try:
        n = float(val)
        return n if math.isfinite(n) else None
    except (TypeError, ValueError):
        return None


def parse_history_rows(payload) -> list[dict]:
    if isinstance(payload, list):
        return payload
    if isinstance(payload, dict):
        for key in ("value", "data", "records", "rows"):
            if isinstance(payload.get(key), list):
                return payload[key]
    return []


def build_daily_observed(rows: list[dict]) -> list[dict]:
    daily_pm: dict[str, list[float]] = defaultdict(list)
    daily_temp: dict[str, list[float]] = defaultdict(list)
    for row in rows:
        dt = (row.get("log_datetime") or row.get("datetime") or row.get("date") or "")[:10]
        if len(dt) != 10:
            continue
        pv = to_float(row.get("pm25"))
        if pv is not None:
            daily_pm[dt].append(pv)
        tv = to_float(row.get("temp"))
        if tv is not None and tv > 0:
            daily_temp[dt].append(tv)
    observed = []
    for dt in sorted(daily_pm.keys()):
        pm_avg = round(sum(daily_pm[dt]) / len(daily_pm[dt]), 1)
        t_avg = (
            round(sum(daily_temp[dt]) / len(daily_temp[dt]), 1)
            if daily_temp.get(dt)
            else None
        )
        observed.append({"date": dt, "pm25": pm_avg, "temp": t_avg})
    return observed


def load_monthly_database_rows(api_key: str, bkk_now: datetime) -> dict[str, list[dict]]:
    """Fetch all-station monthly archives (/api/dustboy/database/{yyyy}{mm}) in 2 bulk calls."""
    first_of_month = bkk_now.replace(day=1)
    prev_month = first_of_month - timedelta(days=1)
    months = sorted({prev_month.strftime("%Y%m"), bkk_now.strftime("%Y%m")})
    rows_by_station: dict[str, list[dict]] = defaultdict(list)
    for ym in months:
        db_path = DATA_DIR / f"database_{ym}.json"
        payload = None
        try:
            payload = fetch_json(
                f"https://open-api.cmuccdc.org/api/dustboy/database/{ym}",
                api_key,
                use_query_key=True,
            )
            db_path.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
        except urllib.error.HTTPError as exc:
            if db_path.exists():
                print(f"  Using cached {db_path.name} (API error: HTTP {exc.code})")
                payload = json.loads(db_path.read_text(encoding="utf-8"))
            else:
                print(f"  Skipping database/{ym} (HTTP {exc.code})")
        for row in parse_history_rows(payload):
            sid = str(
                row.get("dustboy_id")
                or row.get("station_id")
                or row.get("source_id")
                or row.get("id")
                or ""
            ).strip()
            if sid:
                rows_by_station[sid].append(row)
    return rows_by_station


def main() -> None:
    api_key = load_api_key()
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    bkk_tz = timezone(timedelta(hours=7))
    bkk_now = datetime.now(bkk_tz)

    print("1/3 Fetching live stations from open-api.cmuccdc.org...")
    stations_path = DATA_DIR / "dustboy_stations.json"
    try:
        raw_stations = fetch_json(
            "https://open-api.cmuccdc.org/api/dustboy/stations", api_key, use_query_key=True
        )
        stations_path.write_text(
            json.dumps(raw_stations, ensure_ascii=False, indent=2), encoding="utf-8"
        )
    except urllib.error.HTTPError as exc:
        if exc.code == 401 and stations_path.exists():
            print(f"  Using cached {stations_path.name} (API rate limit: {exc})")
            raw_stations = json.loads(stations_path.read_text(encoding="utf-8"))
        else:
            raise

    print("2/3 Fetching 7-day PM2.5 forecast from pm25_migration.cmuccdc.org...")
    forecast_path = DATA_DIR / "stations_forecast.json"
    try:
        raw_forecast = fetch_json(
            "https://pm25_migration.cmuccdc.org/v1/stations/forecast", api_key, insecure_ssl=True
        )
        forecast_path.write_text(
            json.dumps(raw_forecast, ensure_ascii=False, indent=2), encoding="utf-8"
        )
    except urllib.error.HTTPError as exc:
        if exc.code == 401 and forecast_path.exists():
            print(f"  Using cached {forecast_path.name} (API rate limit: {exc})")
            raw_forecast = json.loads(forecast_path.read_text(encoding="utf-8"))
        else:
            raise

    # Normalize live stations
    stations = []
    temp_stations = []
    for s in raw_stations:
        lat = to_float(s.get("dustboy_lat"))
        lng = to_float(s.get("dustboy_lon"))
        pm25 = to_float(s.get("pm25"))
        if lat is None or lng is None or pm25 is None:
            continue
        temp = to_float(s.get("temp"))
        if temp is not None and temp <= 0:
            temp = None
        humid = to_float(s.get("humid"))
        item = {
            "id": str(s.get("id", "")),
            "dustboy_id": s.get("dustboy_id") or "",
            "name": (s.get("dustboy_name") or "").strip(),
            "lat": lat,
            "lng": lng,
            "pm25": round(pm25, 1),
            "temp": round(temp, 1) if temp is not None else None,
            "humid": round(humid, 1) if humid is not None and humid > 0 else None,
            "log_datetime": s.get("log_datetime") or "",
        }
        stations.append(item)
        if item["temp"] is not None:
            temp_stations.append(item)

    # Fill missing station temp from nearest valid temp sensor (or 30.5 fallback) so map/risk always has numeric temp
    for item in stations:
        if item["temp"] is None:
            if temp_stations:
                nearest_t = min(temp_stations, key=lambda ts: haversine_km(item["lat"], item["lng"], ts["lat"], ts["lng"]))
                item["temp"] = nearest_t["temp"]
            else:
                item["temp"] = 30.5
            item["tempEstimated"] = True

    forecast_stations = [
        fs for fs in raw_forecast.get("stations", [])
        if to_float(fs.get("lat")) is not None and to_float(fs.get("lon")) is not None and fs.get("forecasts")
    ]

    print("3/4 Fetching monthly all-station archive (/api/dustboy/database/{yyyy}{mm})...")
    db_rows_by_id = load_monthly_database_rows(api_key, bkk_now)

    print("4/4 Building site feeds (using bulk archive first, fallback to cached/single data30day)...")
    history_path = DATA_DIR / "station_history.json"
    history_raw_by_id = (
        json.loads(history_path.read_text(encoding="utf-8")) if history_path.exists() else {}
    )
    site_feeds = {}
    for site in USER_SITES:
        ranked = sorted(
            stations,
            key=lambda st: haversine_km(site["lat"], site["lng"], st["lat"], st["lng"]),
        )
        local_list = []
        for st in ranked[: site["count"]]:
            dist_km = haversine_km(site["lat"], site["lng"], st["lat"], st["lng"])
            local_list.append({
                "id": st["id"],
                "name": st["name"],
                "type": f"DustBoy ({st['dustboy_id']})" if st["dustboy_id"] else "DustBoy Sensor",
                "dist": format_dist(dist_km),
                "pm25": st["pm25"],
                "temp": st["temp"],
                "lat": st["lat"],
                "lng": st["lng"],
                "log_datetime": st["log_datetime"],
            })

        primary = ranked[0]
        sid = primary["id"]
        hist_station = primary

        # Prefer bulk /database/{yyyy}{mm} rows matched by numeric id or dustboy_id
        bulk_rows = db_rows_by_id.get(sid) or db_rows_by_id.get(primary.get("dustboy_id", "")) or []
        if not bulk_rows:
            for candidate in ranked[:5]:
                cid = candidate["id"]
                c_bulk = db_rows_by_id.get(cid) or db_rows_by_id.get(candidate.get("dustboy_id", "")) or []
                if c_bulk:
                    bulk_rows = c_bulk
                    sid = cid
                    hist_station = candidate
                    break

        if bulk_rows:
            observed = build_daily_observed(bulk_rows)
        else:
            # Check existing cached station_history.json first; fetch at most 1 uncached primary station
            for candidate in ranked[:5]:
                cid = candidate["id"]
                if (history_raw_by_id.get(cid) or {}).get("value"):
                    sid = cid
                    hist_station = candidate
                    break
            if not (history_raw_by_id.get(sid) or {}).get("value"):
                try:
                    history_raw_by_id[sid] = fetch_json(
                        f"https://open-api.cmuccdc.org/api/dustboy/data30day/{sid}",
                        api_key,
                        use_query_key=True,
                    )
                    time.sleep(0.6)
                except Exception as exc:
                    print(f"  Warning: history fetch failed for station {sid}: {exc}")
                    history_raw_by_id.setdefault(sid, {"value": []})
            observed = build_daily_observed(history_raw_by_id[sid].get("value") or [])

        nearest_fc = min(
            forecast_stations,
            key=lambda fs: haversine_km(site["lat"], site["lng"], float(fs["lat"]), float(fs["lon"])),
        )
        fc_dist_km = haversine_km(site["lat"], site["lng"], float(nearest_fc["lat"]), float(nearest_fc["lon"]))

        site_feeds[site["id"]] = {
            "primaryStationId": primary["id"],
            "primaryStationName": primary["name"],
            "historyStationId": sid,
            "historyStationName": hist_station["name"],
            "basePM": primary["pm25"],
            "baseTemp": primary["temp"] or site["mock_temp"],
            "stations": local_list,
            "observed": observed,
            "forecastStationId": nearest_fc.get("station_id"),
            "forecastStationName": nearest_fc.get("name"),
            "forecastDistKm": round(fc_dist_km, 2),
            "forecastPm25": [
                {
                    "date": f["date"],
                    "h": f["h"],
                    "pm25": round(float(f["pm25"]), 1),
                    "level": f.get("level"),
                    "level_th": f.get("level_th", ""),
                }
                for f in nearest_fc.get("forecasts", [])[:7]
            ],
        }

    (DATA_DIR / "station_history.json").write_text(
        json.dumps(history_raw_by_id, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    snapshot = {
        "source": "cmuccdc-live",
        "fetchedAt": datetime.now(bkk_tz).isoformat(timespec="seconds"),
        "issueDate": raw_forecast.get("issue_date") or datetime.now(bkk_tz).strftime("%Y-%m-%d"),
        "forecastNote": raw_forecast.get("note", ""),
        "stations": [
            {
                "name": st["name"],
                "type": f"DustBoy ({st['dustboy_id']})" if st["dustboy_id"] else "DustBoy Sensor",
                "pm25": st["pm25"],
                "temp": st["temp"],
                "lat": st["lat"],
                "lng": st["lng"],
                "log_datetime": st["log_datetime"],
            }
            for st in stations
        ],
        "siteFeeds": site_feeds,
    }
    (DATA_DIR / "climate-snapshot.js").write_text(
        "// Auto-generated from CMUCCDC Open APIs by scripts/fetch_climate_data.py (no API keys included)\n"
        f"globalThis.LHS_CLIMATE_DATA = {json.dumps(snapshot, ensure_ascii=False)};\n",
        encoding="utf-8",
    )
    print(
        f"Saved data/: stations={len(stations)}, forecastStations={len(forecast_stations)}, "
        f"siteFeeds={len(site_feeds)}, issueDate={snapshot['issueDate']}"
    )


if __name__ == "__main__":
    main()
