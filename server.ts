import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
async function startServer() {
  const app = express();
  const PORT = 3000;

  app.set("trust proxy", true);
  app.use(express.json());
  
  const blockedIps = new Set<string>();

  // Helper to extract real client IP behind Cloud Run / reverse proxies
  const getClientIp = (req: express.Request): string => {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    } else if (Array.isArray(forwarded) && forwarded.length > 0) {
      return forwarded[0].split(',')[0].trim();
    }
    return req.ip || req.socket.remoteAddress || "";
  };

  // Middleware for blocking
  app.use((req, res, next) => {
    const ip = getClientIp(req);
    if (ip && blockedIps.has(ip)) {
      console.log(`[Blocked Request] Denied access to IP: ${ip}`);
      return res.status(403).send("Access Denied: Your IP has been blocked by administrator.");
    }
    next();
  });

  // Dedicated endpoint to get client's public IP
  app.get("/api/get-client-ip", (req, res) => {
    const ip = getClientIp(req);
    res.json({ ip });
  });

  // Endpoints to manage server in-memory blocklist
  app.post("/api/block-ip", (req, res) => {
    const { ip } = req.body;
    if (ip && typeof ip === "string") {
      blockedIps.add(ip);
      console.log(`IP added to blocklist: ${ip} (Total: ${blockedIps.size})`);
      return res.json({ success: true, count: blockedIps.size });
    }
    res.status(400).json({ error: "Invalid IP" });
  });

  app.post("/api/unblock-ip", (req, res) => {
    const { ip } = req.body;
    if (ip && typeof ip === "string") {
      blockedIps.delete(ip);
      console.log(`IP removed from blocklist: ${ip} (Total: ${blockedIps.size})`);
      return res.json({ success: true, count: blockedIps.size });
    }
    res.status(400).json({ error: "Invalid IP" });
  });

  app.get("/api/blocked-ips", (req, res) => {
    res.json({ blockedIps: Array.from(blockedIps) });
  });

  // Backward compatibility endpoint for access logging
  app.post("/api/log-access", (req, res) => {
    res.status(200).json({ status: "ok" });
  });

  // Image Proxy...
  app.get("/api/proxy", async (req, res) => {
    const imageUrl = req.query.url as string;
    if (!imageUrl) {
      return res.status(400).send("URL is required");
    }

    try {
      const url = new URL(imageUrl);
      const allowedDomains = [
        "images.unsplash.com",
        "firebasestorage.googleapis.com",
        "storage.googleapis.com"
      ];

      if (!allowedDomains.some(domain => url.hostname.endsWith(domain))) {
        console.warn(`Blocked proxy attempt to unauthorized domain: ${url.hostname}`);
        return res.status(403).send("Unauthorized domain");
      }

      const response = await fetch(imageUrl, {
        signal: AbortSignal.timeout(10000) // 10s timeout
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      }

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.startsWith("image/")) {
        return res.status(400).send("URL must point to an image");
      }

      res.setHeader("Content-Type", contentType);
      res.setHeader("Cache-Control", "public, max-age=31536000"); // Cache proxied images
      
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      res.send(buffer);
    } catch (error) {
      console.error("Proxy error:", error);
      res.status(500).send("Error fetching image");
    }
  });

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res, next) => {
      // Only serve index.html for non-asset requests
      if (req.path.startsWith("/assets/") || req.path.includes(".")) {
        return next();
      }
      console.log(`Serving index.html for request: ${req.path}`);
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
