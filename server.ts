import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { FieldValue } from "firebase-admin/firestore";
import { db } from "./src/lib/firebase.server";
import firebaseConfig from "./firebase-applet-config.json";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  
  const blockedIps = new Set<string>();

  async function refreshBlockedIps() {
    try {
      const snapshot = await db.collection("blocked_ips").get();
      blockedIps.clear();
      snapshot.forEach((doc) => blockedIps.add(doc.id));
      console.log("Blocked IPs refreshed:", blockedIps.size);
    } catch (e) {
      console.error("Error refreshing blocked IPs:", {
        message: e instanceof Error ? e.message : String(e),
        stack: e instanceof Error ? e.stack : undefined,
        projectId: firebaseConfig.projectId,
        databaseId: (firebaseConfig as any).firestoreDatabaseId,
      });
    }
  }

  // Refresh every 5 minutes
  console.log("Setting interval for refreshing blocked IPs...");
  setInterval(refreshBlockedIps, 5 * 60 * 1000);
  console.log("Calling refreshBlockedIps for the first time...");
  refreshBlockedIps();
  console.log("refreshBlockedIps called.");

  // Middleware for blocking
  app.use((req, res, next) => {
    // For local testing, ensure we handle IP correctly (often behind proxy)
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || "";
    if (ip && blockedIps.has(ip)) {
      console.log(`Blocked access from IP: ${ip}`);
      return res.status(403).send("Access Denied");
    }
    next();
  });

  app.post("/api/log-access", async (req, res) => {
    const { url, referrer, userAgent } = req.body;
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || "";
    
    try {
      await db.collection('access_logs').add({
        timestamp: FieldValue.serverTimestamp(),
        url,
        referrer,
        userAgent,
        ip
      });
      res.status(200).send("Logged");
    } catch (e) {
      console.error("Error logging access:", {
        message: e instanceof Error ? e.message : String(e),
        stack: e instanceof Error ? e.stack : undefined,
        projectId: firebaseConfig.projectId,
        databaseId: (firebaseConfig as any).firestoreDatabaseId,
      });
      res.status(500).send("Error logging");
    }
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
