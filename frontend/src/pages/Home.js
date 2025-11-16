import styled from "styled-components";
import { useNavigate } from "react-router-dom";

export default function Home() {
  const navigate = useNavigate();

  return (
    <Container>

      {/* ---- HERO SECTION ---- */}
      <HeroSection>
        <HeroLeft>
          <HeroTitle>UMPA</HeroTitle>
          <HeroSubtitle>
            웹에서 바로 사용할 수 있는 최신 피치 분석·시각화 도구
          </HeroSubtitle>

          <HeroButton onClick={() => navigate("/live")}>
            🎤 지금 바로 실시간 피치 측정을 시작하세요!
          </HeroButton>

          {/* 🔥 업로드 페이지 이동 */}
          <HeroSubLink onClick={() => navigate("/upload")}>
            또는 오디오 파일을 업로드하여 분석하기
          </HeroSubLink>
        </HeroLeft>

        <HeroRight>
          <HeroImage src="/images/laptop.png" alt="Laptop" />
        </HeroRight>
      </HeroSection>

      {/* ---- FEATURE CARDS SECTION ---- */}
      <FeatureSection>
        <FeatureTitle>All you need to create</FeatureTitle>

        <FeatureGrid>

          <FeatureCard>
            <FeatureIcon>💻</FeatureIcon>
            <FeatureCardTitle>직관적 인터페이스</FeatureCardTitle>
            <FeatureCardText>
              전문 지식 없이도 바로 사용할 수 있도록 설계된 편리한 사용자 인터페이스
            </FeatureCardText>
          </FeatureCard>

          <FeatureCard>
            <FeatureIcon>🔄</FeatureIcon>
            <FeatureCardTitle>정확하고 안정적인 피치 분석</FeatureCardTitle>
            <FeatureCardText>
              전문 프로그램 수준의 높은 분석 정확도 제공
            </FeatureCardText>
          </FeatureCard>

          <FeatureCard>
            <FeatureIcon>🎧</FeatureIcon>
            <FeatureCardTitle>실시간 측정+시각화 제공</FeatureCardTitle>
            <FeatureCardText>
              음성/악기 입력을 즉시 파형과 피치로 시각화해 학습/교정 효과 극대화
            </FeatureCardText>
          </FeatureCard>

          <FeatureCard>
            <FeatureIcon>📊</FeatureIcon>
            <FeatureCardTitle>사용자 맞춤형 학습 환경</FeatureCardTitle>
            <FeatureCardText>
              노래 연습, 발음 교정, 발표 준비 등 사용자 목적에 맞는 개인화된 피드백 환경 제공
            </FeatureCardText>
          </FeatureCard>

        </FeatureGrid>
      </FeatureSection>

         {/* ---- 3) 새로 추가되는 영상 2카드 ---- */}
      <VideoSection>
        <VideoCard>
          <VideoBox />
          <VideoTitle>Short Video #1</VideoTitle>
          <VideoSubtitle>실시간 측정 방법</VideoSubtitle>
        </VideoCard>

        <VideoCard>
          <VideoBox />
          <VideoTitle>Short Video #2</VideoTitle>
          <VideoSubtitle>비교 분석 방법</VideoSubtitle>
        </VideoCard>
      </VideoSection>

    </Container>
  );
}

/* ---------------------------------------------------- */
/* -------------------- STYLED CSS --------------------- */
/* ---------------------------------------------------- */

const Container = styled.div`
  width: 100%;
  padding: 40px;
`;

/* ---- HERO ---- */

const HeroSection = styled.div`
  width: 100vw;
  position: relative;
  left: 50%;
  right: 50%;
  margin-left: -50vw;
  margin-right: -50vw;

  background: linear-gradient(90deg, #0D1B3D, #132E6B);
  padding: 80px 80px;
  display: flex;
  align-items: center;
  margin-bottom: 80px;

  @media (max-width: 900px) {
    padding: 40px 30px;
    flex-direction: column;
  }
`;

