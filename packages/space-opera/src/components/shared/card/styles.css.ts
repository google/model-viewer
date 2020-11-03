import {css, CSSResult} from 'lit-element';

export const styles: CSSResult = css`
.card {
  border: 1px solid #D4D4D4;
  transition: 0.3s;
  width: 100%;
  border-radius: 5px;
  background: white;

  display: inline-flex;
  flex-grow: 1;
  margin: auto 0 10px auto;
}

.header-container {
  white-space: nowrap;
  display: flex;
  align-items: center;
  padding-bottom: 5px;
}

.header {
  margin-top: 0;
  margin-right: 5px;
  font-size: 14px;
  color: #5F5F5F;
}

.upload {
  --mdc-icon-button-size: 32px;
  margin: 0;
}

.card:hover {
  box-shadow: 0 1px 4px 3px rgba(0, 0, 0, .1);
  border: 1px solid rgba(0, 0, 0, 0);
}

.container {
  padding: 4px 4px;
  width: 100%;
}

.content-container {
  padding: 5px 10px 5px 10px;
  padding-bottom: 
}
`;