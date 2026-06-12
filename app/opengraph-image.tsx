import { ImageResponse } from "next/og";

export const alt = "Prism — AI-powered data reporting";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BARS = [88, 132, 108, 170, 148, 196, 230];

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          backgroundColor: "#09090b",
          padding: 80,
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        {/* Left: wordmark + tagline */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
            }}
          >
            <div
              style={{
                width: 20,
                height: 20,
                borderRadius: 9999,
                backgroundColor: "#6366f1",
              }}
            />
            <div
              style={{
                fontSize: 96,
                fontWeight: 700,
                color: "#fafafa",
                letterSpacing: -4,
              }}
            >
              Prism
            </div>
          </div>
          <div
            style={{
              fontSize: 32,
              color: "#a1a1aa",
              maxWidth: 560,
              lineHeight: 1.4,
            }}
          >
            Spreadsheets in. Insights, charts, and PDF reports out.
          </div>
          <div
            style={{
              fontSize: 20,
              color: "#52525b",
              display: "flex",
              gap: 12,
            }}
          >
            <span>No data stored</span>
            <span>·</span>
            <span>Processed in your browser</span>
          </div>
        </div>

        {/* Right: bar chart motif */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: 18,
            height: 280,
          }}
        >
          {BARS.map((h, i) => (
            <div
              key={i}
              style={{
                width: 44,
                height: h,
                borderRadius: 6,
                backgroundColor: i === BARS.length - 1 ? "#6366f1" : "#27272a",
              }}
            />
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}
