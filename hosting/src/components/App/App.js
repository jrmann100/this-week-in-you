import { useState } from "react";
import classNames from "classnames";
import "./App.css";

function App() {
  const mobileMedia = window.matchMedia("(max-aspect-ratio: 3/4)");
  const [mobile, setMobile] = useState(mobileMedia.matches);
  mobileMedia.addEventListener("change", (ev) => setMobile(ev.matches));
  return (
    <div className={classNames("App", mobile && "mobile")}>
      <header>
        <div className="left">
          <h1>
            this week in <b>you</b>
          </h1>
          <h3>for aug 15 (4 days)</h3>
        </div>
        <div className="right">
          👋 hi jordan <button className="linklike">(log out)</button>
        </div>
      </header>
      <main>main</main>
    </div>
  );
}

export default App;
