/**
 * Settings configuration and management
 * @module info/settings
 */

import path from "path";
import os from "os";
import fs from "fs";
import process from "process";

// Settings file paths
export const SETTINGS_FILE = path.join(
  os.homedir(),
  ".config",
  "systeminfo-settings.json",
);
export const CACHE_FILE = path.join(os.tmpdir(), "systeminfo-cache.json");

// Color codes
export const colors = {
  reset: "\x1b[0m",
  red: "\x1b[38;5;196m",
  orange: "\x1b[38;5;208m",
  yellow: "\x1b[38;5;226m",
  green: "\x1b[38;5;46m",
  blue: "\x1b[38;5;39m",
  cyan: "\x1b[38;5;51m",
  purple: "\x1b[38;5;171m",
  magenta: "\x1b[38;5;213m",
  gray: "\x1b[38;5;250m",
  lightblue: "\x1b[38;5;220m",
};

// Default settings
export const DEFAULT_SETTINGS = {
  display_order: [
    ["user", "hostname", "os", "device", "kernel", "cpu", "gpu", "bench"],
    [
      "disk_used",
      "ram_used",
      "top_process",
      "uptime",
      "temperature",
      "battery",
      "load_average",
    ],
    ["ip", "iplocal", "city", "domain", "isp"],
    ["shell", "services_running", "pacman", "containers"],
  ],
  colors: {
    user: "red",
    hostname: "orange",
    disk_used: "purple",
    ram_used: "yellow",
    top_process: "magenta",
    uptime: "cyan",
    ip: "green",
    iplocal: "yellow",
    city: "green",
    domain: "gray",
    isp: "lightblue",
    os: "gray",
    cpu: "orange",
    gpu: "yellow",
    bench: "red",
    device: "yellow",
    kernel: "green",
    shell: "orange",
    pacman: "multicolor",
    ports: "multicolor",
    containers: "green",
    memory_available: "blue",
    swap_used: "purple",
    load_average: "red",
    users_logged_in: "cyan",
    network_interfaces: "yellow",
    mount_points: "gray",
    services_running: "green",
    temperature: "red",
    battery: "green",
    screen_resolution: "blue",
  },
  emojis: {
    user: "👤 ",
    hostname: "🏠 ",
    ip: "🌎 ",
    iplocal: "🌐 ",
    city: "📍 ",
    domain: "🔗 ",
    isp: "👮 ",
    os: "⚡ ",
    cpu: "📈 ",
    gpu: "🎮 ",
    bench: "💪 ",
    device: "💻 ",
    kernel: "🔧 ",
    shell: "🐚 ",
    pacman: "🚀 ",
    disk_used: "📁 ",
    ram_used: "💾 ",
    top_process: "🔝 ",
    uptime: "⏱️ ",
    ports: "🔌 ",
    containers: "📦 ",
    memory_available: "🧠 ",
    swap_used: "🔄 ",
    load_average: "⚖️ ",
    users_logged_in: "👥 ",
    network_interfaces: "🌐 ",
    mount_points: "📂 ",
    services_running: "⚙️ ",
    temperature: "🌡️ ",
    battery_charging: "🔌 ",
    battery: "🔋 ",
    screen_resolution: "🖥️ ",
  },
  labels: {
    user: "User",
    hostname: "Host",
    ip: "IP",
    iplocal: "Local IP",
    city: "City",
    domain: "Domain",
    isp: "ISP",
    os: "OS",
    cpu: "CPU",
    gpu: "GPU",
    bench: "Bench",
    device: "Device",
    kernel: "Kernel",
    shell: "Shell",
    pacman: "Packages",
    disk_used: "Disk",
    ram_used: "RAM",
    top_process: "Top",
    uptime: "Uptime",
    ports: "Ports",
    containers: "Containers",
    memory_available: "Memory",
    swap_used: "Swap",
    load_average: "Load",
    users_logged_in: "Users",
    network_interfaces: "Network",
    mount_points: "Mounts",
    services_running: "Services",
    temperature: "Temp",
    battery_charging: "Battery",
    battery: "Battery",
    screen_resolution: "Resolution",
  },
  display: {
    show_emojis: true,
    single_line: false,
    line_wrap_length: process?.stdout?.columns || 100,
  },
  network: {
    show_offline_message: true,
  },
  advanced: {
    debug: false,
  },
};

export interface Settings {
  display_order: string[][];
  colors: Record<string, string>;
  emojis: Record<string, string>;
  labels: Record<string, string>;
  display: {
    show_emojis: boolean;
    single_line: boolean;
    line_wrap_length: number;
  };
  network: {
    show_offline_message: boolean;
  };
  advanced: {
    debug: boolean;
  };
}

/**
 * Loads settings from the configuration file
 * @returns Settings object (defaults merged with user settings)
 */
export function loadSettings(): Settings {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const settings = JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf8"));
      return { ...DEFAULT_SETTINGS, ...settings };
    }
  } catch {}
  return DEFAULT_SETTINGS;
}

/**
 * Saves settings to the configuration file
 * @param settings - The settings object to save
 * @returns True if successful, false otherwise
 */
export function saveSettings(settings: Settings): boolean {
  try {
    const configDir = path.dirname(SETTINGS_FILE);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
    return true;
  } catch {
    return false;
  }
}
