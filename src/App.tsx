import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import NavBar from "./components/NavBar";
import Gallery from "./screens/Gallery";
import Editor from "./screens/Editor";
import NotFound from "./screens/NotFound";



function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-950 text-white font-sans">
        <NavBar />
        <main>
          <AnimatePresence mode="wait">
            <Routes>
              <Route path="/" element={<Gallery />} />
              <Route path="/editor/:id" element={<Editor />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AnimatePresence>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;