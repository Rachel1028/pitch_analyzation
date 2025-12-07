import React, { useEffect, useState, useRef, useMemo } from "react";
import { useLocation } from "react-router-dom";
import Pitchfinder from "pitchfinder";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer
} from "recharts";

// -----------------------------------------------------------
// ♻️ [재사용] LivePitch.js의 음계 변환 로직을 그대로 가져옴
// -----------------------------------------------------------
const getNoteFromFrequency = (freq) => {
    if (!freq || freq <= 0) return null;

    const A4 = 440; 
    const noteNames = [
      "C", "C#", "D", "D#", "E",
      "F", "F#", "G", "G#", "A", "A#", "B"
    ];

    // 반음 개수 계산 (A4 기준)
    const semitone = 12 * (Math.log(freq / A4) / Math.log(2));
    // A4는 MIDI 번호 69지만, 배열 인덱스로 계산하기 위해 로직 조정
    // (LivePitch 로직과 동일하게 유지)
    const noteIndex = Math.round(semitone) + 57; 

    const octave = Math.floor(noteIndex / 12);
    const noteName = noteNames[noteIndex % 12];

    return `${noteName}${octave}`;
};

export default function Analyze() {
  const { state } = useLocation();
  const file = state?.file;

  const [loading, setLoading] = useState(true);
  const [minHz, setMinHz] = useState(null);
  const [maxHz, setMaxHz] = useState(null);
  const [avgHz, setAvgHz] = useState(null);
  const [data, setData] = useState([]);
  
  const [audioContext, setAudioContext] = useState(null);
  const [audioBuffer, setAudioBuffer] = useState(null);
  const [sourceNode, setSourceNode] = useState(null);

  const [currentTime, setCurrentTime] = useState(0); 
  const [isPlaying, setIsPlaying] = useState(false);

  const requestRef = useRef(); 
  const isPlayingRef = useRef(false); 
  const cursorRef = useRef(null);

  const CHART_MARGINS = { top: 10, right: 20, bottom: 30, left: 60 };

  // -----------------------------------------------------------
  // ⚡ [실시간 계산] 현재 재생 시간(currentTime)에 맞는 음계 찾기
  // -----------------------------------------------------------
  const currentStatus = useMemo(() => {
    if (!data || data.length === 0) return { note: "--", hz: 0 };
    
    // 현재 시간보다 크거나 같은 데이터 중 가장 가까운 것 찾기
    const found = data.find(d => d.time >= currentTime);
    
    if (found && found.hz > 0) {
        return { 
            note: getNoteFromFrequency(found.hz), // 재사용 함수 호출
            hz: Math.round(found.hz) 
        };
    }
    return { note: "--", hz: 0 };
  }, [currentTime, data]);


  useEffect(() => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target.result;
        const tempContext = new (window.AudioContext || window.webkitAudioContext)();
        const originalBuffer = await tempContext.decodeAudioData(arrayBuffer);

        // --- 분석용 OfflineContext (필터링 적용) ---
        const offlineCtx = new OfflineAudioContext(1, originalBuffer.length, originalBuffer.sampleRate);
        const source = offlineCtx.createBufferSource();
        source.buffer = originalBuffer;

        const filter = offlineCtx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = 5000; 

        source.connect(filter);
        filter.connect(offlineCtx.destination);
        source.start();

        const filteredBuffer = await offlineCtx.startRendering();
        const channelData = filteredBuffer.getChannelData(0);

        // --- 메인 Context 저장 ---
        setAudioBuffer(originalBuffer); 
        setAudioContext(tempContext);

        const detectPitch = Pitchfinder.YIN({
          sampleRate: offlineCtx.sampleRate,
          threshold: 0.05,
        });

        const frameSize = 2048; 
        const rawResults = [];
        let globalMaxRms = 0;

        for (let i = 0; i < channelData.length; i += 1000) {
            const val = Math.abs(channelData[i]);
            if (val > globalMaxRms) globalMaxRms = val;
        }
        const noiseThreshold = globalMaxRms * 0.08; 

        for (let i = 0; i < channelData.length; i += frameSize) {
          const frame = channelData.slice(i, i + frameSize);
          const rms = Math.sqrt(frame.reduce((sum, val) => sum + (val * val), 0) / frame.length);
          const freq = detectPitch(frame);
          const time = parseFloat((i / offlineCtx.sampleRate).toFixed(2));

          if (freq && freq > 25 && freq < 5000) {
            rawResults.push({ time, hz: freq, rms });
          } else {
            rawResults.push({ time, hz: 0, rms });
          }
        }

        if (rawResults.length === 0) {
          alert("피치를 검출할 수 없습니다.");
          setLoading(false);
          return;
        }

        const filteredData = applySmartFilters(rawResults, noiseThreshold);
        const smoothedData = fillShortGaps(filteredData, 12); 

        // 통계
        const freqs = smoothedData.map((v) => v.hz).filter(hz => hz > 0);
        if (freqs.length > 0) {
            setMinHz(Math.min(...freqs).toFixed(1));
            setMaxHz(Math.max(...freqs).toFixed(1));
            setAvgHz((freqs.reduce((a, b) => a + b, 0) / freqs.length).toFixed(1));
        } else {
            setMinHz(0); setMaxHz(0); setAvgHz(0);
        }

        setData(smoothedData);

      } catch (err) {
        console.error("오류:", err);
      } finally {
        setLoading(false);
      }
    };
    reader.readAsArrayBuffer(file);
  }, [file]);

  const applySmartFilters = (data, threshold) => {
    let processed = data.map(d => ({ ...d }));
    processed = processed.map(p => {
      if (p.hz > 1500 && p.rms < threshold) return { ...p, hz: 0 };
      return p;
    });

    const windowSize = 100; 
    const half = Math.floor(windowSize / 2);
    
    return processed.map((item, i, arr) => {
      if (i < half || i >= arr.length - half) return item;
      if (item.hz === 0) return item;

      const windowVals = [];
      for (let j = -half; j <= half; j++) {
        if (arr[i+j].hz > 0) windowVals.push(arr[i+j].hz);
      }
      if (windowVals.length < 3) return item;

      windowVals.sort((a, b) => a - b);
      const median = windowVals[Math.floor(windowVals.length / 2)];

      if (Math.abs(item.hz - median) > median * 0.5) return { ...item, hz: median }; 
      return item;
    });
  };

  const fillShortGaps = (data, maxGapFrame) => {
    const processed = data.map(item => ({ ...item }));
    let lastValidHz = null;
    let gapIndices = [];

    for (let i = 0; i < processed.length; i++) {
      const currentHz = processed[i].hz;
      if (currentHz && currentHz > 0) {
        if (gapIndices.length > 0) {
          if (gapIndices.length <= maxGapFrame && lastValidHz !== null) {
            for (const index of gapIndices) processed[index].hz = lastValidHz;
          }
          gapIndices = [];
        }
        lastValidHz = currentHz;
      } else {
        gapIndices.push(i);
      }
    }
    return processed;
  };

  const play = () => {
    if (!audioContext || !audioBuffer) return;
    if (isPlayingRef.current) return;

    if (sourceNode) {
        try { sourceNode.stop(); sourceNode.disconnect(); } catch(e) {}
    }

    const newSource = audioContext.createBufferSource();
    newSource.buffer = audioBuffer;
    newSource.connect(audioContext.destination);
    newSource.start(0, currentTime);

    const startAt = audioContext.currentTime - currentTime;
    const duration = audioBuffer.duration;

    setIsPlaying(true);
    isPlayingRef.current = true;
    setSourceNode(newSource);

    const update = () => {
      if (!isPlayingRef.current) return;
      const now = audioContext.currentTime - startAt;

      if (now >= duration) {
        pause();
        setCurrentTime(0);
        if (cursorRef.current) cursorRef.current.style.left = "0%";
        return;
      }

      setCurrentTime(now); 
      if (cursorRef.current && duration > 0) {
        const percent = (now / duration) * 100;
        cursorRef.current.style.left = `${percent}%`;
      }
      requestRef.current = requestAnimationFrame(update);
    };
    requestRef.current = requestAnimationFrame(update);
  };

  const pause = () => {
    if (sourceNode) { try { sourceNode.stop(); } catch (e) {} }
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
    setIsPlaying(false);
    isPlayingRef.current = false;
  };

  useEffect(() => {
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (sourceNode) { try { sourceNode.stop(); } catch(e) {} }
    };
  }, []);

  const handleChartClick = (e) => {
    if (e && e.activeLabel && audioBuffer) {
        const clickedTime = parseFloat(e.activeLabel);
        pause(); 
        setCurrentTime(clickedTime);
        if (cursorRef.current && audioBuffer.duration > 0) {
            const percent = (clickedTime / audioBuffer.duration) * 100;
            cursorRef.current.style.left = `${percent}%`;
        }
    }
  };

  const chartData = useMemo(() => {
      return data.map((d) => ({ ...d, hz: d.hz <= 0 ? null : d.hz }));
  }, [data]);

  // --- [UI 렌더링] ---
  return (
    <div style={styles.container}>
      <h1 style={styles.title}>📊 File Pitch Analysis</h1>
      {file && <p style={styles.filename}>분석 파일: <b>{file.name}</b></p>}

      {loading && (
        <div style={styles.loadingBox}>
          <div className="spinner" style={styles.spinner}></div>
          <p style={styles.loadingText}>🔄 분석 중입니다… 잠시만 기다려주세요.</p>
        </div>
      )}

      {/* 분석 결과 요약 */}
      {!loading && minHz && (
        <div style={styles.infoBox}>
          <span style={{color: "#3c33eeff", marginRight:"15px"}}>최저: {minHz} Hz</span>
          <span style={{color: "#1cc41eff", marginRight:"15px"}}>평균: {avgHz} Hz</span>
          <span style={{color: "#f63918ff"}}>최고: {maxHz} Hz</span>
        </div>
      )}

      {/* ♻️ [LivePitch 스타일 적용] 현재 재생 구간의 음계/주파수 박스 */}
      {!loading && data.length > 0 && (
        <div style={styles.noteBoxWrapper}>
            <div style={styles.noteBox}>
                <p style={styles.noteLabel}>Musical Note</p>
                {/* 값이 없을 땐 -- 대신 LivePitch처럼 깔끔하게 처리 */}
                <p style={styles.noteValue}>
                    {currentStatus.note ? currentStatus.note : "--"}
                </p>
                <p style={styles.hzValue}>
                    {currentStatus.hz > 0 ? `${currentStatus.hz} Hz` : "No Signal"}
                </p>
            </div>
        </div>
      )}

      {/* 재생 컨트롤 및 그래프 */}
      {!loading && data.length > 0 && (
        <>
          <div style={{ marginBottom: "20px" }}>
            {!isPlaying ? (
              <button onClick={play} style={styles.button}>
                 {currentTime > 0 ? "▶ 이어듣기" : "▶ 재생"}
              </button>
            ) : (
              <button onClick={pause} style={styles.button}>⏸ 일시정지</button>
            )}
            <span style={{marginLeft: "15px", fontSize: "18px", fontFamily: "monospace"}}>
                ⏱ {currentTime.toFixed(2)}s
            </span>
          </div>
          
          <div style={{ position: "relative", width: "95%", height: "400px", margin: "0 auto" }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart 
                  data={chartData} 
                  onClick={handleChartClick}
                  margin={{ 
                    ...CHART_MARGINS, 
                    left: 0 
                  }}
              >
                <YAxis 
                    domain={['auto', 'auto']} 
                    tickCount={10} 
                    width={CHART_MARGINS.left} 
                />
                <XAxis dataKey="time" />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="hz" 
                  stroke="#FFD940" 
                  dot={false} 
                  connectNulls={false} 
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>

            {/* 빨간 선 (Cursor) */}
            <div style={{
                position: "absolute",
                top: CHART_MARGINS.top,
                bottom: CHART_MARGINS.bottom, 
                left: CHART_MARGINS.left, 
                right: CHART_MARGINS.right, 
                pointerEvents: "none",
            }}>
                <div 
                    ref={cursorRef}
                    style={{
                        position: "absolute",
                        left: "0%",
                        top: 0,
                        bottom: 0,
                        width: "2px",
                        backgroundColor: "red",
                        boxShadow: "0 0 5px rgba(255, 0, 0, 0.8)",
                        willChange: "left"
                    }}
                />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ♻️ LivePitch.js의 스타일을 흡수하여 작성
const styles = {
  container: {
    padding: "50px",
    textAlign: "center",
    color: "#fff",
    background: "linear-gradient(135deg, #0D1B3D, #102C5B)", // LivePitch 배경색 통일
    minHeight: "100vh",
  },
  title: { fontSize: "36px", marginBottom: "10px", fontWeight: "700" },
  filename: { fontSize: "18px", opacity: 0.9, marginBottom: "30px" },
  loadingBox: { marginTop: "60px", marginBottom: "40px" },
  spinner: {
    margin: "0 auto",
    border: "6px solid rgba(255,255,255,0.3)",
    borderTop: "6px solid #FFD940",
    borderRadius: "50%",
    width: "50px",
    height: "50px",
    animation: "spin 1s linear infinite",
  },
  loadingText: { marginTop: "15px", fontSize: "18px", opacity: 0.9 },
  
  // 기존 통계 박스 스타일 (유지)
  infoBox: {
    background: "rgba(255,255,255,0.1)",
    padding: "15px 30px",
    borderRadius: "10px",
    display: "inline-block",
    marginBottom: "20px",
    fontSize: "18px",
    fontWeight: "bold",
    backdropFilter: "blur(4px)", // 유리 효과 추가
  },

  // ♻️ LivePitch.js 스타일을 변형한 음계 박스
  noteBoxWrapper: {
    display: "flex",
    justifyContent: "center",
    marginBottom: "30px",
  },
  noteBox: {
    // LivePitch의 styles.box 속성 재사용
    width: "200px",
    padding: "20px",
    background: "rgba(255,255,255,0.1)", // 반투명
    borderRadius: "12px",
    backdropFilter: "blur(6px)", // 블러 효과
    border: "1px solid rgba(255,255,255,0.1)",
    boxShadow: "0 4px 15px rgba(0,0,0,0.2)",
    
    // 내부 정렬
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  noteLabel: {
    fontSize: "14px",
    opacity: 0.8,
    marginBottom: "5px",
    textTransform: "uppercase",
    letterSpacing: "1px"
  },
  noteValue: {
    fontSize: "42px", // 요청하신 대로 음계는 크게
    fontWeight: "800",
    color: "#FFD940", // 포인트 컬러
    lineHeight: "1.0",
    marginBottom: "5px",
    textShadow: "0 0 10px rgba(255, 217, 64, 0.4)"
  },
  hzValue: {
    fontSize: "16px", // 주파수는 작게
    opacity: 0.7,
    fontFamily: "monospace",
    fontWeight: "500"
  },

  button: {
    padding: "12px 24px",
    fontSize: "16px",
    cursor: "pointer",
    borderRadius: "8px",
    border: "none",
    backgroundColor: "#FFD940",
    color: "#0D1B3D",
    fontWeight: "bold",
    boxShadow: "0 4px 0px #d4b01e", // 버튼 입체감 추가
    transition: "transform 0.1s",
  }
};

const styleSheet = document.styleSheets[0];
try {
    styleSheet.insertRule(`
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
    `, styleSheet.cssRules.length);
} catch (e) {}