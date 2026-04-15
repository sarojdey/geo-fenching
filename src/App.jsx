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

export default function App() {
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
              <span className={`perimeter-badge ${isSuccess ? "inside" : "outside"}`}>
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
                <stop offset="0%" stopColor="rgba(0,255,136,0.03)" />
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
              stroke="#003d1f" strokeWidth="0.5" opacity="0.3" />
            <line x1={CENTER} y1={CENTER} x2={CENTER - CENTER * 0.707} y2={CENTER - CENTER * 0.707}
              stroke="#003d1f" strokeWidth="0.5" opacity="0.3" />
            <line x1={CENTER} y1={CENTER} x2={CENTER + CENTER * 0.707} y2={CENTER + CENTER * 0.707}
              stroke="#003d1f" strokeWidth="0.5" opacity="0.3" />
            <line x1={CENTER} y1={CENTER} x2={CENTER - CENTER * 0.707} y2={CENTER + CENTER * 0.707}
              stroke="#003d1f" strokeWidth="0.5" opacity="0.3" />

            {/* Primary axes */}
            <line x1={CENTER} y1="0" x2={CENTER} y2={VIEWBOX_SIZE}
              stroke="#003d1f" strokeWidth="1" opacity="0.5" />
            <line x1="0" y1={CENTER} x2={VIEWBOX_SIZE} y2={CENTER}
              stroke="#003d1f" strokeWidth="1" opacity="0.5" />

            {/* Distance rings with labels */}
            {[0.25, 0.5, 0.75, 1].map((mult) => (
              <g key={mult}>
                <circle
                  cx={CENTER} cy={CENTER} r={CENTER * mult}
                  fill="none"
                  stroke="#003d1f"
                  strokeWidth={mult === 1 ? "1.5" : "0.8"}
                  strokeDasharray={mult === 1 ? "" : "3 6"}
                  opacity="0.5"
                />
                <text
                  x={CENTER + 6}
                  y={CENTER - CENTER * mult + 14}
                  fill="#00663a"
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
              fill="rgba(0, 255, 136, 0.03)"
              stroke="#00ff88"
              strokeWidth="1.5"
              strokeDasharray="8 5"
              opacity="0.6"
            />

            {/* Center target dot */}
            <circle cx={CENTER} cy={CENTER} r="3" fill="#00ff88" filter="url(#glow)" />
            <circle cx={CENTER} cy={CENTER} r="1.5" fill="#fff" />

            {/* Target label */}
            <text
              x={CENTER + 10} y={CENTER - 10}
              fill="#00ff88" fontSize="12"
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
                    stroke={isSuccess ? "#00ddff" : "#00ff88"}
                    strokeWidth="1.5"
                    opacity="0.4"
                    strokeLinejoin="round"
                  />
                )}

                {/* Accuracy radius */}
                <circle
                  cx={deviceSvgX} cy={deviceSvgY} r={accuracySvgR}
                  fill={isSuccess ? "rgba(0, 221, 255, 0.08)" : "rgba(0, 255, 136, 0.08)"}
                  stroke={isSuccess ? "#00ddff" : "#00ff88"}
                  strokeWidth="0.5"
                  opacity="0.35"
                />

                {/* Blip crosshair */}
                <line x1={deviceSvgX - 10} y1={deviceSvgY} x2={deviceSvgX - 4} y2={deviceSvgY}
                  stroke={isSuccess ? "#00ddff" : "#fff"} strokeWidth="1" opacity="0.6" />
                <line x1={deviceSvgX + 4} y1={deviceSvgY} x2={deviceSvgX + 10} y2={deviceSvgY}
                  stroke={isSuccess ? "#00ddff" : "#fff"} strokeWidth="1" opacity="0.6" />
                <line x1={deviceSvgX} y1={deviceSvgY - 10} x2={deviceSvgX} y2={deviceSvgY - 4}
                  stroke={isSuccess ? "#00ddff" : "#fff"} strokeWidth="1" opacity="0.6" />
                <line x1={deviceSvgX} y1={deviceSvgY + 4} x2={deviceSvgX} y2={deviceSvgY + 10}
                  stroke={isSuccess ? "#00ddff" : "#fff"} strokeWidth="1" opacity="0.6" />

                {/* Core blip */}
                <circle
                  cx={deviceSvgX} cy={deviceSvgY} r="4"
                  fill={isSuccess ? "#00ddff" : "#fff"}
                  filter="url(#glow)"
                />

                {/* Ping animation */}
                <circle
                  cx={deviceSvgX} cy={deviceSvgY} r="4"
                  fill="none"
                  stroke={isSuccess ? "#00ddff" : "#fff"}
                  strokeWidth="1"
                >
                  <animate attributeName="r" from="4" to="28" dur="2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" from="0.8" to="0" dur="2s" repeatCount="indefinite" />
                </circle>

                {/* Device label */}
                <text
                  x={deviceSvgX + 14} y={deviceSvgY - 7}
                  fill={isSuccess ? "#33eeff" : "#fff"}
                  fontSize="11"
                  fontFamily="'Orbitron', monospace"
                  fontWeight="600"
                  opacity="0.9"
                >
                  DEVICE
                </text>
                <text
                  x={deviceSvgX + 14} y={deviceSvgY + 7}
                  fill={isSuccess ? "#33eeff" : "#fff"}
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
      </div>
    </div>
  );
}
