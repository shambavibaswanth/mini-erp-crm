import { FormEvent, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { productApi, Product } from "../../api/endpoints";
import { getErrorMessage } from "../../api/client";
import { LowStockChip } from "../../components/StatusChip";
import { useAuth } from "../../context/AuthContext";
import { ProductFormModal } from "./ProductFormModal";

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showEdit, setShowEdit] = useState(false);
  const [movement, setMovement] = useState({ quantity: "", movementType: "IN" as "IN" | "OUT", reason: "" });
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();
  const canManage = user?.role === "ADMIN" || user?.role === "WAREHOUSE";

  async function load() {
    if (!id) return;
    try {
      const res = await productApi.get(id);
      setProduct(res.data.product);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleMovement(e: FormEvent) {
    e.preventDefault();
    if (!id || !movement.quantity || !movement.reason) return;
    setSaving(true);
    setError(null);
    try {
      await productApi.recordMovement(id, {
        quantity: Number(movement.quantity),
        movementType: movement.movementType,
        reason: movement.reason,
      });
      setMovement({ quantity: "", movementType: "IN", reason: "" });
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (!product) return error ? <div className="banner banner-error">{error}</div> : <p style={{ color: "var(--color-muted)" }}>Loading…</p>;

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">
            <Link to="/products">Products</Link> / {product.sku}
          </div>
          <h1>{product.name}</h1>
        </div>
        {canManage && (
          <button className="btn btn-secondary" onClick={() => setShowEdit(true)}>
            Edit
          </button>
        )}
      </div>

      {error && <div className="banner banner-error">{error}</div>}

      <div className="stat-grid">
        <div className="card card-pad">
          <div className="stat-label">Current stock</div>
          <div className="stat-value">
            {product.currentStock}
            {product.currentStock <= product.minStockAlert && (
              <span style={{ marginLeft: 10, fontSize: 12 }}>
                <LowStockChip />
              </span>
            )}
          </div>
        </div>
        <div className="card card-pad">
          <div className="stat-label">Unit price</div>
          <div className="stat-value">₹{Number(product.unitPrice).toFixed(2)}</div>
        </div>
        <div className="card card-pad">
          <div className="stat-label">Min stock alert</div>
          <div className="stat-value">{product.minStockAlert}</div>
        </div>
        <div className="card card-pad">
          <div className="stat-label">Location</div>
          <div className="stat-value" style={{ fontSize: 16 }}>{product.location || "—"}</div>
        </div>
      </div>

      <div className="card card-pad">
        <p><strong>SKU:</strong> <span className="mono">{product.sku}</span></p>
        <p><strong>Category:</strong> {product.category || "—"}</p>
      </div>

      {canManage && (
        <>
          <div className="section-title">Adjust stock</div>
          <div className="card card-pad">
            <form onSubmit={handleMovement} className="form-grid" style={{ alignItems: "end" }}>
              <div className="field">
                <label>Movement type</label>
                <select value={movement.movementType} onChange={(e) => setMovement((m) => ({ ...m, movementType: e.target.value as "IN" | "OUT" }))}>
                  <option value="IN">Stock in</option>
                  <option value="OUT">Stock out</option>
                </select>
              </div>
              <div className="field">
                <label>Quantity</label>
                <input type="number" min="1" value={movement.quantity} onChange={(e) => setMovement((m) => ({ ...m, quantity: e.target.value }))} required />
              </div>
              <div className="field field-full">
                <label>Reason</label>
                <input value={movement.reason} onChange={(e) => setMovement((m) => ({ ...m, reason: e.target.value }))} placeholder="e.g. Purchase order received, damaged goods write-off…" required />
              </div>
              <div className="field">
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? "Recording…" : "Record movement"}
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      <div className="section-title">Stock movement log</div>
      <div className="card">
        {!product.stockMovements || product.stockMovements.length === 0 ? (
          <div className="empty-state">
            <h3>No movements recorded</h3>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Qty</th>
                  <th>Reason</th>
                  <th>By</th>
                </tr>
              </thead>
              <tbody>
                {product.stockMovements.map((m) => (
                  <tr key={m.id} style={{ cursor: "default" }}>
                    <td>{new Date(m.createdAt).toLocaleString()}</td>
                    <td>
                      <span className={`chip ${m.movementType === "IN" ? "chip-active" : "chip-cancelled"}`}>{m.movementType}</span>
                    </td>
                    <td>{m.quantityChanged}</td>
                    <td>{m.reason}</td>
                    <td>{m.createdBy?.name || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showEdit && (
        <ProductFormModal
          product={product}
          onClose={() => setShowEdit(false)}
          onSaved={() => {
            setShowEdit(false);
            load();
          }}
        />
      )}
    </div>
  );
}
