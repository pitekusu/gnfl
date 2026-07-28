import { useState } from "react";
import { GameScreen } from "@/app/screens/GameScreen";
import { TitleScreen } from "@/app/screens/TitleScreen";

export type AppScreen = "title" | "game";

export function App() {
  const [screen, setScreen] = useState<AppScreen>("title");

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>GNFL</h1>
        <nav aria-label="Primary">
          <button
            type="button"
            data-active={screen === "title"}
            onClick={() => {
              setScreen("title");
            }}
          >
            Title
          </button>
          <button
            type="button"
            data-active={screen === "game"}
            onClick={() => {
              setScreen("game");
            }}
          >
            Game
          </button>
        </nav>
      </header>
      <main className="app-main">
        {screen === "title" ? (
          <TitleScreen
            onStart={() => {
              setScreen("game");
            }}
          />
        ) : (
          <GameScreen
            onTitle={() => {
              setScreen("title");
            }}
          />
        )}
      </main>
    </div>
  );
}
