import fs from "fs";
import path from "path";

export interface GatewayRecord {
  licenseKey: string;
  email: string;
  tunnelUrl: string | null;
  localUrl: string | null;
  machineName: string;
  machineId: string;
  status: "online" | "offline";
  lastHeartbeat: string;
  updatedAt: string;
}

// Global in-memory cache surviving hot reloads and serverless invocations
const globalForGateways = global as unknown as {
  __cloudGatewaysCache?: Map<string, GatewayRecord>;
};

const gatewayMap = globalForGateways.__cloudGatewaysCache || new Map<string, GatewayRecord>();
if (!globalForGateways.__cloudGatewaysCache) {
  globalForGateways.__cloudGatewaysCache = gatewayMap;
}

function getStoragePath(): string {
  // Use /tmp which is writable on Vercel serverless functions, Linux, and Windows
  if (process.platform === "win32") {
    const localData = path.join(process.cwd(), "data");
    try {
      if (!fs.existsSync(localData)) {
        fs.mkdirSync(localData, { recursive: true });
      }
      return path.join(localData, "cloud_gateways.json");
    } catch (e) {
      return path.join(process.env.TEMP || "C:\\Windows\\Temp", "cloud_gateways.json");
    }
  }
  return "/tmp/cloud_gateways.json";
}

function loadFromDisk() {
  try {
    const file = getStoragePath();
    if (fs.existsSync(file)) {
      const raw = fs.readFileSync(file, "utf8");
      const list: GatewayRecord[] = JSON.parse(raw);
      if (Array.isArray(list)) {
        list.forEach((item) => {
          if (item && item.licenseKey) {
            gatewayMap.set(item.licenseKey.toUpperCase(), item);
          }
        });
      }
    }
  } catch (e) {
    // Ignore read errors
  }
}

function saveToDisk() {
  try {
    const file = getStoragePath();
    const dir = path.dirname(file);
    if (!fs.existsSync(dir)) {
      try { fs.mkdirSync(dir, { recursive: true }); } catch (e) {}
    }
    const list = Array.from(gatewayMap.values());
    fs.writeFileSync(file, JSON.stringify(list, null, 2), "utf8");
  } catch (e) {
    // Ignore write errors (e.g. read-only environments)
  }
}

// Initialize on import
loadFromDisk();

export function setGatewayRecord(record: GatewayRecord) {
  loadFromDisk();
  const cleanKey = record.licenseKey.toUpperCase().trim();
  const cleanEmail = record.email ? record.email.toLowerCase().trim() : "";
  const cleanMachineId = record.machineId ? record.machineId.toLowerCase().trim() : "";
  const cleanTunnel = record.tunnelUrl ? record.tunnelUrl.toLowerCase().trim() : "";

  // 1. If this machineId, tunnelUrl, or email was previously registered under ANY OTHER key:
  // Purge the old record immediately so other accounts CANNOT see or access this machine's tunnel!
  for (const [key, item] of gatewayMap.entries()) {
    if (key !== cleanKey) {
      const matchMachine = cleanMachineId && item.machineId && item.machineId.toLowerCase().trim() === cleanMachineId;
      const matchTunnel = cleanTunnel && item.tunnelUrl && item.tunnelUrl.toLowerCase().trim() === cleanTunnel;
      const matchEmail = cleanEmail && item.email && item.email.toLowerCase().trim() === cleanEmail;

      if (matchMachine || matchTunnel || matchEmail) {
        gatewayMap.delete(key);
      }
    }
  }

  if (record.status === "offline") {
    record.tunnelUrl = null;
  }

  gatewayMap.set(cleanKey, record);
  saveToDisk();
}

export function purgeGatewayByEmail(email: string) {
  loadFromDisk();
  const cleanEmail = email.toLowerCase().trim();
  for (const [key, item] of gatewayMap.entries()) {
    if (item.email && item.email.toLowerCase().trim() === cleanEmail) {
      gatewayMap.delete(key);
    }
  }
  saveToDisk();
}

export function getGatewayByKey(key: string): GatewayRecord | null {
  loadFromDisk();
  const item = gatewayMap.get(key.toUpperCase().trim()) || null;
  if (!item) return null;
  if (item.status === "offline" || !item.tunnelUrl) return null;
  
  // Heartbeat must be fresh within 3 minutes (180,000 ms)
  const itemTime = item.lastHeartbeat
    ? new Date(item.lastHeartbeat).getTime()
    : item.updatedAt
    ? new Date(item.updatedAt).getTime()
    : 0;
  if (itemTime && Date.now() - itemTime > 3 * 60 * 1000) {
    return null;
  }

  return item;
}

export function getGatewayByEmail(email: string): GatewayRecord | null {
  loadFromDisk();
  const cleanEmail = email.toLowerCase().trim();
  let latestMatch: GatewayRecord | null = null;
  let latestTime = 0;

  for (const item of gatewayMap.values()) {
    if (item.email && item.email.toLowerCase().trim() === cleanEmail) {
      // Must be online and have a valid tunnelUrl
      if (item.status === "offline" || !item.tunnelUrl) {
        continue;
      }

      const itemTime = item.lastHeartbeat
        ? new Date(item.lastHeartbeat).getTime()
        : item.updatedAt
        ? new Date(item.updatedAt).getTime()
        : 0;

      // Heartbeat must be fresh within 3 minutes
      if (itemTime && Date.now() - itemTime > 3 * 60 * 1000) {
        continue;
      }

      if (!latestMatch || itemTime >= latestTime) {
        latestMatch = item;
        latestTime = itemTime;
      }
    }
  }
  return latestMatch;
}
