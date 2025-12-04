import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

// 페이지를 이동해도 유지되도록 컴포넌트 밖에 저장
let savedFiles = [];

// 업로드 시 선택할 수 있는 카테고리 목록
const CATEGORY_OPTIONS = ["기본", "노래 연습", "발표 연습", "기타"];

export default function Upload() {
  // 처음 로드할 때 savedFiles를 초기값으로 사용
  const [files, setFiles] = useState(savedFiles);
  const [search, setSearch] = useState(""); // 검색어
  const [uploadCategory, setUploadCategory] = useState("기본"); // 업로드 시 선택 카테고리
  const [filterCategory, setFilterCategory] = useState("전체"); // 목록에서 필터링용 카테고리
  const [sortKey, setSortKey] = useState("time"); // 정렬 기준: 'name' | 'time'
  const [sortOrder, setSortOrder] = useState("desc"); // 'asc' | 'desc'

  const navigate = useNavigate();

  // files가 바뀔 때마다 전역 변수에도 반영 (페이지 이동 대비)
  useEffect(() => {
    savedFiles = files;
  }, [files]);

  // 파일 업로드 시 리스트에 추가 (다중 업로드)
  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files);
    const now = Date.now();

    const mapped = selected.map((file, index) => ({
      id: now + index,
      name: file.name,
      size: file.size,
      uploadedAt: Date.now(), // 실제 업로드 시각
      category: uploadCategory, // 현재 선택된 카테고리로 저장
      file,
    }));

    setFiles((prev) => [...prev, ...mapped]);
  };

  // 삭제 기능
  const handleDelete = (id) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  // 파일 하나 선택해서 분석 페이지로 이동
  const handleAnalyze = (file) => {
    navigate("/analyze", { state: { file } });
  };

  const formatSize = (size) => {
    if (size > 1024 * 1024) return (size / 1024 / 1024).toFixed(1) + " MB";
    if (size > 1024) return (size / 1024).toFixed(1) + " KB";
    return size + " B";
  };

  const formatDateTime = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  // 검색 + 카테고리 필터 + 정렬을 적용한 최종 목록
  const processedFiles = (() => {
    let result = [...files];

    // 1) 카테고리 필터
    if (filterCategory !== "전체") {
      result = result.filter((f) => f.category === filterCategory);
    }

    // 2) 검색어 필터 (파일명 기준)
    if (search.trim() !== "") {
      const lower = search.toLowerCase();
      result = result.filter((f) => f.name.toLowerCase().includes(lower));
    }

    // 3) 정렬
    result.sort((a, b) => {
      let comp = 0;

      if (sortKey === "name") {
        comp = a.name.localeCompare(b.name);
      } else if (sortKey === "time") {
        comp = a.uploadedAt - b.uploadedAt;
      }

      return sortOrder === "asc" ? comp : -comp;
    });

    return result;
  })();

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>🎧 오디오 파일 관리</h1>

      {/* 업로드 영역 */}
      <div style={styles.uploadRow}>
        <input
          type="file"
          accept="audio/*"
          multiple
          onChange={handleFileChange}
          style={styles.input}
        />

        {/* 업로드 시 카테고리 선택 */}
        <select
          value={uploadCategory}
          onChange={(e) => setUploadCategory(e.target.value)}
          style={styles.select}
        >
          {CATEGORY_OPTIONS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* 검색 + 카테고리 필터 + 정렬 옵션 */}
      <div style={styles.controlsRow}>
        {/* 검색 */}
        <input
          type="text"
          placeholder="파일명 검색"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={styles.searchInput}
        />

        {/* 카테고리 필터 */}
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          style={styles.filterSelect}
        >
          <option value="전체">전체</option>
          {CATEGORY_OPTIONS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        {/* 정렬 기준 */}
        <select
          value={`${sortKey}-${sortOrder}`}
          onChange={(e) => {
            const [key, order] = e.target.value.split("-");
            setSortKey(key);
            setSortOrder(order);
          }}
          style={styles.filterSelect}
        >
          <option value="time-desc">업로드 최신순</option>
          <option value="time-asc">업로드 오래된순</option>
          <option value="name-asc">이름 (A → Z)</option>
          <option value="name-desc">이름 (Z → A)</option>
        </select>
      </div>

      {/* 파일 목록 */}
      <div style={styles.listContainer}>
        {processedFiles.length === 0 ? (
          <p style={{ color: "#666", margin: 0 }}>
            업로드된 파일이 없거나, 필터/검색 결과가 없습니다.
          </p>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th>파일명</th>
                <th>카테고리</th>
                <th>크기</th>
                <th>업로드 시간</th>
                <th>분석</th>
                <th>삭제</th>
              </tr>
            </thead>
            <tbody>
              {processedFiles.map((f) => (
                <tr key={f.id}>
                  <td>{f.name}</td>
                  <td>{f.category}</td>
                  <td>{formatSize(f.size)}</td>
                  <td>{formatDateTime(f.uploadedAt)}</td>
                  <td>
                    <button
                      style={styles.analyzeBtn}
                      onClick={() => handleAnalyze(f.file)}
                    >
                      분석
                    </button>
                  </td>
                  <td>
                    <button
                      style={styles.deleteBtn}
                      onClick={() => handleDelete(f.id)}
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

/* 스타일 */
const styles = {
  container: {
    padding: "50px",
    textAlign: "center",
    color: "#fff",
    background: "linear-gradient(135deg, #0D1B3D, #102C5B)",
    minHeight: "100vh",
  },
  title: { fontSize: "32px", marginBottom: "30px" },
  uploadRow: {
    display: "flex",
    justifyContent: "center",
    gap: "12px",
    marginBottom: "10px",
    flexWrap: "wrap",
  },
  input: { fontSize: "14px", color: "#000" },
  select: {
    fontSize: "14px",
    padding: "6px 10px",
    borderRadius: "8px",
    border: "1px solid #ccc",
  },
  controlsRow: {
    display: "flex",
    justifyContent: "center",
    gap: "10px",
    marginBottom: "20px",
    flexWrap: "wrap",
  },
  searchInput: {
    fontSize: "14px",
    padding: "8px 12px",
    width: "220px",
    borderRadius: "8px",
    border: "1px solid #ccc",
  },
  filterSelect: {
    fontSize: "14px",
    padding: "8px 10px",
    borderRadius: "8px",
    border: "1px solid #ccc",
    minWidth: "140px",
  },
  listContainer: {
    marginTop: "10px",
    background: "#fff",
    padding: "20px",
    borderRadius: "12px",
    color: "#000",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  analyzeBtn: {
    background: "#4CAF50",
    border: "none",
    padding: "6px 12px",
    borderRadius: "6px",
    color: "white",
    cursor: "pointer",
  },
  deleteBtn: {
    background: "#FF5252",
    border: "none",
    padding: "6px 12px",
    borderRadius: "6px",
    color: "white",
    cursor: "pointer",
  },
};
