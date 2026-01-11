import { PracticeBoard } from "./Practice";
import { AppShell } from "../components/AppShell";

const analysisBackground = {
  backgroundImage: `
    radial-gradient(1200px 600px at 50% -10%, rgba(255, 255, 255, 0.03), transparent 60%),
    linear-gradient(180deg, #0b1220 0%, #0d1628 25%, #0b1220 45%, #0a0f1c 60%, #070a12 75%, #000000 92%)
  `,
  minHeight: "100vh",
  color: "#ffffff",
} as const;

export default function Analysis() {
  return (
    <AppShell backgroundStyle={analysisBackground}>
      <div className="text-white space-y-4">
        <header className="space-y-1">
          <h1 className="text-3xl font-bold">Analysis Board</h1>
          <p className="text-white/70">
            Manual study board with the Practice experience—no opponent moves. Play both sides, draw arrows, and reset as needed.
          </p>
        </header>

        <PracticeBoard embedded analysisMode />
      </div>
    </AppShell>
  );
}
