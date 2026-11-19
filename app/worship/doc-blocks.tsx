import { NotedText } from "../confessions/confession-view";
export type Block = { type: "h2" | "h3" | "h4" | "p" | "note"; text: string; notes?: object };
export const slug = (index: number) => `s${index + 1}`;
export function DocBlocks({ blocks, notes }: { blocks: Block[]; notes?: object }) {
  return <div className="doc-blocks">{blocks.map((block, index) => {
    const text = <NotedText text={block.text} notes={notes} />;
    if (block.type === "h2") return <h2 key={index}>{text}</h2>;
    if (block.type === "h3") return <h3 key={index} id={block.text.match(/^(\d+)\./)?.[1] ? `p${block.text.match(/^(\d+)\./)?.[1]}` : undefined}>{text}</h3>;
    if (block.type === "h4") return <h4 key={index}>{text}</h4>;
    if (block.type === "note") return <p className="doc-note" key={index}>{text}</p>;
    return <p key={index}>{text}</p>;
  })}</div>;
}
