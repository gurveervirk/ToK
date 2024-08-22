import { useEffect, useState } from 'react';
import {CopyToClipboard} from 'react-copy-to-clipboard';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { gradientDark } from 'react-syntax-highlighter/dist/esm/styles/hljs';

const Code = ({ children, language }) => {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => {
      setCopied(false)
    }, 1000)
    return () => clearTimeout(timer)
  }, [copied])

  return (
    <div className="code">
      <CopyToClipboard text={children} onCopy={() => setCopied(true)}>
        <button>
          {copied ? <i className="bi bi-clipboard-check"></i> : <i className="bi bi-clipboard"></i>}
        </button>
      </CopyToClipboard>
      <SyntaxHighlighter
        language={language}
        style={gradientDark}
        customStyle={{borderRadius: '10px'}}
      >
        {children}
      </SyntaxHighlighter>
    </div>
  )
}

export default Code;