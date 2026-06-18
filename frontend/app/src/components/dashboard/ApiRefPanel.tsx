type Endpoint = { method: string; path: string; desc: string };

const METHOD_CLASS: Record<string, string> = {
  GET: "g",
  POST: "b",
  PUT: "am",
  DELETE: "r",
};

type Props = {
  title: string;
  endpoints: Endpoint[];
  footnote?: string;
};

export function ApiRefPanel({ title, endpoints, footnote }: Props) {
  return (
    <div className="panel">
      <div className="pnl-hd">
        <div className="pnl-title">{title}</div>
      </div>
      <div className="pnl-body">
        <table className="tbl">
          <thead>
            <tr>
              <th>Method</th>
              <th>Endpoint</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            {endpoints.map((ep) => (
              <tr key={`${ep.method}-${ep.path}`}>
                <td>
                  <span className={`tag ${METHOD_CLASS[ep.method] ?? "grey"}`}>{ep.method}</span>
                </td>
                <td className="mono">{ep.path}</td>
                <td style={{ color: "var(--t2)" }}>{ep.desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {footnote ? (
          <div className="notice g" style={{ marginTop: 14 }}>
            <span className="notice-e">🔐</span>
            <div className="notice-tx">{footnote}</div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
