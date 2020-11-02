import {css, CSSResult} from 'lit-element';

export const styles: CSSResult = css`
.card {
  border-color: #D4D4D4;
  transition: 0.3s;
  width: 100%;
  border-radius: 5px;
  background: white;

  display: inline-flex;
  flex-grow: 1;
  margin: auto 0 10px auto;
}

.header {
  margin-top: 0;
  font-size: 14px;
  font-weight: 500;
  color: #5F5F5F;
}

.card:hover {
  box-shadow: 0 8px 16px 0 rgba(0,0,0,0.2);
}

.container {
  padding: 4px 4px;
  width: 100%;
}

.content-container {
  padding: 0 10px 5px 10px;
  padding-bottom: 
}
`;