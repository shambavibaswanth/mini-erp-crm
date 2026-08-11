import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { challanApi, Challan } from "../../api/endpoints";
import { getErrorMessage } from "../../api/client";
import { StatusChip } from "../../components/StatusChip";
import { useAuth } from "../../context/AuthContext";

export default function ChallanDetail() {
  const { id } = useParams<{ id: string }>();
  const [challan, setChallan] = useState<Challan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { user } = useAuth();
  const canManage = user?.role === "ADMIN" || user?.role === "SALES";

  async function load() {
    if (!id) return;
    try {
      const res = await challanApi.get(id);
      setChallan(res.data.challan);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleConfirm() {
    if (!id) return;
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      await challanApi.confirm(id);
      setSuccess("Challan confirmed — stock has been reduced.");
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleCancel() {
    if (!id) return;
    if (!window.confirm("Cancel this challan? If it was confirmed, stock will be reversed.")) return;
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      await challanApi.cancel(id);
      setSuccess("Challan cancelled.");
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (!challan) return error ? <div className="banner banner-error">{error}</div> : <p style={{ color: "var(--color-muted)" }}>Loading…</p>;

  const total = challan.items.reduce((sum, it) => sum + Number(it.unitPriceSnapshot || 0) * it.quantity, 0);

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">
            <Link to="/challans">Sales Challans</Link>
          </div>
          <h1>{challan.challanNumber}</h1>
        </div>
        {canManage && challan.status === "DRAFT" && (
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn btn-danger" onClick={handleCancel} disabled={busy}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleConfirm} disabled={busy}>
              {busy ? "Confirming…" : "Confirm (reduce stock)"}
            </button>
          </div>
        )}
        {canManage && challan.status === "CONFIRMED" && (
          <button className="btn btn-danger" onClick={handleCancel} disabled={busy}>
            Cancel &amp; reverse stock
          </button>
        )}
      </div>

      {error && <div className="banner banner-error">{error}</div>}
      {success && <div className="banner banner-success">{success}</div>}

      <div className="docket" style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div className="page-eyebrow">Challan number</div>
            <div className="docket-number">{challan.challanNumber}</div>
          </div>
          <StatusChip status={challan.status} />
        </div>
        <div className="form-grid" style={{ marginTop: 18 }}>
          <div>
            <div className="page-eyebrow">Customer</div>
            <div>
              <Link to={`/customers/${challan.customer.id}`}>{challan.customer.name}</Link>
              {challan.customer.businessName && ` — ${challan.customer.businessName}`}
            </div>
          </div>
          <div>
            <div className="page-eyebrow">Created</div>
            <div>
              {new Date(challan.createdAt).toLocaleString()} by {challan.createdBy?.name || "—"}
            </div>
          </div>
          {challan.confirmedAt && (
            <div>
              <div className="page-eyebrow">Confirmed</div>
              <div>{new Date(challan.confirmedAt).toLocaleString()}</div>
            </div>
          )}
          {challan.cancelledAt && (
            <div>
              <div className="page-eyebrow">Cancelled</div>
              <div>{new Date(challan.cancelledAt).toLocaleString()}</div>
            </div>
          )}
        </div>
      </div>

      <div className="section-title">Products</div>
      <div className="card">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th>Unit price</th>
                <th>Qty</th>
                <th>Line total</th>
              </tr>
            </thead>
            <tbody>
              {challan.items.map((item, i) => (
                <tr key={item.id || i} style={{ cursor: "default" }}>
                  <td>{item.productNameSnapshot}</td>
                  <td className="mono">{item.productSkuSnapshot}</td>
                  <td className="mono">₹{Number(item.unitPriceSnapshot).toFixed(2)}</td>
                  <td>{item.quantity}</td>
                  <td className="mono">₹{(Number(item.unitPriceSnapshot) * item.quantity).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3}></td>
                <td style={{ fontWeight: 700 }}>{challan.totalQuantity}</td>
                <td style={{ fontWeight: 700 }} className="mono">₹{total.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
