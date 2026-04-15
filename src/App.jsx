import React, { useState, useEffect, useRef } from "react";

const R = 6371e3; // Earth radius in meters

// Math utilities
const toRad = (value) => (value * Math.PI) / 180;
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δφ = toRad(lat2 - lat1);
  const Δλ = toRad(lon2 - lon1);

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

const getOffsets = (lat1, lon1, lat2, lon2) => {
  const dy = (lat2 - lat1) * 111320;
  const dx = (lon2 - lon1) * (111320 * Math.cos(toRad(lat1)));
  return { dx, dy };
};

// ═══════════════ THEME DEFINITIONS ═══════════════
const THEMES = {
  chrome: {
    name: "Chrome",
    swatch: "linear-gradient(135deg, #a1a1aa, #d4d4d8, #71717a)",
    css: {
      "--phosphor": "#d4d4d8",
      "--phosphor-dim": "#a1a1aa",
      "--phosphor-dark": "#27272a",
      "--phosphor-glow": "rgba(212,212,216,0.15)",
      "--amber": "#fbbf24",
      "--amber-dim": "#d97706",
      "--threat": "#ef4444",
      "--threat-dim": "#b91c1c",
      "--safe": "#e4e4e7",
      "--safe-dim": "#a1a1aa",
      "--bg-deep": "#09090b",
      "--bg-panel": "#0e0e11",
      "--bg-input": "#0a0a0d",
      "--border-subtle": "rgba(161,161,170,0.1)",
      "--border-med": "rgba(161,161,170,0.18)",
      "--border-bright": "rgba(212,212,216,0.35)",
      "--text-ghost": "rgba(161,161,170,0.4)",
      "--text-dim": "rgba(161,161,170,0.7)",
      "--text-mid": "rgba(212,212,216,0.85)",
    },
    svg: {
      gridLine: "#27272a",
      ringLabel: "#52525b",
      fenceFill: "rgba(212,212,216,0.03)",
      fenceStroke: "#d4d4d8",
      centerDot: "#d4d4d8",
      fenceLabel: "#d4d4d8",
      trailDefault: "#a1a1aa",
      trailInside: "#ffffff",
      accFillDefault: "rgba(161,161,170,0.06)",
      accFillInside: "rgba(255,255,255,0.06)",
      accStrokeDefault: "#a1a1aa",
      accStrokeInside: "#ffffff",
      blipDefault: "#d4d4d8",
      blipInside: "#ffffff",
      labelDefault: "#d4d4d8",
      labelInside: "#ffffff",
      radialGrad: "rgba(212,212,216,0.03)",
      glowCenter: "rgba(212,212,216,0.04)",
      sweepA: "rgba(212,212,216,0.06)",
      sweepB: "rgba(212,212,216,0.15)",
      sweepC: "rgba(212,212,216,0.3)",
      perimInBg: "rgba(255,255,255,0.06)",
      perimInBorder: "rgba(255,255,255,0.2)",
      perimOutBg: "rgba(161,161,170,0.06)",
      perimOutBorder: "rgba(161,161,170,0.2)",
    },
  },
  phosphor: {
    name: "Phosphor",
    swatch: "linear-gradient(135deg, #003d1f, #00ff88, #00cc6a)",
    css: {
      "--phosphor": "#00ff88",
      "--phosphor-dim": "#00cc6a",
      "--phosphor-dark": "#003d1f",
      "--phosphor-glow": "rgba(0,255,136,0.15)",
      "--amber": "#ffcc33",
      "--amber-dim": "#cc8800",
      "--threat": "#ff4455",
      "--threat-dim": "#aa2233",
      "--safe": "#33eeff",
      "--safe-dim": "#0099bb",
      "--bg-deep": "#030a06",
      "--bg-panel": "#050e08",
      "--bg-input": "#020805",
      "--border-subtle": "rgba(0,255,136,0.1)",
      "--border-med": "rgba(0,255,136,0.18)",
      "--border-bright": "rgba(0,255,136,0.35)",
      "--text-ghost": "rgba(0,255,136,0.4)",
      "--text-dim": "rgba(0,255,136,0.65)",
      "--text-mid": "rgba(0,255,136,0.85)",
    },
    svg: {
      gridLine: "#003d1f",
      ringLabel: "#00663a",
      fenceFill: "rgba(0,255,136,0.03)",
      fenceStroke: "#00ff88",
      centerDot: "#00ff88",
      fenceLabel: "#00ff88",
      trailDefault: "#00ff88",
      trailInside: "#00ddff",
      accFillDefault: "rgba(0,255,136,0.08)",
      accFillInside: "rgba(0,221,255,0.08)",
      accStrokeDefault: "#00ff88",
      accStrokeInside: "#00ddff",
      blipDefault: "#fff",
      blipInside: "#00ddff",
      labelDefault: "#fff",
      labelInside: "#33eeff",
      radialGrad: "rgba(0,255,136,0.03)",
      glowCenter: "rgba(0,255,136,0.06)",
      sweepA: "rgba(0,255,136,0.08)",
      sweepB: "rgba(0,255,136,0.2)",
      sweepC: "rgba(0,255,136,0.4)",
      perimInBg: "rgba(0,221,255,0.08)",
      perimInBorder: "rgba(0,221,255,0.25)",
      perimOutBg: "rgba(255,170,0,0.06)",
      perimOutBorder: "rgba(255,170,0,0.2)",
    },
  },
  cyber: {
    name: "Cyber",
    swatch: "linear-gradient(135deg, #4a0033, #ff2d95, #bf1d6f)",
    css: {
      "--phosphor": "#ff2d95",
      "--phosphor-dim": "#bf1d6f",
      "--phosphor-dark": "#3d0025",
      "--phosphor-glow": "rgba(255,45,149,0.15)",
      "--amber": "#ffd700",
      "--amber-dim": "#cc9900",
      "--threat": "#ff3333",
      "--threat-dim": "#aa1111",
      "--safe": "#00ffff",
      "--safe-dim": "#009999",
      "--bg-deep": "#0a0411",
      "--bg-panel": "#0e0616",
      "--bg-input": "#08030d",
      "--border-subtle": "rgba(255,45,149,0.1)",
      "--border-med": "rgba(255,45,149,0.18)",
      "--border-bright": "rgba(255,45,149,0.35)",
      "--text-ghost": "rgba(255,45,149,0.4)",
      "--text-dim": "rgba(255,120,190,0.7)",
      "--text-mid": "rgba(255,160,210,0.85)",
    },
    svg: {
      gridLine: "#3d0025",
      ringLabel: "#6b1045",
      fenceFill: "rgba(255,45,149,0.03)",
      fenceStroke: "#ff2d95",
      centerDot: "#ff2d95",
      fenceLabel: "#ff2d95",
      trailDefault: "#ff2d95",
      trailInside: "#00ffff",
      accFillDefault: "rgba(255,45,149,0.08)",
      accFillInside: "rgba(0,255,255,0.08)",
      accStrokeDefault: "#ff2d95",
      accStrokeInside: "#00ffff",
      blipDefault: "#fff",
      blipInside: "#00ffff",
      labelDefault: "#fff",
      labelInside: "#66ffff",
      radialGrad: "rgba(255,45,149,0.03)",
      glowCenter: "rgba(255,45,149,0.06)",
      sweepA: "rgba(255,45,149,0.08)",
      sweepB: "rgba(255,45,149,0.2)",
      sweepC: "rgba(255,45,149,0.4)",
      perimInBg: "rgba(0,255,255,0.08)",
      perimInBorder: "rgba(0,255,255,0.25)",
      perimOutBg: "rgba(255,215,0,0.06)",
      perimOutBorder: "rgba(255,215,0,0.2)",
    },
  },
  ocean: {
    name: "Ocean",
    swatch: "linear-gradient(135deg, #0a2a3f, #06d6a0, #118ab2)",
    css: {
      "--phosphor": "#06d6a0",
      "--phosphor-dim": "#05a87e",
      "--phosphor-dark": "#023d2e",
      "--phosphor-glow": "rgba(6,214,160,0.15)",
      "--amber": "#ffd166",
      "--amber-dim": "#cc9933",
      "--threat": "#ef476f",
      "--threat-dim": "#b5214a",
      "--safe": "#118ab2",
      "--safe-dim": "#0a6680",
      "--bg-deep": "#020e14",
      "--bg-panel": "#04141d",
      "--bg-input": "#020c11",
      "--border-subtle": "rgba(6,214,160,0.1)",
      "--border-med": "rgba(6,214,160,0.18)",
      "--border-bright": "rgba(6,214,160,0.35)",
      "--text-ghost": "rgba(6,214,160,0.4)",
      "--text-dim": "rgba(6,214,160,0.65)",
      "--text-mid": "rgba(6,214,160,0.85)",
    },
    svg: {
      gridLine: "#023d2e",
      ringLabel: "#046b50",
      fenceFill: "rgba(6,214,160,0.03)",
      fenceStroke: "#06d6a0",
      centerDot: "#06d6a0",
      fenceLabel: "#06d6a0",
      trailDefault: "#06d6a0",
      trailInside: "#118ab2",
      accFillDefault: "rgba(6,214,160,0.08)",
      accFillInside: "rgba(17,138,178,0.08)",
      accStrokeDefault: "#06d6a0",
      accStrokeInside: "#118ab2",
      blipDefault: "#fff",
      blipInside: "#118ab2",
      labelDefault: "#fff",
      labelInside: "#4ab8d4",
      radialGrad: "rgba(6,214,160,0.03)",
      glowCenter: "rgba(6,214,160,0.06)",
      sweepA: "rgba(6,214,160,0.08)",
      sweepB: "rgba(6,214,160,0.2)",
      sweepC: "rgba(6,214,160,0.4)",
      perimInBg: "rgba(17,138,178,0.08)",
      perimInBorder: "rgba(17,138,178,0.25)",
      perimOutBg: "rgba(255,209,102,0.06)",
      perimOutBorder: "rgba(255,209,102,0.2)",
    },
  },
  amber: {
    name: "Amber",
    swatch: "linear-gradient(135deg, #3d2800, #ffb300, #cc8800)",
    css: {
      "--phosphor": "#ffb300",
      "--phosphor-dim": "#cc8800",
      "--phosphor-dark": "#3d2800",
      "--phosphor-glow": "rgba(255,179,0,0.15)",
      "--amber": "#ff6b35",
      "--amber-dim": "#cc4411",
      "--threat": "#ff3333",
      "--threat-dim": "#aa1111",
      "--safe": "#ffe066",
      "--safe-dim": "#ccaa33",
      "--bg-deep": "#0a0700",
      "--bg-panel": "#0e0b03",
      "--bg-input": "#080600",
      "--border-subtle": "rgba(255,179,0,0.1)",
      "--border-med": "rgba(255,179,0,0.18)",
      "--border-bright": "rgba(255,179,0,0.35)",
      "--text-ghost": "rgba(255,179,0,0.4)",
      "--text-dim": "rgba(255,200,80,0.65)",
      "--text-mid": "rgba(255,220,130,0.85)",
    },
    svg: {
      gridLine: "#3d2800",
      ringLabel: "#6b4700",
      fenceFill: "rgba(255,179,0,0.03)",
      fenceStroke: "#ffb300",
      centerDot: "#ffb300",
      fenceLabel: "#ffb300",
      trailDefault: "#ffb300",
      trailInside: "#ffe066",
      accFillDefault: "rgba(255,179,0,0.08)",
      accFillInside: "rgba(255,224,102,0.08)",
      accStrokeDefault: "#ffb300",
      accStrokeInside: "#ffe066",
      blipDefault: "#fff",
      blipInside: "#ffe066",
      labelDefault: "#fff",
      labelInside: "#fff0aa",
      radialGrad: "rgba(255,179,0,0.03)",
      glowCenter: "rgba(255,179,0,0.06)",
      sweepA: "rgba(255,179,0,0.08)",
      sweepB: "rgba(255,179,0,0.2)",
      sweepC: "rgba(255,179,0,0.4)",
      perimInBg: "rgba(255,224,102,0.08)",
      perimInBorder: "rgba(255,224,102,0.25)",
      perimOutBg: "rgba(255,107,53,0.06)",
      perimOutBorder: "rgba(255,107,53,0.2)",
    },
  },
};

