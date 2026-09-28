// Labelled fixture: each line with a style value ends with expect:V or expect:OK.
import styled from 'styled-components';
import { css } from '@emotion/react';

const brand = '#1A3CF2'; // expect:V
const issue = '#123'; // expect:OK
const anchor = '#main'; // expect:OK
const Title = styled.h2`color: #333;`; // expect:V
const TitleOk = styled.h2`color: var(--color-text);`; // expect:OK
const boxStyles = css({ color: 'red', padding: '12px' }); // expect:V
const boxOk = css({ color: 'var(--color-text)', padding: 'var(--space-4)' }); // expect:OK

export function Button() {
  return (
    <div>
      <button style={{ color: '#ff0000' }}>A</button>{/* expect:V */}
      <button style={{ padding: 13 }}>B</button>{/* expect:V */}
      <button style={{ margin: '12px 8px' }}>C</button>{/* expect:V */}
      <button className="text-[#ff0000]">D</button>{/* expect:V */}
      <button className="p-[13px]">E</button>{/* expect:V */}
      <button className="bg-red-500">F</button>{/* expect:V */}
      <button className="rounded-[6px] text-[15px]">G</button>{/* expect:V */}
      <svg fill="#000" />{/* expect:V */}
      <button style={{ color: 'var(--color-text)' }}>H</button>{/* expect:OK */}
      <button className="text-fg bg-surface p-sm">I</button>{/* expect:OK */}
      <a href="#top">J</a>{/* expect:OK */}
      <input placeholder="#1234" aria-label="Order number" />{/* expect:OK */}
      <button style={{ opacity: 0.5, zIndex: 10, flex: 1 }}>K</button>{/* expect:OK */}
      <svg fill="currentColor" />{/* expect:OK */}
      <div className="grid-cols-[minmax(0,1fr)_280px]">L</div>{/* expect:OK */}
      <p title={`Issue ${issue} in ${anchor}`}>M</p>{/* expect:OK */}
      <Title>{brand}</Title>{/* expect:OK */}
      <div css={boxStyles} />{/* expect:OK */}
      <div css={boxOk} />{/* expect:OK */}
      <TitleOk />{/* expect:OK */}
    </div>
  );
}