const HeroLeft = styled.div`
  flex: 1.2;
  color: white;

  h1 {
    font-size: 64px;
    font-weight: 700;
    margin-bottom: 25px;
    line-height: 1.1;
  }

  p {
    font-size: 22px;
    margin-bottom: 40px;
    line-height: 1.6;
  }
`;

const HeroTitle = styled.h1`
  font-size: 44px;
  font-weight: 800;
  margin-bottom: 15px;
`;

const HeroSubtitle = styled.p`
  font-size: 20px;
  opacity: 0.85;
  margin-bottom: 25px;
`;

const HeroButton = styled.button`
  background: #FFCC00;
  color: #0D1B3D;
  padding: 14px 28px;
  border-radius: 12px;
  border: none;
  font-weight: 700;
  font-size: 17px;
  cursor: pointer;
  margin-bottom: 12px;
  transition: 0.2s;

  &:hover {
    background: #FFD840;
    transform: translateY(-4px);
  }
`;

const HeroSubLink = styled.div`
  font-size: 15px;
  text-decoration: underline;
  opacity: 0.8;
  cursor: pointer;
  transition: all 0.2s ease;

  /* ⭐ 위치 변동 없음 + hover 볼록 효과 */
  &:hover {
    opacity: 1;
    transform: translateY(-3px);
    text-shadow: 0px 0px 5px rgba(255,255,255,0.6);
  }
`;


const HeroRight = styled.div`
  flex: 1;
  display: flex;
  justify-content: flex-end;
  align-items: center;

  img {
    width: 520px;
    max-width: 100%;
    object-fit: contain;
  }

  @media (max-width: 900px) {
    justify-content: center;
    margin-top: 40px;

    img {
      width: 400px;
    }
  }
`;

const HeroImage = styled.img`
  width: 420px;
  height: auto;
  object-fit: contain;
  border-radius: 10px;

  @media (max-width: 900px) {
    margin-top: 28px;
    width: 75%;
  }
`;

/* ---- FEATURES ---- */

const FeatureSection = styled.div`
  width: 100%;
  margin-top: 20px;
`;

const FeatureTitle = styled.h2`
  text-align: center;
  margin-bottom: 35px;
  font-size: 28px;
  font-weight: 700;
  color: #1f1f1f;
`;

const FeatureGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 22px;

  @media (max-width: 1100px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 700px) {
    grid-template-columns: repeat(1, 1fr);
  }
`;

const FeatureCard = styled.div`
  background: white;
  padding: 25px;
  border-radius: 16px;
  box-shadow: 0 3px 12px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: 0.15s;

  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 6px 16px rgba(0,0,0,0.12);
  }
`;

const FeatureIcon = styled.div`
  font-size: 32px;
  color: #1f4dbd;
`;

const FeatureCardTitle = styled.h3`
  font-size: 20px;
  color: #222;
  font-weight: 700;
`;

const FeatureCardText = styled.p`
  opacity: 0.8;
  font-size: 15px;
  line-height: 1.4;
`;
/* ---- VIDEO SECTION (새로 추가됨) ---- */

const VideoSection = styled.div`
  width: 100%;
  margin-top: 80px;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 30px;

  @media (max-width: 900px) {
    grid-template-columns: repeat(1, 1fr);
  }
`;

const VideoCard = styled.div`
  background: #fff;
  border-radius: 18px;
  padding: 18px;
  box-shadow: 0 3px 14px rgba(0,0,0,0.1);
  transition: 0.15s;
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 6px 18px rgba(0,0,0,0.18);
  }
`;

const VideoBox = styled.div`
  width: 100%;
  height: 260px;
  background: #d6e1ff;
  border-radius: 14px;
  margin-bottom: 18px;
`;

const VideoTitle = styled.h3`
  font-size: 20px;
  font-weight: 700;
`;

const VideoSubtitle = styled.p`
  font-size: 15px;
  opacity: 0.75;
`;