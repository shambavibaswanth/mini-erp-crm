import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { challanApi, customerApi, productApi, Customer, Product } from "../../api/endpoints";
import { getErrorMessage } from "../../api/client";

interface LineItem {
  productId: string;
  quantity: string;
}

export default function ChallanForm() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [items, setItems] = useState<LineItem[]>([{ productId: "", quantity: "1" }]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<"DRAFT" | "CONFIRMED" | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function loadOptions() {
      const [c, p] = await Promise.all([
        customerApi.list({ page: 1, pageSize: 200 }),
        productApi.list({ page: 1, pageSize: 200 }),
      ]);
      setCustomers(c.data.items);
      setProducts(p.data.items);
    }
    loadOptions();
  }, []);

  function updateItem(index: number, patch: Partial<LineItem>) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }

  function addRow() {
    setItems((prev) => [...prev, { productId: "", quantity: "1" }]);
  }

  function removeRow(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function productStock(productId: string) {
    return products.find((p) => p.id === productId)?.currentStock;
  }

  async function handleSave(status: "DRAFT" | "CONFIRMED", e: FormEvent) {
    e.preventDefault();
    setError(null);

    const validItems = items
      .filter((it) => it.productId && Number(it.quantity) > 0)
      .map((it) => ({ productId: it.productId, quantity: Number(it.quantity) }));

    if (!customerId) {
      setError("Please select a customer.");
      return;
    }
    if (validItems.length === 0) {
      setError("Add at least one product line with a quantity.");
      return;
    }

    setSaving(status);
    try {
      const res = await challanApi.create({ customerId, items: validItems, status });
      navigate(`/challans/${res.data.challan.id}`);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(null);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Sales / New</div>
          <h1>New sales challan</h1>
        </div>
      </div>

      {error && <div className="banner banner-error">{error}</div>}

      <div className="card card-pad">
        <form>
          <div className="field">
            <label>Customer</label>
            <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} required>
              <option value="">Select a customer…</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.businessName ? `— ${c.businessName}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="section-title" style={{ marginTop: 20 }}>
            Line items
          </div>

          {items.map((item, index) => {
            const stock = productStock(item.productId);
            const insufficient = stock !== undefined && Number(item.quantity) > stock;
            return (
              <div key={index}>
                <div className="line-item-row">
                  <select value={item.productId} onChange={(e) => updateItem(index, { productId: e.target.value })}>
                    <option value="">Select a product…</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.sku}) — {p.currentStock} in stock
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => updateItem(index, { quantity: e.target.value })}
                  />
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => removeRow(index)} disabled={items.length === 1}>
                    ×
                  </button>
                </div>
                {insufficient && (
                  <div className="field-error" style={{ marginTop: -4, marginBottom: 8 }}>
                    Only {stock} in stock — confirming will be blocked until quantity is reduced or stock is topped up.
                  </div>
                )}
              </div>
            );
          })}

          <button type="button" className="btn btn-secondary btn-sm" onClick={addRow} style={{ marginTop: 6 }}>
            + Add product line
          </button>

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 24, borderTop: "1px solid var(--color-border)", paddingTop: 18 }}>
            <button type="button" className="btn btn-secondary" onClick={(e) => handleSave("DRAFT", e)} disabled={saving !== null}>
              {saving === "DRAFT" ? "Saving…" : "Save as draft"}
            </button>
            <button type="button" className="btn btn-primary" onClick={(e) => handleSave("CONFIRMED", e)} disabled={saving !== null}>
              {saving === "CONFIRMED" ? "Confirming…" : "Save & confirm (reduces stock)"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
