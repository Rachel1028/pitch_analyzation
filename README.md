# 🎵 UMPA – 웹 기반 피치 측정 및 시각화 도구
A modern web-based pitch analyzing and visualization tool

---

# 📌 프로젝트 소개
UMPA는 누구나 쉽게 접근할 수 있는 웹 기반 피치 측정 및 시각화 서비스를 목표로 하는 오픈소스 프로젝트이다.
학생, 보컬 연습자, 발표 준비자, 악기 사용자 등 일반적인 사용자들은 자신의 음성이나 소리의 음높이(피치) 를 확인하고 교정하고 싶어 하지만, 기존의 상용 프로그램들은 다음과 같은 문제점을 갖고 있다:
가격이 비싸고 전문가용 기능 중심
UI가 복잡하여 접근성이 떨어짐
무료 애플리케이션은 정확도가 낮거나 기능이 매우 단순함
실시간 분석 기능이 부족함
분석 결과에 대한 시각화가 미흡함
사용자 맞춤형 기능 부재
UMPA는 이러한 문제점을 해결하기 위해
정확한 피치 분석, 실시간 마이크 분석, 파일 기반 분석, 직관적인 시각화,
그리고 오픈소스 기반 확장성을 제공하는 웹 애플리케이션으로 기획되었다.

---

# 🎯 프로젝트 목표
UMPA의 궁극적인 목표는 다음과 같다:
✔ 누구나 쉽게 사용할 수 있는 피치 분석 도구 제공
UI는 단순·직관적으로 구성하여 비전문가도 쉽게 접근할 수 있도록 설계한다.

✔ 정확한 음높이 측정
Pitchfinder(YIN 알고리즘) 등을 활용하여 정확한 주파수(Hz)와 음계(Note)를 분석한다.

✔ 실시간 분석 + 파일 분석 모두 지원
마이크 입력을 통한 실시간 피치 분석
오디오 파일 업로드 후 분석
향후 비교 분석 및 다양한 시각화 기능으로 확장 가능

✔ 오픈소스 기반의 확장성
코드와 구조를 깔끔하게 유지하여, 누구나 기능을 추가하거나 개선할 수 있도록 한다.

----

# 🛠 주요 기능 개요
# 📍 1. 메인 홈 화면 (Home)
서비스 소개(Hero Section)
실시간 측정 시작 버튼
오디오 파일 업로드 진입 링크
직관적 Feature Cards(4개)
간단한 영상/시연 콘텐츠를 위한 2개 카드 추가 가능
# 📍 2. 실시간 피치 분석 (Live Pitch Monitoring)
마이크 입력(AudioContext)
Pitchfinder YIN 알고리즘 활용
실시간 주파수(Hz) 분석
Hz → 음계(Note) 변환 알고리즘 적용
실시간 분석 결과를 UI에 표시
# 📍 3. 오디오 파일 업로드 (Upload)
오디오 파일 선택
파일명 표시
분석 페이지로 파일 전송(navigate state 기반)
# 📍 4. 오디오 파일 분석 (Analyze)
선택된 파일 표시
분석 중 로딩 UI 제공
파일의 주파수와 음계 분석
향후 파형 시각화, FFT 분석으로 확장 가능
# 📍 5. 페이지 라우팅 지원
/ – 메인 홈
/live – 실시간 분석
/upload – 파일 업로드
/analyze – 파일 분석

---

# 📡 기술 구성 요소 (Tech Stack)
# 🎨 Frontend
React.js
Styled-components (컴포넌트 스타일링)
React Router v6 (페이지 라우팅)
# 🔊 Audio Processing
WebAudio API
Pitchfinder.js – 음높이(YIN 알고리즘) 분석
(추가 예정) Wavesurfer.js – 파형/스펙트럼 시각화
# 📦 기타 개발 도구
Node.js
VSCode
Git / GitHub

---

# 📁 프로젝트 구조
<img width="596" height="539" alt="스크린샷 2025-11-17 오후 12 37 10" src="https://github.com/user-attachments/assets/304e08ae-ebcd-472b-bf17-9d9b9724ec95" />

 
 ----

# 📜 라이선스 및 오픈소스 명시
| 라이브러리                     | 기능          | 라이선스 |
| ------------------------- | ----------- | ---- |
| **Pitchfinder.js**        | 음높이 분석(YIN) | MIT  |
| **React.js**              | UI 프레임워크    | MIT  |
| **Styled-components**     | 컴포넌트 스타일링   | MIT  |
| **Wavesurfer.js** (추가 예정) | 파형 시각화      | BSD  |


---

# 📧 문의
GitHub: Rachel1028
Email: heoyunseo72@gmail.com
