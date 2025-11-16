import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import GlobalStyle from "./styles/GlobalStyle";

import Home from "./pages/Home";
import Upload from "./pages/Upload";
import Analyze from "./pages/Analyze";
import Compare from "./pages/Compare";
import LivePitch from "./pages/LivePitch";

function App() {
  return (
    <BrowserRouter>
      <GlobalStyle />
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/upload" element={<Upload />} />
          <Route path="/analyze" element={<Analyze />} />
          <Route path="/compare" element={<Compare />} />
          <Route path="/live" element={<LivePitch />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
