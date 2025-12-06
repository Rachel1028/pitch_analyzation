import React, { useEffect, useState, useRef } from "react";
import { useLocation } from "react-router-dom";
import Pitchfinder from "pitchfinder";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine
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

  // 애니메이션 루프 제어용 Ref 추가
  const requestRef = useRef(); 
  const isPlayingRef = useRef(false); // 루프 안에서 즉시 상태 확인용

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

  const play = () => {
    if (!audioContext || !audioBuffer) return;
    
    // 이미 재생 중이면 중복 실행 방지
    if (isPlayingRef.current) return;

    if (sourceNode) sourceNode.stop();

    const newSource = audioContext.createBufferSource();
    newSource.buffer = audioBuffer;
    newSource.connect(audioContext.destination);
    
    // 현재 시점부터 재생
    newSource.start(0, currentTime);

    // 재생 시작 시간 계산
    const startAt = audioContext.currentTime - currentTime;

    // 상태 동기화
    setIsPlaying(true);
    isPlayingRef.current = true; // Ref도 true로

    const update = () => {
      // 루프 안에서는 Ref를 바라봐야 멈추지 않음
      if (!isPlayingRef.current) return;

      const t = audioContext.currentTime - startAt;
      
      // 버퍼 길이 넘어가면 정지
      if (t >= audioBuffer.duration) {
        pause();
        setCurrentTime(0); // 끝나면 0초로
        return;
      }

      setCurrentTime(t);
      requestRef.current = requestAnimationFrame(update);
    };

    requestRef.current = requestAnimationFrame(update);
    setSourceNode(newSource);
  };

  const pause = () => {
    if (sourceNode) {
      try {
        sourceNode.stop();
      } catch (e) {
        // 이미 멈춘 경우 무시
      }
    }
    
    // 루프 취소
    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
    }

    setIsPlaying(false);
    isPlayingRef.current = false; // Ref false로 변경하여 루프 탈출
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

  // 차트 데이터 변환 (0 -> null)
  const chartData = data.map((d) => ({
    ...d,
    hz: d.hz <= 0 ? null : d.hz,
  }));

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
              <button onClick={play} style={styles.button}>▶ 재생</button>
            ) : (
              <button onClick={pause} style={styles.button}>⏸ 일시정지</button>
            )}
          </div>
          
          <ResponsiveContainer width="95%" height={400}>
            <LineChart 
              data={chartData}
              onClick={(e) => {
                if (e && e.activeLabel) {
                  const clickedTime = parseFloat(e.activeLabel);
                  setCurrentTime(clickedTime);
                  // 재생 중 이동 시 바로 반영을 위해
                  if (isPlaying) {
                     pause(); // 잠깐 멈췄다 다시 재생하거나, UX에 따라 결정
                     // 여기서는 간단히 멈춤 처리 (사용자가 다시 재생 누르게)
                  }
                }
              }}
            >
              <YAxis 
                  domain={['auto', 'auto']} 
                  tickCount={10} 
                  width={40}
              />
              <XAxis dataKey="time" />
              <Tooltip />
              {/* 6. 빨간 선: x값에 숫자를 그대로 넣어야 정확하게 매칭됨 */}
              <ReferenceLine 
                x={currentTime} 
                stroke="red" 
                strokeWidth={2}
                isFront={true} // 라인이 데이터보다 앞에 오게
                ifOverflow="visible" // 차트 밖으로 나가도 보이게 (안전장치)
              />
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