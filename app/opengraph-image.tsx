import { ImageResponse } from "next/og";

export const alt = "Daily Hisab – দৈনিক আয়-ব্যয় ও খরচের হিসাব";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #07194e 0%, #11298f 62%, #f97316 140%)",
          color: "white",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
          <div style={{ width: 116, height: 116, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 30, background: "white", color: "#11298f", fontSize: 70, fontWeight: 900 }}>
            ৳
          </div>
          <div style={{ marginTop: 28, fontSize: 72, fontWeight: 900, letterSpacing: -2 }}>Daily Hisab</div>
          <div style={{ marginTop: 14, fontSize: 34, color: "#dce4ff" }}>দৈনিক আয়-ব্যয়, বাজেট ও খরচের হিসাব</div>
        </div>
      </div>
    ),
    size,
  );
}
