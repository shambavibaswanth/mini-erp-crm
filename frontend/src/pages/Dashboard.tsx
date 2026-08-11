import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { customerApi, productApi, challanApi, Product } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";

export default function Dashboard() {
  const { user } = useAuth();
  const [counts, setCounts] = useState({ customers: 0, products: 0, draftChallans: 0, confirmedChallans: 0 });
  const [lowStock, setLowStock] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [customers, products, drafts, confirmed, low] = await Promise.all([
        customerApi.list({ page: 1, pageSize: 1 }),
        productApi.list({ page: 1, pageSize: 1 }),
        challanApi.list({ status: "DRAFT", page: 1, pageSize: 1 }),
        challanApi.list({ status: "CONFIRMED", page: 1, pageSize: 1 }),
        productApi.list({ lowStockOnly: true, page: 1, pageSize: 5 }),
      ]);
      setCounts({
        customers: customers.data.meta.total,
        products: products.data.meta.total,
        draftChallans: drafts.data.meta.total,
        confirmedChallans: confirmed.data.meta.total,
      });
      setLowStock(low.data.items);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Overview</div>
          <h1>Welcome back, {user?.name?.split(" ")[0]}</h1>
        </div>
      </div>

      {loading ? (
        <p style={{ color: "var(--color-muted)" }}>Loading…</p>
      ) : (
        <>
          <div className="stat-grid">
            <div className="card stat-card">
              <div className="stat-label">Customers</div>
              <div className="stat-value">{counts.customers}</div>
            </div>
            <div className="card stat-card">
              <div className="stat-label">Products tracked</div>
              <div className="stat-value">{counts.products}</div>
            </div>
            <div className="card stat-card">
              <div className="stat-label">Draft challans</div>
              <div className="stat-value">{counts.draftChallans}</div>
            </div>
            <div className="card stat-card">
              <div className="stat-label">Confirmed challans</div>
              <div className="stat-value">{counts.confirmedChallans}</div>
            </div>
          </div>

          <div className="section-title">Low stock alerts</div>
          <div className="card">
            {lowStock.length === 0 ? (
              <div className="empty-state">
                <h3>Nothing running low</h3>
                <p>All tracked products are above their minimum stock threshold.</p>
              </div>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>SKU</th>
                      <th>Current stock</th>
                      <th>Min alert</th>
                      <th>Location</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lowStock.map((p) => (
                      <tr key={p.id} onClick={() => (window.location.href = `/products/${p.id}`)}>
                        <td>{p.name}</td>
                        <td className="mono">{p.sku}</td>
                        <td>{p.currentStock}</td>
                        <td>{p.minStockAlert}</td>
                        <td>{p.location || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="section-title">Quick links</div>
          <div style={{ display: "flex", gap: 10 }}>
            <Link className="btn btn-secondary" to="/customers">
              View customers
            </Link>
            <Link className="btn btn-secondary" to="/products">
              View products
            </Link>
            <Link className="btn btn-secondary" to="/challans">
              View challans
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
