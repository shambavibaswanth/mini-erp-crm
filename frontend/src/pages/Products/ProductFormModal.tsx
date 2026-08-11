import { FormEvent, useState } from "react";
import { productApi, Product } from "../../api/endpoints";
import { getErrorMessage } from "../../api/client";

interface Props {
  product?: Product;
  onClose: () => void;
  onSaved: () => void;
}

export function ProductFormModal({ product, onClose, onSaved }: Props) {
  const [form, setForm] = useState({
    name: product?.name || "",
    sku: product?.sku || "",
    category: product?.category || "",
    unitPrice: product ? String(product.unitPrice) : "",
    minStockAlert: product ? String(product.minStockAlert) : "0",
    location: product?.location || "",
    openingStock: "0",
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        sku: form.sku,
        category: form.category || undefined,
        unitPrice: Number(form.unitPrice),
        minStockAlert: Number(form.minStockAlert),
        location: form.location || undefined,
      };
      if (product) {
        await productApi.update(product.id, payload);
      } else {
        await productApi.create({ ...payload, openingStock: Number(form.openingStock) || 0 });
      }
      onSaved();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2 style={{ marginBottom: 16 }}>{product ? "Edit product" : "Add product"}</h2>
        {error && <div className="banner banner-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="field">
              <label>Product name</label>
              <input value={form.name} onChange={(e) => update("name", e.target.value)} required />
            </div>
            <div className="field">
              <label>SKU / code</label>
              <input value={form.sku} onChange={(e) => update("sku", e.target.value)} required disabled={!!product} />
            </div>
            <div className="field">
              <label>Category</label>
              <input value={form.category} onChange={(e) => update("category", e.target.value)} />
            </div>
            <div className="field">
              <label>Unit price</label>
              <input type="number" step="0.01" min="0" value={form.unitPrice} onChange={(e) => update("unitPrice", e.target.value)} required />
            </div>
            <div className="field">
              <label>Minimum stock alert qty</label>
              <input type="number" min="0" value={form.minStockAlert} onChange={(e) => update("minStockAlert", e.target.value)} />
            </div>
            <div className="field">
              <label>Location / warehouse</label>
              <input value={form.location} onChange={(e) => update("location", e.target.value)} />
            </div>
            {!product && (
              <div className="field">
                <label>Opening stock</label>
                <input type="number" min="0" value={form.openingStock} onChange={(e) => update("openingStock", e.target.value)} />
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 6 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Saving…" : "Save product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
