import styled from "styled-components";

const PageBox = styled.div`
  background: #ffffff;
  padding: 25px;
  border-radius: 14px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
  margin-top: 20px;
  transition: 0.2s;

  &:hover {
    box-shadow: 0 5px 16px rgba(0,0,0,0.12);
    transform: translateY(-3px);
  }
`;

export default PageBox;
