/**
 * Hardware-related system information functions
 * @module info/hardware
 */

import os from "os";
import fs from "fs";
import type { InfoContext } from "../types/internal-types";
import { IS_WINDOWS, IS_LINUX } from "../utils/platform";
import { execCommand } from "../utils/command";
import { getCachedValue, setCachedValue } from "../cache/cache";

/**
 * Gets CPU model name and specifications
 * Uses platform-specific commands (wmic/lscpu/cpuinfo)
 * Automatically strips "with Radeon Graphics" and similar suffixes
 * @param context - Info context with cache
 * @returns CPU model string or empty string
 * @example "Intel Core i7-12700K", "AMD Ryzen 9 5900HX", "Apple M2 Pro"
 */
export function cpu(context: InfoContext): string {
  const cached = getCachedValue(context.cache, "cpu");
  if (cached) return cached;

  let cpuName = "";

  if (IS_WINDOWS) {
    try {
      const wmic = execCommand("wmic cpu get name /format:list");
      const nameMatch = wmic.match(/Name=(.+)/);
      if (nameMatch) {
        cpuName = nameMatch[1].trim();
      }
    } catch {}

    if (!cpuName) {
      try {
        const ps = execCommand(
          'powershell.exe -Command "Get-WmiObject -Class Win32_Processor | Select-Object -ExpandProperty Name"'
        );
        if (ps.trim()) {
          cpuName = ps.trim();
        }
      } catch {}
    }
  } else if (IS_LINUX) {
    try {
      const lscpu = execCommand("lscpu");
      const modelMatch = lscpu.match(/Model name:\s*([^\n,]+)/);
      if (modelMatch) {
        cpuName = modelMatch[1].trim();
      }
    } catch {}

    if (!cpuName) {
      try {
        const cpuInfo = fs.readFileSync("/proc/cpuinfo", "utf8");
        const modelMatch = cpuInfo.match(/model name\s*:\s*([^\n]+)/);
        const hardwareMatch = cpuInfo.match(/Hardware\s*:\s*([^\n]+)/);

        if (modelMatch) {
          cpuName = modelMatch[1].trim();
        } else if (hardwareMatch) {
          cpuName = hardwareMatch[1].trim();
        }
      } catch {}
    }
  } else {
    const cpus = os.cpus();
    if (cpus.length > 0) {
      cpuName = cpus[0].model.trim().replace(/[\r\n]+/g, " ");
    }
  }

  if (!cpuName) {
    setCachedValue(context.cache, "cpu", "");
    return "";
  }

  cpuName = cpuName.trim().replace(/with .*/, "");

  setCachedValue(context.cache, "cpu", cpuName);
  return cpuName;
}

/**
 * Gets graphics card model name
 * Extracts GPU info from lspci (Linux) or WMI (Windows)
 * Filters out basic/generic display adapters
 * @param context - Info context with cache
 * @returns GPU model string or empty string
 * @example "NVIDIA GeForce RTX 4070", "AMD Radeon RX 6800 XT"
 */
export function gpu(context: InfoContext): string {
  const cached = getCachedValue(context.cache, "gpu");
  if (cached !== null) return cached;

  if (IS_WINDOWS) {
    try {
      const wmic = execCommand(
        "wmic path win32_VideoController get name /format:list"
      );
      const nameMatch = wmic.match(/Name=(.+)/);
      if (nameMatch) {
        const gpu = nameMatch[1].trim();
        if (gpu && gpu !== "" && !gpu.includes("Microsoft Basic")) {
          setCachedValue(context.cache, "gpu", gpu);
          return gpu;
        }
      }
    } catch {}

    try {
      const ps = execCommand(
        "powershell.exe -Command \"Get-WmiObject -Class Win32_VideoController | Where-Object {$_.Name -notlike '*Microsoft Basic*'} | Select-Object -First 1 -ExpandProperty Name\""
      );
      if (ps.trim()) {
        const gpu = ps.trim();
        setCachedValue(context.cache, "gpu", gpu);
        return gpu;
      }
    } catch {}
  } else if (IS_LINUX) {
    try {
      const lspci = execCommand("lspci");
      const gpuMatch = lspci.match(
        /VGA.*?(RTX|GeForce|AMD|Intel|NVIDIA)[^\n]*/i
      );
      if (gpuMatch) {
        let gpu = gpuMatch[0];

        const bracketMatch = gpu.match(/\[([^\]]+)\]/);
        if (bracketMatch) {
          gpu = bracketMatch[1];
        } else {
          gpu = gpu
            .replace(/^.*VGA[^:]*:\s*/, "")
            .replace(/\s*\(.*\)$/, "")
            .trim();
        }

        if (gpu) {
          setCachedValue(context.cache, "gpu", gpu);
          return gpu;
        }
      }
    } catch {}
  }

  setCachedValue(context.cache, "gpu", "");
  return "";
}

