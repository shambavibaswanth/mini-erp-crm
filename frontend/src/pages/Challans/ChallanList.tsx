import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { challanApi, Challan } from "../../api/endpoints";
import { getErrorMessage } from "../../api/client";
import { StatusChip } from "../../components/StatusChip";
import { useAuth } from "../../context/AuthContext";

export default function ChallanList() {
  const [items, setItems] = useState<Challan[]>([]);
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();
  const canCreate = user?.role === "ADMIN" || user?.role === "SALES";

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await challanApi.list({ status: status || undefined, page, pageSize: 15 });
      setItems(res.data.items);
      setTotalPages(res.data.meta.totalPages);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, status]);

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Sales</div>
          <h1>Sales Challans</h1>
        </div>
        {canCreate && (
          <button className="btn btn-primary" onClick={() => navigate("/challans/new")}>
            + New challan
          </button>
        )}
      </div>

      <div className="toolbar">
        <select className="field" style={{ margin: 0 }} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {error && <div className="banner banner-error">{error}</div>}

      <div className="card">
        {loading ? (
          <div className="empty-state">Loading…</div>
        ) : items.length === 0 ? (
          <div className="empty-state">
            <h3>No challans found</h3>
            <p>Create a sales challan to get started.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Challan #</th>
                  <th>Customer</th>
                  <th>Status</th>
                  <th>Total qty</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {items.map((c) => (
                  <tr key={c.id} onClick={() => navigate(`/challans/${c.id}`)}>
                    <td className="mono">{c.challanNumber}</td>
                    <td>{c.customer?.name}</td>
                    <td>
                      <StatusChip status={c.status} />
                    </td>
                    <td>{c.totalQuantity}</td>
                    <td>{new Date(c.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </button>
          <span>
            Page {page} of {totalPages}
          </span>
          <button className="btn btn-secondary btn-sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Next
          </button>
        </div>
      )}
    </div>
  );
}
