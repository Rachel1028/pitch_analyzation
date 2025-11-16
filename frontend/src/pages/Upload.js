import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Upload() {
  const [file, setFile] = useState(null);
  const navigate = useNavigate();

  const handleUpload = () => {
    if (!file) return alert("파일을 선택하세요!");
    
    // 파일을 Analyze 페이지로 전달
    navigate("/analyze", { state: { file } });
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>🎧 Upload Audio File</h1>

      <input
        type="file"
        accept="audio/*"
        onChange={(e) => setFile(e.target.files[0])}
        style={styles.input}
      />

      <button style={styles.button} onClick={handleUpload}>
        분석 시작
      </button>
    </div>
  );
}

const styles = {
  container: {
    padding: "50px",
    textAlign: "center",
    color: "#fff",
    background: "linear-gradient(135deg, #0D1B3D, #102C5B)",
    height: "100vh",
  },
  title: { fontSize: "32px", marginBottom: "40px" },
  input: { fontSize: "18px", marginBottom: "20px" },
  button: {
    padding: "15px 30px",
    fontSize: "18px",
    fontWeight: "700",
    background: "#FFCC00",
    borderRadius: "10px",
    border: "none",
    cursor: "pointer",
  },
};
