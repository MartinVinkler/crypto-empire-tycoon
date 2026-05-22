import { Router } from "express";

const router = Router();

router.post("/overpass", async (req, res) => {
  const { query } = req.body as { query?: string };
  if (!query || typeof query !== "string") {
    res.status(400).json({ error: "Missing query" });
    return;
  }
  try {
    const upstream = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json",
        "User-Agent": "CryptoEmpireTycoon/1.0",
      },
      body: "data=" + encodeURIComponent(query),
      signal: AbortSignal.timeout(28_000),
    });
    if (!upstream.ok) {
      res.status(502).json({ error: "Overpass returned " + upstream.status });
      return;
    }
    const data = await upstream.json();
    res.json(data);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(502).json({ error: msg });
  }
});

export default router;
