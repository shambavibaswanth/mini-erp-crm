import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { customerApi, Customer } from "../../api/endpoints";
import { getErrorMessage } from "../../api/client";
import { StatusChip } from "../../components/StatusChip";
import { useAuth } from "../../context/AuthContext";
import { CustomerFormModal } from "./CustomerFormModal";

export default function CustomerList() {
  const [items, setItems] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const canManage = user?.role === "ADMIN" || user?.role === "SALES";

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await customerApi.list({ search: search || undefined, status: status || undefined, page, pageSize: 15 });
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

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    load();
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">CRM</div>
          <h1>Customers</h1>
        </div>
        {canManage && (
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            + Add customer
          </button>
        )}
      </div>

      <form className="toolbar" onSubmit={handleSearchSubmit}>
        <input
          className="search-input"
          placeholder="Search by name, mobile, email, business, GST…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="field" style={{ margin: 0 }} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All statuses</option>
          <option value="LEAD">Lead</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
        <button className="btn btn-secondary" type="submit">
          Search
        </button>
      </form>

      {error && <div className="banner banner-error">{error}</div>}

      <div className="card">
        {loading ? (
          <div className="empty-state">Loading…</div>
        ) : items.length === 0 ? (
          <div className="empty-state">
            <h3>No customers found</h3>
            <p>Try a different search, or add your first customer.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Business</th>
                  <th>Mobile</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Follow-up</th>
                </tr>
              </thead>
              <tbody>
                {items.map((c) => (
                  <tr key={c.id} onClick={() => navigate(`/customers/${c.id}`)}>
                    <td>{c.name}</td>
                    <td>{c.businessName || "—"}</td>
                    <td className="mono">{c.mobile}</td>
                    <td>{c.customerType}</td>
                    <td>
                      <StatusChip status={c.status} />
                    </td>
                    <td>{c.followUpDate ? new Date(c.followUpDate).toLocaleDateString() : "—"}</td>
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

      {showModal && (
        <CustomerFormModal
          onClose={() => setShowModal(false)}
          onSaved={() => {
            setShowModal(false);
            load();
          }}
        />
      )}
    </div>
  );
}
