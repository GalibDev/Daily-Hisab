import { ImageResponse } from "next/og";

export const alt = "Daily Hisab — Your money, clearly managed";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", overflow: "hidden", background: "linear-gradient(125deg,#050d2b 0%,#0a1c5c 52%,#123cb1 100%)", color: "white", fontFamily: "Arial, sans-serif" }}>
      <div style={{ position: "absolute", left: -160, top: -230, width: 580, height: 580, borderRadius: 999, border: "70px solid rgba(255,255,255,.025)" }} />
      <div style={{ position: "absolute", right: -120, bottom: -230, width: 590, height: 590, borderRadius: 999, background: "rgba(19,211,255,.11)" }} />
      <div style={{ position: "absolute", left: 590, top: -180, width: 430, height: 430, borderRadius: 999, background: "rgba(249,115,22,.16)", filter: "blur(55px)" }} />

      <div style={{ width: 690, height: "100%", display: "flex", flexDirection: "column", padding: "62px 0 52px 72px", position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <div style={{ width: 66, height: 66, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 19, background: "linear-gradient(145deg,#315cff,#1234aa)", border: "1px solid rgba(255,255,255,.24)", boxShadow: "0 16px 36px rgba(0,0,0,.28)" }}>
            <div style={{ width: 37, height: 28, display: "flex", position: "relative", border: "3px solid white", borderRadius: 7 }}><div style={{ position: "absolute", right: -3, top: 7, width: 16, height: 12, border: "3px solid white", borderRadius: 5, background: "#173ab3" }} /></div>
          </div>
          <div style={{ marginLeft: 17, display: "flex", alignItems: "baseline", fontSize: 35, fontWeight: 900, letterSpacing: -1 }}><span>Daily</span><span style={{ marginLeft: 8, color: "#ff8b38" }}>hisab</span></div>
        </div>

        <div style={{ marginTop: 78, display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: 62, lineHeight: 1.04, fontWeight: 900, letterSpacing: -3 }}>Your money.</span>
          <span style={{ fontSize: 62, lineHeight: 1.04, fontWeight: 900, letterSpacing: -3, color: "#78dfff" }}>Clearly managed.</span>
          <span style={{ width: 560, marginTop: 24, fontSize: 23, lineHeight: 1.45, color: "rgba(230,237,255,.74)", fontWeight: 500 }}>Track every expense, stay on budget and make smarter financial decisions.</span>
        </div>

        <div style={{ marginTop: "auto", display: "flex", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", borderRadius: 14, padding: "12px 17px", background: "#f97316", fontSize: 16, fontWeight: 900 }}>START TRACKING FREE</div>
          <span style={{ marginLeft: 19, fontSize: 17, fontWeight: 700, color: "rgba(255,255,255,.68)" }}>dailyhisab.xyz</span>
        </div>
      </div>

      <div style={{ flex: 1, height: "100%", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
        <div style={{ position: "absolute", width: 450, height: 450, borderRadius: 999, background: "rgba(91,136,255,.18)", border: "1px solid rgba(255,255,255,.1)" }} />
        <div style={{ width: 365, height: 510, display: "flex", flexDirection: "column", position: "relative", borderRadius: 42, padding: "16px", background: "#090f25", border: "2px solid rgba(255,255,255,.24)", boxShadow: "0 38px 90px rgba(0,0,0,.42)", transform: "rotate(2deg)" }}>
          <div style={{ position: "absolute", left: 143, top: 8, width: 78, height: 19, borderRadius: 999, background: "#020617" }} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", borderRadius: 29, padding: "31px 20px 20px", background: "#f8f9ff", color: "#111936", overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center" }}><div style={{ width: 38, height: 38, borderRadius: 12, background: "#11298f" }} /><div style={{ marginLeft: 11, display: "flex", flexDirection: "column" }}><span style={{ fontSize: 14, fontWeight: 900 }}>Daily Hisab</span><span style={{ marginTop: 2, fontSize: 8, color: "#7c849b" }}>Financial overview</span></div><div style={{ marginLeft: "auto", width: 28, height: 28, borderRadius: 10, background: "#edf0fa" }} /></div>
            <div style={{ marginTop: 20, display: "flex", flexDirection: "column", borderRadius: 21, padding: "19px", color: "white", background: "linear-gradient(135deg,#102c8f,#7442f3)" }}><span style={{ fontSize: 9, color: "#d9dfff", fontWeight: 800 }}>TODAY&apos;S EXPENSE</span><span style={{ marginTop: 5, fontSize: 31, fontWeight: 900 }}>BDT 1,240</span><div style={{ marginTop: 16, display: "flex", gap: 8 }}><div style={{ width: 120, height: 39, borderRadius: 11, background: "rgba(255,255,255,.13)" }} /><div style={{ flex: 1, height: 39, borderRadius: 11, background: "rgba(255,255,255,.13)" }} /></div></div>
            <span style={{ marginTop: 19, fontSize: 12, fontWeight: 900 }}>Smart insights</span>
            <div style={{ marginTop: 9, display: "flex", gap: 8 }}><div style={{ width: 92, height: 61, borderRadius: 14, background: "#eaf8f0" }} /><div style={{ width: 92, height: 61, borderRadius: 14, background: "#fff1e8" }} /><div style={{ flex: 1, height: 61, borderRadius: 14, background: "#eaf1ff" }} /></div>
            <span style={{ marginTop: 18, fontSize: 12, fontWeight: 900 }}>This month</span>
            <div style={{ marginTop: 10, height: 72, display: "flex", alignItems: "flex-end", gap: 9 }}>{[38, 57, 44, 66, 50, 70, 58, 76].map((height, index) => <div key={index} style={{ flex: 1, height, borderRadius: 7, background: index === 7 ? "#f97316" : "#dce3fb" }} />)}</div>
          </div>
        </div>
        <div style={{ position: "absolute", left: 12, top: 104, display: "flex", flexDirection: "column", borderRadius: 18, padding: "15px 18px", background: "white", color: "#111936", boxShadow: "0 20px 45px rgba(0,0,0,.25)", transform: "rotate(-4deg)" }}><span style={{ fontSize: 10, color: "#69718a", fontWeight: 700 }}>MONTHLY SAVINGS</span><span style={{ marginTop: 4, fontSize: 22, color: "#16a34a", fontWeight: 900 }}>+18.4%</span></div>
      </div>
    </div>,
    size,
  );
}
