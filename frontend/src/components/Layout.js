import styled from "styled-components";
import { Link } from "react-router-dom";

export default function Layout({ children }) {
  return (
    <Wrapper>
      <NavBar>

        {/* ----------- 로고 영역 ----------- */}
        <Logo>
          <LogoImage src="/logo.png" alt="UMPA logo" />
          <LogoText>UMPA</LogoText>
        </Logo>

        {/* ----------- 메뉴 영역 (가운데 정렬) ----------- */}
        <MenuWrapper>
          <Menu>
            <StyledLink to="/">홈</StyledLink>
            <StyledLink to="/upload">업로드</StyledLink>
            <StyledLink to="/analyze">파일 분석</StyledLink>
            <StyledLink to="/compare">비교 분석</StyledLink>
            <StyledLink to="/live">실시간 측정</StyledLink>
          </Menu>
        </MenuWrapper>
      </NavBar>

      <Content>{children}</Content>
    </Wrapper>
  );
}

/* ===================== CSS ===================== */

const Wrapper = styled.div`
  width: 100%;
`;

const NavBar = styled.nav`
  width: 100%;
  height: 75px;
  background: #0D1B3D;   /* 남색 테마 */
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 28px;
  position: sticky;
  top: 0;
  z-index: 200;
  box-shadow: 0 2px 8px rgba(0,0,0,0.25);
`;

/* ----------- 로고(원형 이미지 + 텍스트) ----------- */

const Logo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const LogoImage = styled.img`
  width: 38px;
  height: 38px;
  border-radius: 50%;         /* 원형 형태 */
  object-fit: cover;          /* 이미지 비율 유지 */
  background-color: white;    /* 파형이 잘 보이게 */
  padding: 3px;               /* 여백 */
`;

const LogoText = styled.div`
  font-size: 22px;
  font-weight: 700;
  color: white;
  letter-spacing: 0.5px;
`;

/* ----------- 메뉴 (가운데 정렬) ----------- */

const MenuWrapper = styled.div`
  flex: 1;
  display: flex;
  justify-content: center;
`;

const Menu = styled.div`
  display: flex;
  gap: 30px;
`;

const StyledLink = styled(Link)`
  text-decoration: none;
  color: #D7D9FF;
  font-weight: 500;
  font-size: 17px;
  transition: 0.2s;

  &:hover {
    color: white;
    transform: translateY(-2px);
  }
`;

/* ----------- 메인 컨텐츠 영역 ----------- */

const Content = styled.div`
  padding: 30px;
`;
