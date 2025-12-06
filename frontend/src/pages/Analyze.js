import React, { useEffect, useState, useRef, useMemo } from "react";
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
  
  const [audioContext, setAudioContext] = useState(null);
  const [audioBuffer, setAudioBuffer] = useState(null);
  const [sourceNode, setSourceNode] = useState(null);

  const [currentTime, setCurrentTime] = useState(0); 
  const [isPlaying, setIsPlaying] = useState(false);

  // 재생 루프용 Ref
  const requestRef = useRef(); 
  const isPlayingRef = useRef(false); // 루프 안에서 즉시 상태 확인용
  // ⚡ [최적화] 빨간 선을 직접 조종하기 위한 리모컨(Ref)
  const cursorRef = useRef(null);

  // ⚡ [중요 1] 차트 여백을 상수로 고정합니다! (이 값이 기준이 됩니다)
  const CHART_MARGINS = {
     left: 60,  // Y축 숫자 들어갈 공간 (60px)
     right: 20, // 오른쪽 여백 (20px)
     top: 10,
     bottom: 30 // X축 글씨 들어갈 공간
  };

  useEffect(() => {
    if (!file) return;

    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target.result;
        
        // 1. 일단 오디오 디코딩 (원본 데이터)
        const tempContext = new (window.AudioContext || window.webkitAudioContext)();
        const originalBuffer = await tempContext.decodeAudioData(arrayBuffer);

        // ----------------------------------------------------------------
        // 🌪️ [핵심] 고주파 제거 필터링 (Low-Pass Filter)
        // 분석 전에 5000Hz 이상의 소리를 물리적으로 삭제해버림
        // ----------------------------------------------------------------
        
        // 오프라인 컨텍스트 생성 (소리를 내지 않고 고속으로 처리하는 전용 공간)
        const offlineCtx = new OfflineAudioContext(
          1, // 모노 채널로 변환 (분석엔 스테레오 필요 없음)
          originalBuffer.length,
          originalBuffer.sampleRate
        );

        // 소스 생성
        const source = offlineCtx.createBufferSource();
        source.buffer = originalBuffer;

        // 필터 생성 (Lowpass, 5000Hz)
        // -> 이러면 20,000Hz 잡음이 싹 사라져서 YIN 알고리즘이 헷갈리지 않음
        const filter = offlineCtx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = 5000; // 피아노 최고음(약 4186Hz)보다 살짝 높게

        // 연결: 소스 -> 필터 -> 목적지
        source.connect(filter);
        filter.connect(offlineCtx.destination);
        source.start();

        // 렌더링 시작 (필터 먹인 깨끗한 오디오 버퍼 생성)
        const filteredBuffer = await offlineCtx.startRendering();
        
        // 이제 '깨끗해진' 데이터로 분석 시작
        const channelData = filteredBuffer.getChannelData(0);

        // ----------------------------------------------------------------
        // 아래는 기존 로직과 동일 (단, audioContext는 재생용으로 따로 저장)
        // ----------------------------------------------------------------
        
        // 재생을 위한 메인 컨텍스트 저장 (필터링 된 거 말고 원본을 재생해야 듣기 좋음)
        setAudioBuffer(originalBuffer); 
        setAudioContext(tempContext);

        // Pitchfinder 설정
        const detectPitch = Pitchfinder.YIN({
          sampleRate: offlineCtx.sampleRate,
          threshold: 0.05,
        });

        const frameSize = 2048; 
        const rawResults = [];

        // 볼륨 체크용 (상대적 기준)
        let globalMaxRms = 0;
        for (let i = 0; i < channelData.length; i += 1000) {
            const val = Math.abs(channelData[i]);
            if (val > globalMaxRms) globalMaxRms = val;
        }
        const noiseThreshold = globalMaxRms * 0.08; 

        // 분석 루프
        for (let i = 0; i < channelData.length; i += frameSize) {
          const frame = channelData.slice(i, i + frameSize);
          
          const rms = Math.sqrt(frame.reduce((sum, val) => sum + (val * val), 0) / frame.length);
          const freq = detectPitch(frame);
          const time = parseFloat((i / offlineCtx.sampleRate).toFixed(2));

          // 5000 필터는 여기서도 유지 (이중 안전장치)
          if (freq && freq > 25 && freq < 5000) {
            rawResults.push({ time, hz: freq, rms });
          } else {
            // 원래 20000Hz가 찍히던 구간이 이제는 
            // 필터 덕분에 제대로 된 낮은 주파수(혹은 0)로 잡힐 것임
            rawResults.push({ time, hz: 0, rms });
          }
        }

        if (rawResults.length === 0) {
          alert("피치를 검출할 수 없습니다.");
          setLoading(false);
          return;
        }

        // 필터링 및 통계 처리 (기존과 동일)
        const filteredData = applySmartFilters(rawResults, noiseThreshold);
        const smoothedData = fillShortGaps(filteredData, 12); 

        // ... (통계 계산 로직)
        const freqs = smoothedData.map((v) => v.hz).filter(hz => hz > 0);
        if (freqs.length > 0) {
            const min = Math.min(...freqs).toFixed(1);
            const max = Math.max(...freqs).toFixed(1);
            const avg = (freqs.reduce((a, b) => a + b, 0) / freqs.length).toFixed(1);
            setMinHz(min);
            setMaxHz(max);
            setAvgHz(avg);
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

  // --- [핵심 함수 1] 스마트 필터 ---
  const applySmartFilters = (data, threshold) => {
    let processed = data.map(d => ({ ...d }));

    // 고주파 노이즈 제거
    processed = processed.map(p => {
      if (p.hz > 1500 && p.rms < threshold) return { ...p, hz: 0 };
      return p;
    });

    // 미디언 필터 (튀는 값 제거)
    const windowSize = 100; 
    const half = Math.floor(windowSize / 2);
    
    const medianFiltered = processed.map((item, i, arr) => {
      if (i < half || i >= arr.length - half) return item;
      if (item.hz === 0) return item;

      const windowVals = [];
      for (let j = -half; j <= half; j++) {
        if (arr[i+j].hz > 0) windowVals.push(arr[i+j].hz);
      }

      if (windowVals.length < 3) return item;

      windowVals.sort((a, b) => a - b);
      const median = windowVals[Math.floor(windowVals.length / 2)];

      if (Math.abs(item.hz - median) > median * 0.5) {
         return { ...item, hz: median }; 
      }
      return item;
    });

    return medianFiltered;
  };

  // --- [핵심 함수 2] 끊김 보정 ---
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

  // ============================================================
  // ▶️ 재생 로직 (Direct DOM Manipulation 적용)
  // ============================================================
  const play = () => {
    if (!audioContext || !audioBuffer) return;
    if (isPlayingRef.current) return;

    if (sourceNode) {
        try { sourceNode.stop(); } catch(e) {}
        sourceNode.disconnect();
    }

    const newSource = audioContext.createBufferSource();
    newSource.buffer = audioBuffer;
    newSource.connect(audioContext.destination);
    newSource.start(0, currentTime);

    const startAt = audioContext.currentTime - currentTime;
    const duration = audioBuffer.duration; // 전체 길이

    setIsPlaying(true);
    isPlayingRef.current = true;
    setSourceNode(newSource);

    const update = () => {
      if (!isPlayingRef.current) return;

      const now = audioContext.currentTime - startAt;

      if (now >= duration) {
        pause();
        // 끝났을 때 커서와 시간 초기화
        setCurrentTime(0);
        if (cursorRef.current) cursorRef.current.style.left = "0%";
        return;
      }

      // ⚡ [핵심] 리액트 State(setCurrentTime)를 매번 부르면 랙 걸림!
      // 그래서 텍스트용 State는 가끔 업데이트하거나, 
      // 여기서는 텍스트 업데이트도 랙의 원인이 될 수 있으므로 일단 둠.
      // (만약 텍스트도 랙 걸리면 이것도 Ref로 바꿔야 함)
      setCurrentTime(now); 

      // ⚡ [핵심] 빨간 선은 브라우저 DOM을 직접 건드려서 옮김 (리렌더링 X)
      // 전체 길이 대비 현재 진행 퍼센트 계산
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

  // 컴포넌트가 사라질 때(언마운트) 정리
  useEffect(() => {
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (sourceNode) {
        try { sourceNode.stop(); } catch(e) {}
      }
    };
  }, []); // 의존성 배열 비움

  // 차트 클릭 핸들러
  const handleChartClick = (e) => {
    if (e && e.activeLabel && audioBuffer) {
        const clickedTime = parseFloat(e.activeLabel);
        pause(); 
        setCurrentTime(clickedTime);
        
        // 클릭했을 때도 빨간 선 위치 즉시 이동
        if (cursorRef.current && audioBuffer.duration > 0) {
            const percent = (clickedTime / audioBuffer.duration) * 100;
            cursorRef.current.style.left = `${percent}%`;
        }
    }
  };

  // 0값 필터링 (기존 로직)
  const chartData = useMemo(() => {
      return data.map((d) => ({ ...d, hz: d.hz <= 0 ? null : d.hz }));
  }, [data]);

  // --- [UI 렌더링] ---
  return (
    <div style={styles.container}>
      {/* 1. 제목 및 파일명 */}
      <h1 style={styles.title}>📊 File Pitch Analysis</h1>
      {file && <p style={styles.filename}>분석 파일: <b>{file.name}</b></p>}

      {/* 2. 로딩바 */}
      {loading && (
        <div style={styles.loadingBox}>
          <div className="spinner" style={styles.spinner}></div>
          <p style={styles.loadingText}>🔄 분석 중입니다… 잠시만 기다려주세요.</p>
        </div>
      )}

      {/* 3. 분석 결과 박스 */}
      {!loading && minHz && (
        <div style={styles.infoBox}>
          <p>최저 Hz: {minHz}</p>
          <p>최고 Hz: {maxHz}</p>
          <p>평균 Hz: {avgHz}</p>
        </div>
      )}

      {/* 4. 재생 컨트롤 및 그래프 */}
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
            <span style={{marginLeft: "15px", fontSize: "18px"}}>
               ⏱ {currentTime.toFixed(2)}s
            </span>
          </div>
          
          {/* 🛑 [여기가 마법의 구간] 
            차트 위에 '투명한 막'을 씌우고 그 위에 '빨간 선'을 따로 그립니다.
          */}
          <div style={{ position: "relative", width: "95%", height: "400px", margin: "0 auto" }}>
            
            {/* 1. 차트 영역 */}
            <ResponsiveContainer width="100%" height="100%">
              {/* ⚡ [중요 2] margin을 직접 줘서 그래프가 그려질 위치를 고정합니다 */}
              <LineChart 
                  data={chartData} 
                  onClick={handleChartClick}
                  margin={{ 
                      top: CHART_MARGINS.top, 
                      right: CHART_MARGINS.right, 
                      left: 0, // Recharts는 YAxis width가 있으면 left margin을 0으로 줘도 됨 (내부에서 처리)
                      bottom: CHART_MARGINS.bottom 
                  }}
              >
                {/* ⚡ [중요 3] Y축 너비를 'left' 여백값과 똑같이 맞춥니다 */}
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

            {/* 2. 빨간 선이 움직일 '운동장' (Overlay) */}
            <div style={{
                position: "absolute",
                top: CHART_MARGINS.top,    // 차트 위 여백
                bottom: CHART_MARGINS.bottom, // 차트 아래 여백 (X축 높이만큼)
                
                // ⚡ [핵심] 여기가 마법입니다.
                // 운동장의 시작점을 Y축 너비(60px)만큼 밀어버립니다.
                left: CHART_MARGINS.left, 
                
                // 운동장의 끝점을 오른쪽 여백(20px)만큼 당겨버립니다.
                right: CHART_MARGINS.right, 
                
                pointerEvents: "none",
                // border: "1px solid cyan", // 디버깅용: 주석 풀면 운동장 크기 보임
            }}>
                {/* 3. 실제 빨간 선 */}
                <div 
                    ref={cursorRef}
                    style={{
                        position: "absolute",
                        left: "0%", // 이제 0%는 화면 끝이 아니라 '그래프 시작점'이 됩니다!
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

const styles = {
  container: {
    padding: "50px",
    textAlign: "center",
    color: "#fff",
    background: "linear-gradient(135deg, #0D1B3D, #102C5B)",
    minHeight: "100vh",
  },
  title: { fontSize: "36px", marginBottom: "10px" },
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
  infoBox: {
    background: "rgba(255,255,255,0.1)",
    padding: "20px",
    borderRadius: "10px",
    display: "inline-block",
    marginBottom: "30px",
    fontSize: "18px",
    lineHeight: "1.6",
  },
  button: {
    padding: "10px 20px",
    fontSize: "16px",
    cursor: "pointer",
    borderRadius: "5px",
    border: "none",
    backgroundColor: "#FFD940",
    color: "#0D1B3D",
    fontWeight: "bold"
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