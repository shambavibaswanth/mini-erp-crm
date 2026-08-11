import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { productApi, Product } from "../../api/endpoints";
import { getErrorMessage } from "../../api/client";
import { LowStockChip } from "../../components/StatusChip";
import { useAuth } from "../../context/AuthContext";
import { ProductFormModal } from "./ProductFormModal";

export default function ProductList() {
  const [items, setItems] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const canManage = user?.role === "ADMIN" || user?.role === "WAREHOUSE";

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await productApi.list({ search: search || undefined, lowStockOnly, page, pageSize: 15 });
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
  }, [page, lowStockOnly]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    load();
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Inventory</div>
          <h1>Products &amp; Stock</h1>
        </div>
        {canManage && (
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            + Add product
          </button>
        )}
      </div>

      <form className="toolbar" onSubmit={handleSearchSubmit}>
        <input
          className="search-input"
          placeholder="Search by name, SKU, category…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
          <input type="checkbox" checked={lowStockOnly} onChange={(e) => { setLowStockOnly(e.target.checked); setPage(1); }} />
          Low stock only
        </label>
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
            <h3>No products found</h3>
            <p>Try a different search, or add your first product.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Category</th>
                  <th>Unit price</th>
                  <th>Stock</th>
                  <th>Location</th>
                </tr>
              </thead>
              <tbody>
                {items.map((p) => (
                  <tr key={p.id} onClick={() => navigate(`/products/${p.id}`)}>
                    <td>{p.name}</td>
                    <td className="mono">{p.sku}</td>
                    <td>{p.category || "—"}</td>
                    <td className="mono">₹{Number(p.unitPrice).toFixed(2)}</td>
                    <td>
                      {p.currentStock}
                      {p.currentStock <= p.minStockAlert && (
                        <span style={{ marginLeft: 8 }}>
                          <LowStockChip />
                        </span>
                      )}
                    </td>
                    <td>{p.location || "—"}</td>
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
        <ProductFormModal
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