const THEME_KEYS = Object.keys(THEMES);

export default function App() {
  // Theme State
  const [themeKey, setThemeKey] = useState(() => {
    try { return localStorage.getItem("radar-theme") || "chrome"; }
    catch { return "chrome"; }
  });
  const theme = THEMES[themeKey] || THEMES.chrome;
  const svg = theme.svg;

  useEffect(() => {
    const root = document.documentElement;
    Object.entries(theme.css).forEach(([prop, val]) => root.style.setProperty(prop, val));
    try { localStorage.setItem("radar-theme", themeKey); } catch {}
  }, [themeKey, theme]);

  // Configuration State
  const [fenceLat, setFenceLat] = useState("20.2961");
  const [fenceLng, setFenceLng] = useState("85.8245");
  const [geofenceRadius, setGeofenceRadius] = useState(50);
  const [radarRange, setRadarRange] = useState(200);

  // Telemetry State
  const [tracking, setTracking] = useState(false);
  const [deviceLoc, setDeviceLoc] = useState(null);
  const [trail, setTrail] = useState([]);
  const [logs, setLogs] = useState([]);

  const watchIdRef = useRef(null);
  const logsEndRef = useRef(null);

  const addLog = (msg, type = "info") => {
    const timestamp = new Date().toISOString().split("T")[1].slice(0, -1);
    setLogs((prev) => [...prev.slice(-49), { time: timestamp, msg, type }]);
  };

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  const startTracking = () => {
    const tLat = parseFloat(fenceLat);
    const tLng = parseFloat(fenceLng);

    if (isNaN(tLat) || isNaN(tLng)) {
      addLog("ERR: Invalid coordinate syntax.", "error");
      return;
    }
    if (!navigator.geolocation) {
      addLog("FATAL: Geolocation hardware missing.", "error");
      return;
    }

    setTracking(true);
    setTrail([]);
    addLog("Tracking active. Awaiting GPS lock...", "info");

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy, speed, heading } =
          position.coords;
        const distance = calculateDistance(tLat, tLng, latitude, longitude);

        const locData = {
          lat: latitude,
          lng: longitude,
          accuracy,
          distance,
          speed,
          heading,
        };

        setDeviceLoc(locData);
        setTrail((prev) => [...prev.slice(-9), locData]);

        if (accuracy > 50) {
          addLog(
            `WARN: Degraded signal. Margin: ±${Math.round(accuracy)}m`,
            "warn",
          );
        } else if (distance <= geofenceRadius) {
          addLog(
            `ALERT: Device inside fence (${Math.round(distance)}m)`,
            "success",
          );
        } else {
          addLog(`PING: Device ${Math.round(distance)}m from fence`, "info");
        }
      },
      (error) => {
        addLog(`SYS_ERR: ${error.message}`, "error");
        stopTracking();
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 },
    );
  };

  const stopTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setTracking(false);
    addLog("Tracking terminated by user.", "warn");
  };

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null)
        navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, []);

  // SVG Geometry Calculations
  const VIEWBOX_SIZE = 800;
  const CENTER = VIEWBOX_SIZE / 2;
  const scale = CENTER / radarRange;

  let deviceSvgX = CENTER;
  let deviceSvgY = CENTER;
  let accuracySvgR = 0;

  if (deviceLoc) {
    const { dx, dy } = getOffsets(
      parseFloat(fenceLat),
      parseFloat(fenceLng),
      deviceLoc.lat,
      deviceLoc.lng,
    );
    deviceSvgX = CENTER + dx * scale;
    deviceSvgY = CENTER - dy * scale;
    accuracySvgR = deviceLoc.accuracy * scale;
  }

  const isSuccess =
    deviceLoc?.distance !== null && deviceLoc?.distance <= geofenceRadius;

  // Distance percentage for bar
  const distPct = deviceLoc?.distance != null
    ? Math.min((deviceLoc.distance / radarRange) * 100, 100)
    : 0;

  const distBarColor = isSuccess ? "var(--safe)" : deviceLoc?.distance > radarRange * 0.8 ? "var(--threat)" : "var(--phosphor)";

  // Bearing calculation for telemetry
  const getBearing = () => {
    if (!deviceLoc) return null;
    const tLat = parseFloat(fenceLat);
    const tLng = parseFloat(fenceLng);
    const dLon = toRad(deviceLoc.lng - tLng);
    const y = Math.sin(dLon) * Math.cos(toRad(deviceLoc.lat));
    const x = Math.cos(toRad(tLat)) * Math.sin(toRad(deviceLoc.lat)) -
              Math.sin(toRad(tLat)) * Math.cos(toRad(deviceLoc.lat)) * Math.cos(dLon);
    let brng = Math.atan2(y, x) * (180 / Math.PI);
    return ((brng + 360) % 360).toFixed(0);
  };

  return (
    <div className="radar-shell">

      {/* ═══════════════ LEFT PANEL: CONFIG ═══════════════ */}
      <div className="panel panel-left">
        <div className="panel-header">
          <h2>Command</h2>
          <div className="status-bar">
            <span className={`status-dot ${tracking ? "active" : "standby"}`} />
            <span className="status-text" style={{ color: tracking ? "var(--phosphor)" : "var(--text-ghost)" }}>
              {tracking ? "Tracking" : "Standby"}
            </span>
          </div>
        </div>

        <div className="panel-body space-y">
          {/* Target Coords */}
          <div>
            <div className="section-label">Fence Center</div>
            <div className="space-y-sm">
              <div>
                <label className="field-label">Latitude</label>
                <input
                  type="number"
                  value={fenceLat}
                  onChange={(e) => setFenceLat(e.target.value)}
                  disabled={tracking}
                  className="field-input"
                />
              </div>
              <div>
                <label className="field-label">Longitude</label>
                <input
                  type="number"
                  value={fenceLng}
                  onChange={(e) => setFenceLng(e.target.value)}
                  disabled={tracking}
                  className="field-input"
                />
              </div>
            </div>
          </div>

          {/* Radar Params */}
          <div>
            <div className="section-label">Radar Parameters</div>
            <div className="space-y-sm">
              <div>
                <label className="field-label">Fence Radius (m)</label>
                <input
                  type="number"
                  value={geofenceRadius}
                  onChange={(e) => setGeofenceRadius(Number(e.target.value))}
                  disabled={tracking}
                  className="field-input"
                />
              </div>
              <div>
                <label className="field-label">Scope Range (m)</label>
                <input
                  type="number"
                  value={radarRange}
                  onChange={(e) => setRadarRange(Number(e.target.value))}
                  disabled={tracking}
                  className="field-input"
                />
              </div>
            </div>
          </div>

          {/* Engage Button */}
          <div className="mt-sm">
            <button
              onClick={tracking ? stopTracking : startTracking}
              className={`btn-engage ${tracking ? "disengage" : "engage"}`}
            >
              {tracking ? "Terminate" : "Initialize"}
            </button>
          </div>

          {/* Perimeter Status */}
          <div className="mt-sm">
            <div className="section-label">Perimeter</div>
            {deviceLoc ? (
              <span className="perimeter-badge" style={isSuccess
                ? { background: svg.perimInBg, border: `1px solid ${svg.perimInBorder}`, color: "var(--safe)" }
                : { background: svg.perimOutBg, border: `1px solid ${svg.perimOutBorder}`, color: "var(--amber)" }
              }>
                <span className={`status-dot ${isSuccess ? "active" : ""}`}
                  style={isSuccess
                    ? { background: "var(--safe)", boxShadow: "0 0 6px var(--safe)" }
                    : { background: "var(--amber)" }
                  }
                />
                {isSuccess ? "Device Inside" : "Device Outside"}
              </span>
            ) : (
              <span className="perimeter-badge idle">No Signal</span>
            )}
          </div>

          {/* Distance Bar */}
          {deviceLoc && (
            <div className="dist-bar-container">
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                <span className="field-label" style={{ marginBottom: 0 }}>Range</span>
                <span style={{ fontSize: "11px", color: "var(--text-dim)", letterSpacing: "1px" }}>
                  {deviceLoc.distance.toFixed(0)}m / {radarRange}m
                </span>
              </div>
              <div className="dist-bar-track">
                <div
                  className="dist-bar-fill"
                  style={{
                    width: `${distPct}%`,
                    background: distBarColor,
                    boxShadow: `0 0 6px ${distBarColor}`,
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* SYSTEM LOG — bottom of left panel */}
        <div className="log-terminal" style={{ height: "200px" }}>
          <div className="log-header">
            <span>System Log</span>
            <span>{logs.length} entries</span>
          </div>
          <div className="log-scroll">
            {logs.length === 0 && (
              <p className="log-idle">Awaiting commands…</p>
            )}
            {logs.map((log, i) => (
              <div key={i} className="log-entry">
                <span className="log-ts">[{log.time}]</span>
                <span className={`log-msg ${log.type}`}>{log.msg}</span>
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        </div>
      </div>

      {/* ═══════════════ CENTER: RADAR ═══════════════ */}
      <div className="radar-center">
        <div className="radar-glow" />

        {/* Corner HUD overlays */}
        <div className="corner-hud top-left">
          RNG {radarRange}M<br />
          SCL {(radarRange / 4).toFixed(0)}M/DIV
        </div>
        <div className="corner-hud top-right">
          FNC {geofenceRadius}M<br />
          {deviceLoc ? `DEV ${deviceLoc.distance.toFixed(0)}M` : "DEV ---"}
        </div>
        <div className="corner-hud bottom-left">
          {deviceLoc ? (
            <>
              {deviceLoc.lat.toFixed(5)}°N<br />
              {deviceLoc.lng.toFixed(5)}°E
            </>
          ) : (
            <>---.-----°N<br />---.-----°E</>
          )}
        </div>
        <div className="corner-hud bottom-right">
          {deviceLoc?.speed != null
            ? `SPD ${(deviceLoc.speed * 3.6).toFixed(1)} KPH`
            : "SPD ---"}<br />
          {deviceLoc?.heading != null
            ? `HDG ${deviceLoc.heading.toFixed(0)}°`
            : "HDG ---"}
        </div>

        {/* Cardinal labels */}
        <div className="radar-container">
          <span className="cardinal n">N</span>
          <span className="cardinal s">S</span>
          <span className="cardinal e">E</span>
          <span className="cardinal w">W</span>

          <svg
            viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`}
            style={{ width: "100%", height: "100%", position: "absolute", inset: 0 }}
          >
            <defs>
              <radialGradient id="radarBg" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor={svg.radialGrad} />
                <stop offset="100%" stopColor="transparent" />
              </radialGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Background fill */}
            <circle cx={CENTER} cy={CENTER} r={CENTER} fill="url(#radarBg)" />

            {/* Diagonal axes */}
            <line x1={CENTER} y1={CENTER} x2={CENTER + CENTER * 0.707} y2={CENTER - CENTER * 0.707}
              stroke={svg.gridLine} strokeWidth="0.5" opacity="0.3" />
            <line x1={CENTER} y1={CENTER} x2={CENTER - CENTER * 0.707} y2={CENTER - CENTER * 0.707}
              stroke={svg.gridLine} strokeWidth="0.5" opacity="0.3" />
            <line x1={CENTER} y1={CENTER} x2={CENTER + CENTER * 0.707} y2={CENTER + CENTER * 0.707}
              stroke={svg.gridLine} strokeWidth="0.5" opacity="0.3" />
            <line x1={CENTER} y1={CENTER} x2={CENTER - CENTER * 0.707} y2={CENTER + CENTER * 0.707}
              stroke={svg.gridLine} strokeWidth="0.5" opacity="0.3" />

            {/* Primary axes */}
            <line x1={CENTER} y1="0" x2={CENTER} y2={VIEWBOX_SIZE}
              stroke={svg.gridLine} strokeWidth="1" opacity="0.5" />
            <line x1="0" y1={CENTER} x2={VIEWBOX_SIZE} y2={CENTER}
              stroke={svg.gridLine} strokeWidth="1" opacity="0.5" />

            {/* Distance rings with labels */}
            {[0.25, 0.5, 0.75, 1].map((mult) => (
              <g key={mult}>
                <circle
                  cx={CENTER} cy={CENTER} r={CENTER * mult}
                  fill="none"
                  stroke={svg.gridLine}
                  strokeWidth={mult === 1 ? "1.5" : "0.8"}
                  strokeDasharray={mult === 1 ? "" : "3 6"}
                  opacity="0.5"
                />
                <text
                  x={CENTER + 6}
                  y={CENTER - CENTER * mult + 14}
                  fill={svg.ringLabel}
                  fontSize="12"
                  fontFamily="'Orbitron', monospace"
                  opacity="0.8"
                >
                  {(radarRange * mult).toFixed(0)}m
                </text>
              </g>
            ))}

            {/* Geofence boundary */}
            <circle
              cx={CENTER} cy={CENTER} r={geofenceRadius * scale}
              fill={svg.fenceFill}
              stroke={svg.fenceStroke}
              strokeWidth="1.5"
              strokeDasharray="8 5"
              opacity="0.6"
            />

            {/* Center target dot */}
            <circle cx={CENTER} cy={CENTER} r="3" fill={svg.centerDot} filter="url(#glow)" />
            <circle cx={CENTER} cy={CENTER} r="1.5" fill="#fff" />

            {/* Target label */}
            <text
              x={CENTER + 10} y={CENTER - 10}
              fill={svg.fenceLabel} fontSize="12"
              fontFamily="'Orbitron', monospace" fontWeight="600"
              opacity="0.9"
            >
              FENCE
            </text>

            {/* Tracked Device */}
            {deviceLoc && (
              <g style={{ transition: "all 1s ease-out" }}>
                {/* Trail */}
                {trail.length > 1 && (
                  <polyline
                    points={trail
                      .map((p) => {
                        const offsets = getOffsets(
                          parseFloat(fenceLat),
                          parseFloat(fenceLng),
                          p.lat,
                          p.lng,
                        );
                        return `${CENTER + offsets.dx * scale},${CENTER - offsets.dy * scale}`;
                      })
                      .join(" ")}
                    fill="none"
                    stroke={isSuccess ? svg.trailInside : svg.trailDefault}
                    strokeWidth="1.5"
                    opacity="0.4"
                    strokeLinejoin="round"
                  />
                )}

                {/* Accuracy radius */}
                <circle
                  cx={deviceSvgX} cy={deviceSvgY} r={accuracySvgR}
                  fill={isSuccess ? svg.accFillInside : svg.accFillDefault}
                  stroke={isSuccess ? svg.accStrokeInside : svg.accStrokeDefault}
                  strokeWidth="0.5"
                  opacity="0.35"
                />

                {/* Blip crosshair */}
                <line x1={deviceSvgX - 10} y1={deviceSvgY} x2={deviceSvgX - 4} y2={deviceSvgY}
                  stroke={isSuccess ? svg.blipInside : svg.blipDefault} strokeWidth="1" opacity="0.6" />
                <line x1={deviceSvgX + 4} y1={deviceSvgY} x2={deviceSvgX + 10} y2={deviceSvgY}
                  stroke={isSuccess ? svg.blipInside : svg.blipDefault} strokeWidth="1" opacity="0.6" />
                <line x1={deviceSvgX} y1={deviceSvgY - 10} x2={deviceSvgX} y2={deviceSvgY - 4}
                  stroke={isSuccess ? svg.blipInside : svg.blipDefault} strokeWidth="1" opacity="0.6" />
                <line x1={deviceSvgX} y1={deviceSvgY + 4} x2={deviceSvgX} y2={deviceSvgY + 10}
                  stroke={isSuccess ? svg.blipInside : svg.blipDefault} strokeWidth="1" opacity="0.6" />

                {/* Core blip */}
                <circle
                  cx={deviceSvgX} cy={deviceSvgY} r="4"
                  fill={isSuccess ? svg.blipInside : svg.blipDefault}
                  filter="url(#glow)"
                />

                {/* Ping animation */}
                <circle
                  cx={deviceSvgX} cy={deviceSvgY} r="4"
                  fill="none"
                  stroke={isSuccess ? svg.blipInside : svg.blipDefault}
                  strokeWidth="1"
                >
                  <animate attributeName="r" from="4" to="28" dur="2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" from="0.8" to="0" dur="2s" repeatCount="indefinite" />
                </circle>

                {/* Device label */}
                <text
                  x={deviceSvgX + 14} y={deviceSvgY - 7}
                  fill={isSuccess ? svg.labelInside : svg.labelDefault}
                  fontSize="11"
                  fontFamily="'Orbitron', monospace"
                  fontWeight="600"
                  opacity="0.9"
                >
                  DEVICE
                </text>
                <text
                  x={deviceSvgX + 14} y={deviceSvgY + 7}
                  fill={isSuccess ? svg.labelInside : svg.labelDefault}
                  fontSize="10"
                  fontFamily="'Share Tech Mono', monospace"
                  opacity="0.7"
                >
                  {deviceLoc.distance.toFixed(0)}m
                </text>
              </g>
            )}
          </svg>

          {/* Sweep animation */}
          {tracking && <div className="sweep-arm" />}
        </div>
      </div>

      {/* ═══════════════ RIGHT PANEL: TELEMETRY ═══════════════ */}
      <div className="panel panel-right">
        <div className="panel-header">
          <h2>Telemetry</h2>
          <div className="status-bar">
            <span className={`status-dot ${deviceLoc ? "active" : "standby"}`}
              style={deviceLoc ? { background: "var(--safe)", boxShadow: "0 0 6px var(--safe)" } : {}}
            />
            <span className="status-text" style={{ color: deviceLoc ? "var(--safe)" : "var(--text-ghost)" }}>
              {deviceLoc ? "Signal Lock" : "No Signal"}
            </span>
          </div>
        </div>

        <div className="panel-body space-y">
          {/* Primary Readouts */}
          <div>
            <div className="section-label">Primary</div>
            <div className="telem-grid">
              <div className="telem-cell">
                <div className="telem-label">Distance</div>
                <div className={`telem-value ${deviceLoc?.distance != null ? (isSuccess ? "alert" : "") : "na"}`}>
                  {deviceLoc?.distance != null ? `${deviceLoc.distance.toFixed(1)}` : "---"}
                </div>
                {deviceLoc?.distance != null && (
                  <span style={{ fontSize: "10px", color: "var(--text-dim)", letterSpacing: "1px" }}>METERS</span>
                )}
              </div>
              <div className="telem-cell">
                <div className="telem-label">Accuracy</div>
                <div className={`telem-value ${deviceLoc?.accuracy > 50 ? "warn" : deviceLoc?.accuracy != null ? "" : "na"}`}>
                  {deviceLoc?.accuracy != null ? `±${deviceLoc.accuracy.toFixed(1)}` : "---"}
                </div>
                {deviceLoc?.accuracy != null && (
                  <span style={{ fontSize: "10px", color: "var(--text-dim)", letterSpacing: "1px" }}>METERS</span>
                )}
              </div>
              <div className="telem-cell">
                <div className="telem-label">Speed</div>
                <div className={`telem-value ${deviceLoc ? "" : "na"}`}>
                  {deviceLoc?.speed != null ? `${(deviceLoc.speed * 3.6).toFixed(1)}` : "0.0"}
                </div>
                <span style={{ fontSize: "10px", color: "var(--text-dim)", letterSpacing: "1px" }}>KM/H</span>
              </div>
              <div className="telem-cell">
                <div className="telem-label">Heading</div>
                <div className={`telem-value ${deviceLoc?.heading != null ? "" : "na"}`}>
                  {deviceLoc?.heading != null ? `${deviceLoc.heading.toFixed(0)}°` : "---"}
                </div>
                {deviceLoc?.heading != null && (
                  <span style={{ fontSize: "10px", color: "var(--text-dim)", letterSpacing: "1px" }}>DEG</span>
                )}
              </div>
            </div>
          </div>

          {/* Bearing */}
          <div>
            <div className="section-label">Bearing from Fence</div>
            <div className="telem-cell" style={{ gridColumn: "span 2" }}>
              <div className="telem-label">Azimuth</div>
              <div className={`telem-value ${getBearing() ? "" : "na"}`}>
                {getBearing() ? `${getBearing()}°` : "---"}
              </div>
            </div>
          </div>

          {/* Device Coordinates */}
          <div>
            <div className="section-label">Device Position</div>
            <div className="coord-display">
              <div className="coord-row">
                <span className="coord-key">LAT</span>
                <span className="coord-val">
                  {deviceLoc ? deviceLoc.lat.toFixed(6) : "—"}
                </span>
              </div>
              <div className="coord-row">
                <span className="coord-key">LNG</span>
                <span className="coord-val">
                  {deviceLoc ? deviceLoc.lng.toFixed(6) : "—"}
                </span>
              </div>
            </div>
          </div>

          {/* Target Reference */}
          <div>
            <div className="section-label">Fence Center</div>
            <div className="coord-display">
              <div className="coord-row">
                <span className="coord-key">LAT</span>
                <span className="coord-val" style={{ color: "var(--text-mid)" }}>
                  {fenceLat}
                </span>
              </div>
              <div className="coord-row">
                <span className="coord-key">LNG</span>
                <span className="coord-val" style={{ color: "var(--text-mid)" }}>
                  {fenceLng}
                </span>
              </div>
              <div className="coord-row" style={{ borderTop: "1px solid var(--border-subtle)", marginTop: "4px", paddingTop: "4px" }}>
                <span className="coord-key">FENCE</span>
                <span className="coord-val" style={{ color: "var(--text-mid)" }}>
                  {geofenceRadius}m
                </span>
              </div>
            </div>
          </div>

          {/* Trail History */}
          {trail.length > 0 && (
            <div>
              <div className="section-label">Trail ({trail.length} pts)</div>
              <div style={{ maxHeight: "120px", overflowY: "auto", fontSize: "10px", color: "var(--text-dim)", lineHeight: "2" }}>
                {trail.map((t, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", opacity: 0.4 + (i / trail.length) * 0.6 }}>
                    <span>#{i + 1}</span>
                    <span>{t.lat.toFixed(5)}, {t.lng.toFixed(5)}</span>
                    <span>{t.distance.toFixed(0)}m</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── THEME PICKER ── */}
        <div className="theme-picker">
          <span className="theme-picker-label">Theme</span>
          <div className="theme-picker-swatches">
            {THEME_KEYS.map((key) => (
              <button
                key={key}
                className={`theme-swatch ${themeKey === key ? "active" : ""}`}
                style={{ background: THEMES[key].swatch }}
                onClick={() => setThemeKey(key)}
                title={THEMES[key].name}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