/**
 * Gets screen resolution from X11 display
 * Uses xrandr command (Linux with X11/Xorg only)
 * @returns Resolution in WIDTHxHEIGHT format or empty string
 * @example "1920x1080", "2560x1440", "3840x2160"
 */
export function screen_resolution(): string {
  if (!IS_LINUX) return "";

  try {
    if (process.env.DISPLAY) {
      const xrandr = execCommand("xrandr");
      const resolutionMatch = xrandr.match(/(\d+x\d+)\+\d+\+\d+/);
      if (resolutionMatch) {
        return resolutionMatch[1];
      }
    }
  } catch {}
  return "";
}

/**
 * Gets CPU benchmark score and rank from Geekbench 6 data
 * Uses fuzzy matching to find similar CPU models
 * @param context - Info context with cache
 * @returns Benchmark info with score and rank, or empty string
 * @example "💪 37.9k #1", "💪 20.5k #68"
 */
export function bench(context: InfoContext): string {
  const cached = getCachedValue(context.cache, "bench");
  if (cached) return cached;

  const cpuName = cpu(context);
  if (!cpuName) {
    setCachedValue(context.cache, "bench", "");
    return "";
  }

  try {
    const benchmarkPath = new URL(
      "../cpu-gb6-multicore-top1000.min.json",
      import.meta.url
    ).pathname;
    const benchmarkData = fs.readFileSync(benchmarkPath, "utf8");
    const parsed = JSON.parse(benchmarkData);
    const scores = parsed.scores as [string, number, number][];

    // Convert to objects for Fuse
    const cpuList = scores.map((item) => ({ name: item[0], score: item[1], rank: item[2] }));

    const Fuse = require("fuse.js");
    const fuse = new Fuse(cpuList, {
      keys: ["name"],
      threshold: 0.4,
      minMatchCharLength: 3,
    });

    const results = fuse.search(cpuName);
    if (results.length > 0) {
      const match = results[0].item;
      const score = Math.round(match.score / 100) / 10;
      const rank = match.rank;
      const result = `💪 ${score}k #${rank}`;
      setCachedValue(context.cache, "bench", result);
      return result;
    }
  } catch (e) {
    // Silently fail
  }

  setCachedValue(context.cache, "bench", "");
  return "";
}

/**
 * Gets detailed CPU benchmark information from Geekbench 6 data
 * Includes score, rank, and architecture type (ARM/Intel/AMD)
 * @param context - Info context with cache
 * @returns Detailed benchmark info with architecture, or empty string
 * @example "Geekbench 6: 37.9k (Rank #1) - ARM", "Geekbench 6: 20.5k (Rank #68) - Intel"
 */
export function cpu_bench_info(context: InfoContext): string {
  const cached = getCachedValue(context.cache, "cpu_bench_info");
  if (cached) return cached;

  const cpuName = cpu(context);
  if (!cpuName) {
    setCachedValue(context.cache, "cpu_bench_info", "");
    return "";
  }

  try {
    const benchmarkPath = new URL(
      "../cpu-geekbench-1k.json",
      import.meta.url
    ).pathname;
    const benchmarkData = fs.readFileSync(benchmarkPath, "utf8");
    const parsed = JSON.parse(benchmarkData);
    const scores = parsed.scores as [string, number, number][];

    const cpuList = scores.map((item) => ({
      name: item[0],
      score: item[1],
      rank: item[2],
    }));

    const Fuse = require("fuse.js");
    const fuse = new Fuse(cpuList, {
      keys: ["name"],
      threshold: 0.4,
      minMatchCharLength: 3,
    });

    const results = fuse.search(cpuName);
    if (results.length > 0) {
      const match = results[0].item;
      const score = Math.round(match.score / 100) / 10;
      const rank = match.rank;

      // Detect architecture type
      let arch = "Unknown";
      if (match.name.includes("Apple") || match.name.includes("ARM")) {
        arch = "ARM";
      } else if (match.name.includes("Intel")) {
        arch = "Intel";
      } else if (match.name.includes("AMD") || match.name.includes("Ryzen") || match.name.includes("EPYC")) {
        arch = "AMD";
      } else if (match.name.includes("Qualcomm")) {
        arch = "ARM";
      }

      const result = `Geekbench 6: ${score}k (Rank #${rank}) - ${arch}`;
      setCachedValue(context.cache, "cpu_bench_info", result);
      return result;
    }
  } catch (e) {
    // Silently fail
  }

  setCachedValue(context.cache, "cpu_bench_info", "");
  return "";
}
