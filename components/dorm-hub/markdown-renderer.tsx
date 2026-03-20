import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkToc from 'remark-toc';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';

export function MarkdownRenderer(props: {
  content: string;
  className?: string;
  linkClassName?: string;
}) {
  const { content, className, linkClassName } = props;
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath, [remarkToc, { heading: 'toc|table[ -]of[ -]contents?' }]]}
        rehypePlugins={[rehypeRaw, rehypeKatex]}
        components={{
          a: ({ children, href }) => (
            <a href={href} target="_blank" rel="noreferrer" className={linkClassName || 'underline font-bold'}>
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

