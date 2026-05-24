import math
import os
import urllib.request
import uuid
from contextlib import asynccontextmanager
from datetime import datetime
from pathlib import Path
from typing import Optional

import json
import urllib.error

import aiofiles
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles

UPLOADS_DIR = Path(__file__).parent / "uploads"
UPLOADS_DIR.mkdir(exist_ok=True)

STATIC_DIR = Path(__file__).parent / "static"

TURSO_URL = os.environ.get("TURSO_URL", "")
TURSO_TOKEN = os.environ.get("TURSO_TOKEN", "")
CLUSTER_RADIUS_KM = 2.0
PORT = int(os.environ.get("PORT", 8000))

ISSUE_TYPES = ["pothole", "bad_road", "waterlogging", "missing_manhole", "broken_footpath", "street_light", "garbage", "other"]
SEVERITIES = ["low", "medium", "high", "critical"]
STATUSES = ["reported", "acknowledged", "in_progress", "resolved"]


def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _turso_http_url() -> str:
    """Convert libsql:// URL to https:// for the Turso HTTP API."""
    return TURSO_URL.replace("libsql://", "https://", 1)


class _TursoResult:
    """Mimics sqlite3 cursor: rows are plain dicts."""
    def __init__(self, cols: list[str], rows: list[dict]):
        self._cols = cols
        self._rows = rows
        self._pos = 0

    def fetchone(self):
        if self._pos >= len(self._rows):
            return None
        row = self._rows[self._pos]
        self._pos += 1
        return row

    def fetchall(self):
        return self._rows[self._pos:]

    def __iter__(self):
        return iter(self._rows)


class TursoConn:
    """
    Lightweight sqlite3-compatible wrapper over the Turso HTTP pipeline API.
    Batches all execute() calls and flushes on commit() or close().
    """
    def __init__(self):
        self._pending: list[dict] = []   # write stmts queued until commit
        self._base = _turso_http_url()
        self._headers = {
            "Authorization": f"Bearer {TURSO_TOKEN}",
            "Content-Type": "application/json",
        }

    def _send(self, stmts: list[dict]) -> list:
        requests = [{"type": "execute", "stmt": s} for s in stmts]
        requests.append({"type": "close"})
        body = json.dumps({"requests": requests}).encode()
        req = urllib.request.Request(
            f"{self._base}/v2/pipeline",
            data=body,
            headers=self._headers,
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read())

        results = []
        for item in data.get("results", []):
            if item.get("type") == "error":
                raise RuntimeError(f"Turso error: {item['error']}")
            if item.get("type") == "ok" and item["response"]["type"] == "execute":
                result = item["response"]["result"]
                cols = [c["name"] for c in result["cols"]]
                rows = []
                for raw_row in result["rows"]:
                    row = {}
                    for col, cell in zip(cols, raw_row):
                        val = cell.get("value")
                        if cell.get("type") == "integer" and val is not None:
                            val = int(val)
                        elif cell.get("type") == "float" and val is not None:
                            val = float(val)
                        row[col] = val
                    rows.append(row)
                results.append(_TursoResult(cols, rows))
        return results

    def _build_args(self, params) -> list:
        args = []
        for p in params:
            if p is None:
                args.append({"type": "null"})
            elif isinstance(p, bool):
                args.append({"type": "integer", "value": str(int(p))})
            elif isinstance(p, int):
                args.append({"type": "integer", "value": str(p)})
            elif isinstance(p, float):
                args.append({"type": "float", "value": p})
            else:
                args.append({"type": "text", "value": str(p)})
        return args

    def execute(self, sql: str, params=()) -> _TursoResult:
        stmt = {"sql": sql, "args": self._build_args(params)}
        if sql.strip().upper().startswith(("SELECT", "PRAGMA")):
            results = self._send([stmt])
            return results[0] if results else _TursoResult([], [])
        else:
            self._pending.append(stmt)
            return _TursoResult([], [])

    def batch_read(self, queries: list[tuple[str, tuple]]) -> list[_TursoResult]:
        """Send multiple SELECT statements in ONE HTTP round-trip."""
        stmts = [{"sql": sql, "args": self._build_args(params)} for sql, params in queries]
        return self._send(stmts)

    def commit(self):
        if self._pending:
            self._send(self._pending)
            self._pending = []

    def close(self):
        self.commit()


