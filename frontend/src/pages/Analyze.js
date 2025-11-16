import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import Pitchfinder from "pitchfinder";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer
} from "recharts";

export default function Analyze() {
  const { state } = useLocation();
  const file = state?.file;

  const [loading, setLoading] = useState(true);
  const [minHz, setMinHz] = useState(null);
  const [maxHz, setMaxHz] = useState(null);
  const [avgHz, setAvgHz] = useState(null);
  const [data, setData] = useState([]);

  useEffect(() => {
    if (!file) return;

    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target.result;
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        const channelData = audioBuffer.getChannelData(0);

        const detectPitch = Pitchfinder.YIN({
          sampleRate: audioContext.sampleRate,
        });

        const frameSize = 2048;
        const results = [];

        for (let i = 0; i < channelData.length; i += frameSize) {
          const frame = channelData.slice(i, i + frameSize);
          const freq = detectPitch(frame);

          if (freq) {
            results.push({
              time: (i / audioContext.sampleRate).toFixed(2),
              hz: freq,
            });
          }
        }

        if (results.length === 0) {
          alert("이 파일은 피치를 분석할 수 없습니다.");
          return;
        }

        setData(results);

        const freqs = results.map((v) => v.hz);
        setMinHz(Math.min(...freqs).toFixed(1));
        setMaxHz(Math.max(...freqs).toFixed(1));
        setAvgHz(
          (freqs.reduce((a, b) => a + b, 0) / freqs.length).toFixed(1)
        );
      } catch (err) {
        console.error("파일 분석 오류:", err);
        alert("파일 분석 중 오류가 발생했습니다.");
      } finally {
        setLoading(false); // 로딩 완료
      }
    };

    reader.readAsArrayBuffer(file);
  }, [file]);

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>📊 File Pitch Analysis</h1>

      {/* 파일명 표시 */}
      {file && (
        <p style={styles.filename}>분석 파일: <b>{file.name}</b></p>
      )}

      {/* 로딩 표시 */}
      {loading && (
        <div style={styles.loadingBox}>
          <div className="spinner" style={styles.spinner}></div>
          <p style={styles.loadingText}>🔄 분석 중입니다… 잠시만 기다려주세요.</p>
        </div>
      )}

      {/* 분석 완료 UI */}
      {!loading && minHz && (
        <div style={styles.infoBox}>
          <p>최저 Hz: {minHz}</p>
          <p>최고 Hz: {maxHz}</p>
          <p>평균 Hz: {avgHz}</p>
        </div>
      )}

      {!loading && data.length > 0 && (
        <ResponsiveContainer width="95%" height={400}>
          <LineChart data={data}>
            <Line type="monotone" dataKey="hz" stroke="#FFD940" dot={false} />
            <XAxis dataKey="time" />
            <YAxis />
            <Tooltip />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

const styles = {
  container: {
    padding: "50px",
    textAlign: "center",
    color: "#fff",
    background: "linear-gradient(135deg, #0D1B3D, #102C5B)",
    minHeight: "100vh",
  },
  title: {
    fontSize: "36px",
    marginBottom: "10px",
  },
  filename: {
    fontSize: "18px",
    opacity: 0.9,
    marginBottom: "30px",
  },
  loadingBox: {
    marginTop: "60px",
    marginBottom: "40px",
  },
  spinner: {
    margin: "0 auto",
    border: "6px solid rgba(255,255,255,0.3)",
    borderTop: "6px solid #FFD940",
    borderRadius: "50%",
    width: "50px",
    height: "50px",
    animation: "spin 1s linear infinite",
  },
  loadingText: {
    marginTop: "15px",
    fontSize: "18px",
    opacity: 0.9,
  },
  infoBox: {
    background: "rgba(255,255,255,0.1)",
    padding: "20px",
    borderRadius: "10px",
    display: "inline-block",
    marginBottom: "30px",
    fontSize: "18px",
  },
};

/* CSS animation (React inline) */
const styleSheet = document.styleSheets[0];
styleSheet.insertRule(`
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`);

