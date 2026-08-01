import { ImageResponse } from "next/og";

export const alt = "Daily Hisab — Simple money management for everyday life";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", overflow: "hidden", background: "#f6f8ff", color: "#101a3b", fontFamily: "Arial, sans-serif" }}>
      <div style={{ position: "absolute", top: -190, right: -110, width: 570, height: 570, borderRadius: 999, background: "#e9edff" }} />
      <div style={{ position: "absolute", bottom: -260, left: 350, width: 520, height: 520, borderRadius: 999, background: "#fff0e5" }} />
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", padding: "58px 72px", position: "relative" }}>
        <div style={{ width: 625, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <div style={{ width: 66, height: 66, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 18, background: "#11298f", boxShadow: "0 12px 28px rgba(17,41,143,.22)" }}>
              <div style={{ width: 36, height: 28, display: "flex", position: "relative", border: "3px solid white", borderRadius: 7 }}>
                <div style={{ position: "absolute", right: -3, top: 7, width: 16, height: 12, border: "3px solid white", borderRadius: 5, background: "#11298f" }} />
              </div>
            </div>
            <div style={{ marginLeft: 17, display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", alignItems: "baseline", fontSize: 34, fontWeight: 800, letterSpacing: -1 }}><span>Daily</span><span style={{ marginLeft: 8, color: "#f97316" }}>hisab</span></div>
              <span style={{ marginTop: 2, fontSize: 15, color: "#69718a", fontWeight: 600 }}>YOUR EVERYDAY MONEY COMPANION</span>
            </div>
          </div>

          <div style={{ marginTop: 55, display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 58, lineHeight: 1.05, fontWeight: 900, letterSpacing: -2.5 }}>Know where your</span>
            <div style={{ display: "flex", alignItems: "center", fontSize: 58, lineHeight: 1.05, fontWeight: 900, letterSpacing: -2.5 }}><span>money</span><span style={{ marginLeft: 14, color: "#f97316" }}>goes.</span></div>
            <span style={{ width: 555, marginTop: 24, fontSize: 23, lineHeight: 1.45, color: "#58627b", fontWeight: 500 }}>Track expenses, manage budgets and understand your spending—all in one secure place.</span>
          </div>

          <div style={{ marginTop: 38, display: "flex", gap: 12 }}>
            {["Expense tracking", "Smart reports", "Cloud sync"].map((label) => <div key={label} style={{ display: "flex", alignItems: "center", borderRadius: 999, padding: "10px 15px", background: "white", border: "1px solid #e1e6f3", color: "#33405f", fontSize: 15, fontWeight: 700 }}><span style={{ width: 8, height: 8, marginRight: 9, borderRadius: 999, background: label === "Cloud sync" ? "#16a34a" : "#11298f" }} />{label}</div>)}
          </div>
        </div>

        <div style={{ flex: 1, height: 510, display: "flex", alignItems: "center", justifyContent: "flex-end", position: "relative" }}>
          <div style={{ width: 375, height: 465, display: "flex", flexDirection: "column", borderRadius: 34, padding: "25px", background: "white", border: "1px solid #e0e5f2", boxShadow: "0 32px 80px rgba(29,45,105,.18)", transform: "rotate(2deg)" }}>
            <div style={{ display: "flex", alignItems: "center" }}><span style={{ fontSize: 17, fontWeight: 800 }}>Financial overview</span><div style={{ marginLeft: "auto", width: 34, height: 34, borderRadius: 12, background: "#eef2ff" }} /></div>
            <div style={{ marginTop: 23, display: "flex", flexDirection: "column", borderRadius: 23, padding: "23px", color: "white", background: "linear-gradient(135deg,#07194e,#143bb0 72%,#1688d5)" }}>
              <span style={{ fontSize: 12, color: "#cdd8ff", fontWeight: 700 }}>THIS MONTH</span>
              <span style={{ marginTop: 8, fontSize: 39, fontWeight: 900 }}>BDT 24,680</span>
              <div style={{ marginTop: 22, display: "flex", gap: 10 }}><div style={{ width: 132, height: 48, borderRadius: 13, background: "rgba(255,255,255,.12)" }} /><div style={{ flex: 1, height: 48, borderRadius: 13, background: "rgba(255,255,255,.12)" }} /></div>
            </div>
            <div style={{ marginTop: 23, display: "flex", alignItems: "flex-end", gap: 13, height: 105 }}>
              {[48, 76, 58, 94, 68, 88, 64].map((height, index) => <div key={index} style={{ flex: 1, height, borderRadius: 8, background: index === 3 ? "#f97316" : "#dfe5ff" }} />)}
            </div>
            <div style={{ marginTop: 22, display: "flex", gap: 12 }}><div style={{ width: 92, height: 58, borderRadius: 15, background: "#eef2ff" }} /><div style={{ width: 92, height: 58, borderRadius: 15, background: "#eaf9f0" }} /><div style={{ flex: 1, height: 58, borderRadius: 15, background: "#fff2e8" }} /></div>
          </div>
          <div style={{ position: "absolute", right: 330, bottom: 38, display: "flex", alignItems: "center", borderRadius: 18, padding: "14px 18px", background: "#11298f", color: "white", boxShadow: "0 18px 38px rgba(17,41,143,.28)", transform: "rotate(-3deg)" }}><span style={{ fontSize: 23, fontWeight: 900 }}>100% Free</span></div>
        </div>
      </div>
      <div style={{ position: "absolute", left: 72, bottom: 22, display: "flex", fontSize: 15, fontWeight: 800, color: "#11298f" }}>dailyhisab.xyz</div>
    </div>,
    size,
  );
}