def get_db() -> TursoConn:
    return TursoConn()


def init_db():
    conn = get_db()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS clusters (
            id TEXT PRIMARY KEY,
            center_lat REAL NOT NULL,
            center_lng REAL NOT NULL,
            issue_count INTEGER DEFAULT 1,
            primary_type TEXT NOT NULL,
            max_severity TEXT NOT NULL,
            area_name TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS issues (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            type TEXT NOT NULL,
            severity TEXT NOT NULL,
            description TEXT,
            latitude REAL NOT NULL,
            longitude REAL NOT NULL,
            address TEXT,
            photo_path TEXT,
            status TEXT DEFAULT 'reported',
            cluster_id TEXT,
            reporter_name TEXT,
            upvotes INTEGER DEFAULT 0,
            created_at TEXT NOT NULL,
            FOREIGN KEY (cluster_id) REFERENCES clusters(id)
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS comments (
            id TEXT PRIMARY KEY,
            issue_id TEXT NOT NULL,
            content TEXT NOT NULL,
            author_name TEXT,
            created_at TEXT NOT NULL,
            FOREIGN KEY (issue_id) REFERENCES issues(id)
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS resolutions (
            id TEXT PRIMARY KEY,
            issue_id TEXT NOT NULL UNIQUE,
            photo_path TEXT,
            description TEXT,
            reporter_name TEXT,
            confirm_votes INTEGER DEFAULT 0,
            dispute_votes INTEGER DEFAULT 0,
            created_at TEXT NOT NULL
        )
    """)
    conn.commit()
    conn.close()


SEVERITY_ORDER = {"low": 0, "medium": 1, "high": 2, "critical": 3}


def severity_max(a: str, b: str) -> str:
    return a if SEVERITY_ORDER.get(a, 0) >= SEVERITY_ORDER.get(b, 0) else b


def find_nearest_cluster(conn, lat: float, lng: float):
    clusters = conn.execute("SELECT * FROM clusters").fetchall()
    best, best_dist = None, float("inf")
    for c in clusters:
        d = haversine(lat, lng, c["center_lat"], c["center_lng"])
        if d <= CLUSTER_RADIUS_KM and d < best_dist:
            best_dist = d
            best = c
    return best


def update_cluster_center(conn, cluster_id: str, new_lat: float, new_lng: float):
    cluster = conn.execute("SELECT * FROM clusters WHERE id = ?", (cluster_id,)).fetchone()
    n = cluster["issue_count"]
    conn.execute(
        "UPDATE clusters SET center_lat = ?, center_lng = ?, updated_at = ? WHERE id = ?",
        (
            (cluster["center_lat"] * (n - 1) + new_lat) / n,
            (cluster["center_lng"] * (n - 1) + new_lng) / n,
            datetime.utcnow().isoformat(),
            cluster_id,
        ),
    )


def row_to_dict(row):
    return row if row else None


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="RoadWatch Bangalore API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")


# ── Geocoding proxy ───────────────────────────────────────────────────────────

@app.get("/api/geocode")
def geocode(q: str):
    """Proxy to Nominatim to avoid CORS. Restricts to India."""
    query = urllib.parse.urlencode({"q": q, "format": "json", "countrycodes": "in", "limit": 10, "addressdetails": 1})
    url = f"https://nominatim.openstreetmap.org/search?{query}"
    req = urllib.request.Request(url, headers={"User-Agent": "RoadWatch-Bangalore/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=8) as resp:
            import json
            results = json.loads(resp.read())
            return [
                {
                    "display_name": r["display_name"],
                    "lat": float(r["lat"]),
                    "lng": float(r["lon"]),
                }
                for r in results
            ]
    except Exception as e:
        raise HTTPException(502, f"Geocoding failed: {e}")


import urllib.parse


# ── Issues ────────────────────────────────────────────────────────────────────

@app.post("/api/issues")
async def create_issue(
    title: str = Form(...),
    type: str = Form(...),
    severity: str = Form(...),
    description: str = Form(""),
    latitude: float = Form(...),
    longitude: float = Form(...),
    address: str = Form(""),
    reporter_name: str = Form(""),
    photo: Optional[UploadFile] = File(None),
):
    if type not in ISSUE_TYPES:
        raise HTTPException(400, f"Invalid type. Must be one of: {ISSUE_TYPES}")
    if severity not in SEVERITIES:
        raise HTTPException(400, f"Invalid severity. Must be one of: {SEVERITIES}")

    photo_path = None
    if photo and photo.filename:
        ext = Path(photo.filename).suffix.lower() or ".jpg"
        fname = f"{uuid.uuid4()}{ext}"
        async with aiofiles.open(UPLOADS_DIR / fname, "wb") as f:
            await f.write(await photo.read())
        photo_path = f"/uploads/{fname}"

    issue_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()

    conn = get_db()
    try:
        nearest = find_nearest_cluster(conn, latitude, longitude)

        if nearest:
            cluster_id = nearest["id"]
            conn.execute(
                "UPDATE clusters SET issue_count = issue_count + 1, max_severity = ?, updated_at = ? WHERE id = ?",
                (severity_max(nearest["max_severity"], severity), now, cluster_id),
            )
            update_cluster_center(conn, cluster_id, latitude, longitude)
        else:
            cluster_id = str(uuid.uuid4())
            conn.execute(
                "INSERT INTO clusters (id, center_lat, center_lng, issue_count, primary_type, max_severity, area_name, created_at, updated_at) VALUES (?,?,?,1,?,?,?,?,?)",
                (cluster_id, latitude, longitude, type, severity, address or "", now, now),
            )

        conn.execute(
            "INSERT INTO issues (id, title, type, severity, description, latitude, longitude, address, photo_path, status, cluster_id, reporter_name, upvotes, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,0,?)",
            (issue_id, title, type, severity, description, latitude, longitude, address, photo_path, "reported", cluster_id, reporter_name, now),
        )
        conn.commit()

        issue = row_to_dict(conn.execute("SELECT * FROM issues WHERE id = ?", (issue_id,)).fetchone())
        cluster = row_to_dict(conn.execute("SELECT * FROM clusters WHERE id = ?", (cluster_id,)).fetchone())
        return {"issue": issue, "cluster": cluster, "is_new_cluster": nearest is None}
    finally:
        conn.close()


@app.get("/api/issues")
def get_issues(
    type: Optional[str] = None,
    severity: Optional[str] = None,
    status: Optional[str] = None,
    cluster_id: Optional[str] = None,
    limit: int = 200,
):
    conn = get_db()
    try:
        query = "SELECT i.*, (SELECT COUNT(*) FROM comments c WHERE c.issue_id = i.id) as comment_count FROM issues i WHERE 1=1"
        params: list = []
        if type:
            query += " AND i.type = ?"
            params.append(type)
        if severity:
            query += " AND i.severity = ?"
            params.append(severity)
        if status:
            query += " AND i.status = ?"
            params.append(status)
        if cluster_id:
            query += " AND i.cluster_id = ?"
            params.append(cluster_id)
        query += " ORDER BY i.created_at DESC LIMIT ?"
        params.append(limit)
        issues = [row_to_dict(r) for r in conn.execute(query, params).fetchall()]
        return {"issues": issues, "total": len(issues)}
    finally:
        conn.close()


@app.get("/api/issues/{issue_id}")
def get_issue(issue_id: str):
    conn = get_db()
    try:
        issue = row_to_dict(conn.execute(
            "SELECT i.*, (SELECT COUNT(*) FROM comments c WHERE c.issue_id = i.id) as comment_count FROM issues i WHERE i.id = ?",
            (issue_id,)
        ).fetchone())
        if not issue:
            raise HTTPException(404, "Issue not found")
        cluster = row_to_dict(conn.execute("SELECT * FROM clusters WHERE id = ?", (issue["cluster_id"],)).fetchone())
        siblings = [row_to_dict(r) for r in conn.execute(
            "SELECT i.*, (SELECT COUNT(*) FROM comments c WHERE c.issue_id = i.id) as comment_count FROM issues i WHERE i.cluster_id = ? AND i.id != ? ORDER BY i.created_at DESC LIMIT 5",
            (issue["cluster_id"], issue_id)
        ).fetchall()]
        return {"issue": issue, "cluster": cluster, "related_reports": siblings}
    finally:
        conn.close()


@app.post("/api/issues/{issue_id}/upvote")
def upvote_issue(issue_id: str):
    conn = get_db()
    try:
        if not conn.execute("SELECT id FROM issues WHERE id = ?", (issue_id,)).fetchone():
            raise HTTPException(404, "Issue not found")
        conn.execute("UPDATE issues SET upvotes = upvotes + 1 WHERE id = ?", (issue_id,))
        conn.commit()
        return {"upvotes": conn.execute("SELECT upvotes FROM issues WHERE id = ?", (issue_id,)).fetchone()["upvotes"]}
    finally:
        conn.close()


@app.put("/api/issues/{issue_id}/status")
def update_status(issue_id: str, status: str):
    if status not in STATUSES:
        raise HTTPException(400, f"Invalid status. Must be one of: {STATUSES}")
    conn = get_db()
    try:
        conn.execute("UPDATE issues SET status = ? WHERE id = ?", (status, issue_id))
        conn.commit()
        return {"status": status}
    finally:
        conn.close()


# ── Comments ──────────────────────────────────────────────────────────────────

@app.get("/api/issues/{issue_id}/comments")
def get_comments(issue_id: str):
    conn = get_db()
    try:
        comments = [row_to_dict(r) for r in conn.execute(
            "SELECT * FROM comments WHERE issue_id = ? ORDER BY created_at ASC",
            (issue_id,)
        ).fetchall()]
        return {"comments": comments}
    finally:
        conn.close()


@app.post("/api/issues/{issue_id}/comments")
def add_comment(issue_id: str, content: str = Form(...), author_name: str = Form("")):
    if not content.strip():
        raise HTTPException(400, "Comment content cannot be empty")
    if len(content) > 500:
        raise HTTPException(400, "Comment too long (max 500 chars)")
    conn = get_db()
    try:
        if not conn.execute("SELECT id FROM issues WHERE id = ?", (issue_id,)).fetchone():
            raise HTTPException(404, "Issue not found")
        comment_id = str(uuid.uuid4())
        now = datetime.utcnow().isoformat()
        conn.execute(
            "INSERT INTO comments (id, issue_id, content, author_name, created_at) VALUES (?,?,?,?,?)",
            (comment_id, issue_id, content.strip(), author_name.strip() or "Anonymous", now),
        )
        conn.commit()
        return row_to_dict(conn.execute("SELECT * FROM comments WHERE id = ?", (comment_id,)).fetchone())
    finally:
        conn.close()


# ── Clusters ──────────────────────────────────────────────────────────────────

@app.get("/api/clusters")
def get_clusters(type: Optional[str] = None, severity: Optional[str] = None):
    conn = get_db()
    try:
        query = "SELECT * FROM clusters WHERE 1=1"
        params: list = []
        if type:
            query += " AND primary_type = ?"
            params.append(type)
        if severity:
            query += " AND max_severity = ?"
            params.append(severity)
        return {"clusters": [row_to_dict(r) for r in conn.execute(query, params).fetchall()], "total": 0}
    finally:
        conn.close()


@app.get("/api/clusters/{cluster_id}")
def get_cluster(cluster_id: str):
    conn = get_db()
    try:
        cluster = row_to_dict(conn.execute("SELECT * FROM clusters WHERE id = ?", (cluster_id,)).fetchone())
        if not cluster:
            raise HTTPException(404, "Cluster not found")
        issues = [row_to_dict(r) for r in conn.execute(
            "SELECT i.*, (SELECT COUNT(*) FROM comments c WHERE c.issue_id = i.id) as comment_count FROM issues i WHERE i.cluster_id = ? ORDER BY i.created_at DESC",
            (cluster_id,)
        ).fetchall()]
        return {"cluster": cluster, "issues": issues}
    finally:
        conn.close()


# ── Stats ─────────────────────────────────────────────────────────────────────

@app.get("/api/stats")
def get_stats():
    conn = get_db()
    try:
        # All 11 queries in ONE Turso HTTP round-trip
        results = conn.batch_read([
            ("SELECT COUNT(*) as c FROM issues", ()),
            ("SELECT COUNT(*) as c FROM clusters", ()),
            ("SELECT COUNT(*) as c FROM issues WHERE status = 'resolved'", ()),
            ("SELECT COUNT(*) as c FROM issues WHERE status = 'in_progress'", ()),
            ("SELECT COUNT(*) as c FROM issues WHERE severity = 'critical'", ()),
            ("SELECT COUNT(*) as c FROM comments", ()),
            ("SELECT type, COUNT(*) as c FROM issues GROUP BY type", ()),
            ("SELECT severity, COUNT(*) as c FROM issues GROUP BY severity", ()),
            ("SELECT status, COUNT(*) as c FROM issues GROUP BY status", ()),
            ("SELECT * FROM clusters ORDER BY issue_count DESC LIMIT 10", ()),
            ("SELECT DATE(created_at) as date, COUNT(*) as count FROM issues WHERE created_at >= datetime('now', '-7 days') GROUP BY DATE(created_at) ORDER BY date", ()),
        ])
        r0, r1, r2, r3, r4, r5, r6, r7, r8, r9, r10 = results

        return {
            "total_issues":   r0.fetchone()["c"],
            "total_clusters": r1.fetchone()["c"],
            "resolved":       r2.fetchone()["c"],
            "in_progress":    r3.fetchone()["c"],
            "critical":       r4.fetchone()["c"],
            "total_comments": r5.fetchone()["c"],
            "by_type":     {r["type"]:     r["c"] for r in r6.fetchall()},
            "by_severity": {r["severity"]: r["c"] for r in r7.fetchall()},
            "by_status":   {r["status"]:   r["c"] for r in r8.fetchall()},
            "top_clusters": [row_to_dict(r) for r in r9.fetchall()],
            "recent_7d":    [dict(r) for r in r10.fetchall()],
        }
    finally:
        conn.close()


@app.get("/api/export/csv")
def export_csv():
    conn = get_db()
    try:
        issues = conn.execute("SELECT * FROM issues ORDER BY created_at DESC").fetchall()
        lines = ["id,title,type,severity,status,latitude,longitude,address,reporter_name,upvotes,created_at"]
        for i in issues:
            lines.append(f'{i["id"]},{i["title"]},{i["type"]},{i["severity"]},{i["status"]},{i["latitude"]},{i["longitude"]},"{i["address"] or ""}","{i["reporter_name"] or ""}",{i["upvotes"]},{i["created_at"]}')
        from fastapi.responses import Response
        return Response(
            content="\n".join(lines).encode(),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=roadwatch_bangalore.csv"},
        )
    finally:
        conn.close()


# ── Resolutions ───────────────────────────────────────────────────────────────

CONFIRM_THRESHOLD = 3   # votes needed to auto-resolve
DISPUTE_THRESHOLD = 2   # votes needed to reopen

@app.post("/api/issues/{issue_id}/resolve")
async def submit_resolution(
    issue_id: str,
    description: str = Form(""),
    reporter_name: str = Form(""),
    photo: Optional[UploadFile] = File(None),
):
    conn = get_db()
    try:
        issue = conn.execute("SELECT id, status FROM issues WHERE id = ?", (issue_id,)).fetchone()
        if not issue:
            raise HTTPException(404, "Issue not found")
        if issue["status"] == "resolved":
            raise HTTPException(400, "Issue is already resolved")
        if conn.execute("SELECT id FROM resolutions WHERE issue_id = ?", (issue_id,)).fetchone():
            raise HTTPException(400, "A resolution is already pending for this issue")

        photo_path = None
        if photo and photo.filename:
            ext = Path(photo.filename).suffix.lower() or ".jpg"
            fname = f"res_{uuid.uuid4()}{ext}"
            async with aiofiles.open(UPLOADS_DIR / fname, "wb") as f:
                await f.write(await photo.read())
            photo_path = f"/uploads/{fname}"

        res_id = str(uuid.uuid4())
        now = datetime.utcnow().isoformat()
        conn.execute(
            "INSERT INTO resolutions (id, issue_id, photo_path, description, reporter_name, confirm_votes, dispute_votes, created_at) VALUES (?,?,?,?,?,0,0,?)",
            (res_id, issue_id, photo_path, description, reporter_name, now),
        )
        conn.execute("UPDATE issues SET status = 'pending_resolution' WHERE id = ?", (issue_id,))
        conn.commit()
        return row_to_dict(conn.execute("SELECT * FROM resolutions WHERE id = ?", (res_id,)).fetchone())
    finally:
        conn.close()


@app.get("/api/issues/{issue_id}/resolution")
def get_resolution(issue_id: str):
    conn = get_db()
    try:
        res = row_to_dict(conn.execute("SELECT * FROM resolutions WHERE issue_id = ?", (issue_id,)).fetchone())
        if not res:
            raise HTTPException(404, "No resolution found for this issue")
        return res
    finally:
        conn.close()


@app.post("/api/issues/{issue_id}/resolution/confirm")
def confirm_resolution(issue_id: str):
    conn = get_db()
    try:
        res = conn.execute("SELECT * FROM resolutions WHERE issue_id = ?", (issue_id,)).fetchone()
        if not res:
            raise HTTPException(404, "No resolution pending")
        new_confirms = res["confirm_votes"] + 1
        conn.execute("UPDATE resolutions SET confirm_votes = ? WHERE issue_id = ?", (new_confirms, issue_id))
        if new_confirms >= CONFIRM_THRESHOLD:
            conn.execute("UPDATE issues SET status = 'resolved' WHERE id = ?", (issue_id,))
        conn.commit()
        return {"confirm_votes": new_confirms, "dispute_votes": res["dispute_votes"], "resolved": new_confirms >= CONFIRM_THRESHOLD}
    finally:
        conn.close()


@app.post("/api/issues/{issue_id}/resolution/dispute")
def dispute_resolution(issue_id: str):
    conn = get_db()
    try:
        res = conn.execute("SELECT * FROM resolutions WHERE issue_id = ?", (issue_id,)).fetchone()
        if not res:
            raise HTTPException(404, "No resolution pending")
        new_disputes = res["dispute_votes"] + 1
        conn.execute("UPDATE resolutions SET dispute_votes = ? WHERE issue_id = ?", (new_disputes, issue_id))
        if new_disputes >= DISPUTE_THRESHOLD:
            conn.execute("DELETE FROM resolutions WHERE issue_id = ?", (issue_id,))
            conn.execute("UPDATE issues SET status = 'reported' WHERE id = ?", (issue_id,))
        conn.commit()
        return {"confirm_votes": res["confirm_votes"], "dispute_votes": new_disputes, "reopened": new_disputes >= DISPUTE_THRESHOLD}
    finally:
        conn.close()


# ── SPA fallback (must be last) ───────────────────────────────────────────────

if STATIC_DIR.exists():
    app.mount("/assets", StaticFiles(directory=str(STATIC_DIR / "assets")), name="spa-assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str):
        file = STATIC_DIR / full_path
        if file.is_file():
            return FileResponse(str(file))
        index = STATIC_DIR / "index.html"
        if index.exists():
            return HTMLResponse(index.read_text())
        raise HTTPException(404, "Not found")
