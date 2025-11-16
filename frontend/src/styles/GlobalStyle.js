import { createGlobalStyle } from "styled-components";

const GlobalStyle = createGlobalStyle`
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    font-family: "Pretendard", sans-serif;
  }

  body {
    background: #f4f3f8;
    color: #333;
  }

  h2 {
    font-size: 24px;
    margin-bottom: 16px;
    font-weight: 600;
    color: #3c2e80;
  }
`;

export default GlobalStyle;
