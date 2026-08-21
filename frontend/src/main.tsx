import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// No React.StrictMode: its dev-only double-invoked effects are a known
// trigger for framer-motion's AnimatePresence "insertBefore" crash (hit
// during Navbar testing — see Navbar.tsx), and this app has no legacy-API
// usage StrictMode would otherwise be catching.
ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
