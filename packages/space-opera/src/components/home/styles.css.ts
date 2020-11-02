import {css, CSSResult} from 'lit-element';
export const styles: CSSResult = css`
.home-card-header {
  font-size: 20px;
  color: black;
}

.home-card-content {
  font-size: 14px;
  color: #5F5F5F;
}

.lockup {
  display: flex;
  align-items: center;
  margin-bottom: 6px;
  color: rgba(0,0,0,.87);
}

.lockup .icon-file {
  margin-left: -4px;
  margin-right: 8px;
  width: 34px;
  height: 34px;
  background-size: 34px;
}

.inner-home {
  display: flex;
  align-items: center;
}

.text {
  display: inline-block;
}
`;
