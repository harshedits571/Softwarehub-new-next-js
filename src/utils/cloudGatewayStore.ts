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

// Global in-memory cache surviving hot reloads
const globalForGateways = global as unknown as {
  __cloudGatewaysCache?: Map<string, GatewayRecord>;
};

const gatewayMap = globalForGateways.__cloudGatewaysCache || new Map<string, GatewayRecord>();
if (!globalForGateways.__cloudGatewaysCache) {
  globalForGateways.__cloudGatewaysCache = gatewayMap;
}

function getStoragePath(): string {
  const localDataDir = path.join(process.cwd(), "data");
  if (fs.existsSync(localDataDir)) {
    return path.join(localDataDir, "cloud_gateways.json");
  }
  return path.join("/tmp", "cloud_gateways.json");
}

function loadFromDisk() {
  try {
    const file = getStoragePath();
    if (fs.existsSync(file)) {
      const raw = fs.readFileSync(file, "utf8");
      const list: GatewayRecord[] = JSON.parse(raw);
      if (Array.isArray(list)) {
        list.forEach((item) => {
          if (item.licenseKey) gatewayMap.set(item.licenseKey.toUpperCase(), item);
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
    // Ignore write errors
  }
}

// Initialize on import
loadFromDisk();

export function setGatewayRecord(record: GatewayRecord) {
  gatewayMap.set(record.licenseKey.toUpperCase(), record);
  saveToDisk();
}

export function getGatewayByKey(key: string): GatewayRecord | null {
  loadFromDisk();
  return gatewayMap.get(key.toUpperCase()) || null;
}

export function getGatewayByEmail(email: string): GatewayRecord | null {
  loadFromDisk();
  const cleanEmail = email.toLowerCase().trim();
  for (const item of gatewayMap.values()) {
    if (item.email && item.email.toLowerCase().trim() === cleanEmail) {
      return item;
    }
  }
  return null;
}
